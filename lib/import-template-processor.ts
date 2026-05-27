import { PredikatHafalan } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getPredicate, getSikapPredicate } from "@/lib/raport-utils"
import type { CombinedTemplatePayload } from "@/lib/import-template-job"

export interface ImportTableResult {
  inserted: number
  updated: number
  errors: number
}

export interface ImportResult {
  nilaiUjian: ImportTableResult
  nilaiHafalan: ImportTableResult
  kehadiran: ImportTableResult
  penilaianSikap: ImportTableResult
  catatanSiswa: ImportTableResult
}

type StudentRecord = {
  id: number
  nis: string
  kelas?: { tingkatan?: { id: number } | null } | null
}

type ImportProcessorOptions = {
  simulationJobId?: string
}

const WRITE_CONCURRENCY = 10

function emptyResult(): ImportTableResult {
  return { inserted: 0, updated: 0, errors: 0 }
}

function normalize(value: unknown): string {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim()
}

async function settleWrites(label: string, tasks: Array<() => Promise<unknown>>, result: ImportTableResult) {
  if (tasks.length === 0) return
  const startTime = performance.now()
  for (let start = 0; start < tasks.length; start += WRITE_CONCURRENCY) {
    const batchStartTime = performance.now()
    const chunk = tasks.slice(start, start + WRITE_CONCURRENCY)
    const outcomes = await Promise.allSettled(chunk.map((task) => task()))
    const batchEndTime = performance.now()
    console.log(`[DB Latency] [${label}] Batch of size ${chunk.length} took ${(batchEndTime - batchStartTime).toFixed(2)}ms`)
    outcomes.forEach((outcome) => {
      if (outcome.status === "fulfilled") {
        result.inserted++
      } else {
        result.errors++
        console.error(`Import batch write failed for ${label}:`, outcome.reason)
      }
    })
  }
  const endTime = performance.now()
  console.log(`[DB Latency] [${label}] Total settleWrites for ${tasks.length} tasks took ${(endTime - startTime).toFixed(2)}ms`)
}

function createWriteTask(
  options: ImportProcessorOptions,
  kategori: string,
  kunci: string,
  payload: Record<string, unknown>,
  productionWrite: () => Promise<unknown>,
) {
  if (!options.simulationJobId) return productionWrite

  return () => prisma.importTemplateSimulationResult.upsert({
    where: {
      job_id_kategori_kunci: {
        job_id: options.simulationJobId!,
        kategori,
        kunci,
      },
    },
    update: { payload: payload as any },
    create: {
      job_id: options.simulationJobId!,
      kategori,
      kunci,
      payload: payload as any,
    },
  })
}

export async function processImportTemplateBatch(
  payload: CombinedTemplatePayload,
  kelasId: number,
  periodeAjaranId: number,
  options: ImportProcessorOptions = {},
): Promise<ImportResult> {
  const studentNises = Array.from(new Set(
    Object.values(payload).flatMap((items) => items.map((item: any) => normalize(item.nis))).filter(Boolean),
  ))

  const students = await prisma.siswa.findMany({
    where: {
      nis: { in: studentNises },
      kelas_id: kelasId,
      status: "Aktif",
    },
    include: { kelas: { include: { tingkatan: true } } },
  }) as StudentRecord[]
  const studentMap = new Map(students.map((student) => [student.nis, student]))

  const subjectKeys = Array.from(new Set([
    ...payload.nilaiUjian.map((item) => `${normalize(item.mataPelajaran)}|Ujian`),
    ...payload.nilaiHafalan.map((item) => `${normalize(item.mataPelajaran)}|Hafalan`),
  ].filter((value) => !value.startsWith("|"))))

  const subjects = subjectKeys.length > 0
    ? await prisma.mataPelajaran.findMany({
      where: {
        OR: subjectKeys.map((key) => {
          const [nama_mapel, jenis] = key.split("|")
          return { nama_mapel, jenis: jenis as any }
        }),
      },
    })
    : []
  const subjectMap = new Map(subjects.map((subject) => [`${subject.nama_mapel}|${subject.jenis}`, subject]))

  const levelIds = Array.from(new Set(
    students.map((student) => student.kelas?.tingkatan?.id).filter((value): value is number => value !== undefined),
  ))
  const subjectIds = subjects.map((subject) => subject.id)
  const curriculum = levelIds.length > 0 && subjectIds.length > 0
    ? await prisma.kurikulum.findMany({
      where: {
        tingkatan_id: { in: levelIds },
        mapel_id: { in: subjectIds },
      },
      include: { kitab: true },
    })
    : []
  const curriculumMap = new Map(curriculum.map((item) => [`${item.tingkatan_id}|${item.mapel_id}`, item]))

  const attendanceIndicators = await prisma.indikatorKehadiran.findMany({
    where: { nama_indikator: { in: Array.from(new Set(payload.kehadiran.map((item) => normalize(item.indikator)))) } },
  })
  const attendanceMap = new Map(attendanceIndicators.map((item) => [item.nama_indikator, item]))

  const attitudeIndicators = await prisma.indikatorSikap.findMany({
    where: { indikator: { in: Array.from(new Set(payload.penilaianSikap.map((item) => normalize(item.indikator)))) } },
  })
  const attitudeMap = new Map(attitudeIndicators.map((item) => [item.indikator, item]))

  const results: ImportResult = {
    nilaiUjian: emptyResult(),
    nilaiHafalan: emptyResult(),
    kehadiran: emptyResult(),
    penilaianSikap: emptyResult(),
    catatanSiswa: emptyResult(),
  }

  const nilaiUjianTasks: Array<() => Promise<unknown>> = []
  payload.nilaiUjian.forEach((item) => {
    const siswa = studentMap.get(normalize(item.nis))
    const mapel = subjectMap.get(`${normalize(item.mataPelajaran)}|Ujian`)
    const tingkatanId = siswa?.kelas?.tingkatan?.id
    const nilai = Number.parseFloat(String(item.nilai))
    if (!siswa || !mapel || !tingkatanId || !curriculumMap.has(`${tingkatanId}|${mapel.id}`) || Number.isNaN(nilai) || nilai < 0 || nilai > 10) {
      results.nilaiUjian.errors++
      return
    }
    const nilaiPayload = {
      siswa_id: siswa.id,
      nis: siswa.nis,
      mapel_id: mapel.id,
      periode_ajaran_id: periodeAjaranId,
      nilai_angka: nilai,
      predikat: getPredicate(nilai),
    }
    nilaiUjianTasks.push(createWriteTask(options, "nilai_ujian", `${siswa.id}:${mapel.id}:${periodeAjaranId}`, nilaiPayload, () => prisma.nilaiUjian.upsert({
      where: { siswa_id_mapel_id_periode_ajaran_id: { siswa_id: siswa.id, mapel_id: mapel.id, periode_ajaran_id: periodeAjaranId } },
      update: { nilai_angka: nilai, predikat: getPredicate(nilai) },
      create: { siswa_id: siswa.id, mapel_id: mapel.id, periode_ajaran_id: periodeAjaranId, nilai_angka: nilai, predikat: getPredicate(nilai) },
    })))
  })
  await settleWrites("nilai_ujian", nilaiUjianTasks, results.nilaiUjian)

  const nilaiHafalanTasks: Array<() => Promise<unknown>> = []
  payload.nilaiHafalan.forEach((item) => {
    const siswa = studentMap.get(normalize(item.nis))
    const mapel = subjectMap.get(`${normalize(item.mataPelajaran)}|Hafalan`)
    const tingkatanId = siswa?.kelas?.tingkatan?.id
    const kurikulum = mapel && tingkatanId ? curriculumMap.get(`${tingkatanId}|${mapel.id}`) : undefined
    const predikat = normalize(item.predikat) === "Tercapai"
      ? PredikatHafalan.TERCAPAI
      : normalize(item.predikat) === "Tidak Tercapai"
        ? PredikatHafalan.TIDAK_TERCAPAI
        : null
    if (!siswa || !mapel || !kurikulum || !predikat) {
      results.nilaiHafalan.errors++
      return
    }
    const targetHafalan = kurikulum.kitab?.nama_kitab || kurikulum.batas_hafalan || ""
    const nilaiPayload = {
      siswa_id: siswa.id,
      nis: siswa.nis,
      mapel_id: mapel.id,
      periode_ajaran_id: periodeAjaranId,
      target_hafalan: targetHafalan,
      predikat,
    }
    nilaiHafalanTasks.push(createWriteTask(options, "nilai_hafalan", `${siswa.id}:${mapel.id}:${periodeAjaranId}`, nilaiPayload, () => prisma.nilaiHafalan.upsert({
      where: { siswa_id_mapel_id_periode_ajaran_id: { siswa_id: siswa.id, mapel_id: mapel.id, periode_ajaran_id: periodeAjaranId } },
      update: { target_hafalan: targetHafalan, predikat },
      create: { siswa_id: siswa.id, mapel_id: mapel.id, periode_ajaran_id: periodeAjaranId, target_hafalan: targetHafalan, predikat },
    })))
  })
  await settleWrites("nilai_hafalan", nilaiHafalanTasks, results.nilaiHafalan)

  const kehadiranTasks: Array<() => Promise<unknown>> = []
  payload.kehadiran.forEach((item) => {
    const siswa = studentMap.get(normalize(item.nis))
    const indikator = attendanceMap.get(normalize(item.indikator))
    const sakit = Number.parseInt(String(item.sakit ?? 0), 10)
    const izin = Number.parseInt(String(item.izin ?? 0), 10)
    const alpha = Number.parseInt(String(item.alpha ?? 0), 10)
    if (!siswa || !indikator || [sakit, izin, alpha].some((value) => Number.isNaN(value) || value < 0)) {
      results.kehadiran.errors++
      return
    }
    const kehadiranPayload = {
      siswa_id: siswa.id,
      nis: siswa.nis,
      periode_ajaran_id: periodeAjaranId,
      indikator_kehadiran_id: indikator.id,
      sakit,
      izin,
      alpha,
    }
    kehadiranTasks.push(createWriteTask(options, "kehadiran", `${siswa.id}:${indikator.id}:${periodeAjaranId}`, kehadiranPayload, () => prisma.kehadiran.upsert({
      where: { siswa_id_periode_ajaran_id_indikator_kehadiran_id: { siswa_id: siswa.id, periode_ajaran_id: periodeAjaranId, indikator_kehadiran_id: indikator.id } },
      update: { sakit, izin, alpha },
      create: { siswa_id: siswa.id, periode_ajaran_id: periodeAjaranId, indikator_kehadiran_id: indikator.id, sakit, izin, alpha },
    })))
  })
  await settleWrites("kehadiran", kehadiranTasks, results.kehadiran)

  const penilaianSikapTasks: Array<() => Promise<unknown>> = []
  payload.penilaianSikap.forEach((item) => {
    const siswa = studentMap.get(normalize(item.nis))
    const indikator = attitudeMap.get(normalize(item.indikator))
    const nilai = Number.parseInt(String(item.nilai), 10)
    if (!siswa || !indikator || Number.isNaN(nilai) || nilai < 0 || nilai > 100) {
      results.penilaianSikap.errors++
      return
    }
    const predikat = getSikapPredicate(nilai)
    const sikapPayload = {
      siswa_id: siswa.id,
      nis: siswa.nis,
      indikator_id: indikator.id,
      periode_ajaran_id: periodeAjaranId,
      nilai,
      predikat,
    }
    penilaianSikapTasks.push(createWriteTask(options, "penilaian_sikap", `${siswa.id}:${indikator.id}:${periodeAjaranId}`, sikapPayload, () => prisma.penilaianSikap.upsert({
      where: { siswa_id_indikator_id_periode_ajaran_id: { siswa_id: siswa.id, indikator_id: indikator.id, periode_ajaran_id: periodeAjaranId } },
      update: { nilai, predikat },
      create: { siswa_id: siswa.id, indikator_id: indikator.id, periode_ajaran_id: periodeAjaranId, nilai, predikat },
    })))
  })
  await settleWrites("penilaian_sikap", penilaianSikapTasks, results.penilaianSikap)

  const catatanTasks: Array<() => Promise<unknown>> = []
  payload.catatanSiswa.forEach((item) => {
    const siswa = studentMap.get(normalize(item.nis))
    if (!siswa) {
      results.catatanSiswa.errors++
      return
    }
    const catatanPayload = {
      siswa_id: siswa.id,
      nis: siswa.nis,
      periode_ajaran_id: periodeAjaranId,
      catatan_sikap: item.catatanSikap,
      catatan_akademik: item.catatanAkademik,
    }
    catatanTasks.push(createWriteTask(options, "catatan_siswa", `${siswa.id}:${periodeAjaranId}`, catatanPayload, () => prisma.catatanSiswa.upsert({
      where: { siswa_id_periode_ajaran_id: { siswa_id: siswa.id, periode_ajaran_id: periodeAjaranId } },
      update: { catatan_sikap: item.catatanSikap, catatan_akademik: item.catatanAkademik },
      create: { siswa_id: siswa.id, periode_ajaran_id: periodeAjaranId, catatan_sikap: item.catatanSikap, catatan_akademik: item.catatanAkademik },
    })))
  })
  await settleWrites("catatan_siswa", catatanTasks, results.catatanSiswa)

  return results
}
