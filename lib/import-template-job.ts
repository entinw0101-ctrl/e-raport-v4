import { prisma } from "@/lib/prisma"

export interface CombinedTemplatePayload {
  nilaiUjian: any[]
  nilaiHafalan: any[]
  kehadiran: any[]
  penilaianSikap: any[]
  catatanSiswa: any[]
}

const DEFAULT_STUDENTS_PER_BATCH = 10

function normalizeNis(nis: unknown): string {
  return typeof nis === "string" ? nis.trim() : String(nis ?? "").trim()
}

function getPayloadStudents(payload: CombinedTemplatePayload): string[] {
  const nises = new Set<string>()
  Object.values(payload).forEach((items) => {
    items.forEach((item: any) => {
      const nis = normalizeNis(item.nis)
      if (nis) nises.add(nis)
    })
  })
  return Array.from(nises)
}

function filterPayloadForStudents(payload: CombinedTemplatePayload, nises: Set<string>): CombinedTemplatePayload {
  return {
    nilaiUjian: payload.nilaiUjian.filter((item) => nises.has(normalizeNis(item.nis))),
    nilaiHafalan: payload.nilaiHafalan.filter((item) => nises.has(normalizeNis(item.nis))),
    kehadiran: payload.kehadiran.filter((item) => nises.has(normalizeNis(item.nis))),
    penilaianSikap: payload.penilaianSikap.filter((item) => nises.has(normalizeNis(item.nis))),
    catatanSiswa: payload.catatanSiswa.filter((item) => nises.has(normalizeNis(item.nis))),
  }
}

export async function createImportTemplateJob(
  payload: CombinedTemplatePayload,
  kelasId: string,
  periodeAjaranId: string,
  fileName: string,
  studentsPerBatch = DEFAULT_STUDENTS_PER_BATCH,
) {
  const studentNises = getPayloadStudents(payload)
  const batches: Array<{ total_siswa: number; payload: CombinedTemplatePayload }> = []

  for (let start = 0; start < studentNises.length; start += studentsPerBatch) {
    const selectedNises = new Set(studentNises.slice(start, start + studentsPerBatch))
    batches.push({
      total_siswa: selectedNises.size,
      payload: filterPayloadForStudents(payload, selectedNises),
    })
  }

  if (batches.length === 0) {
    throw new Error("Tidak ada data siswa yang dapat dijadwalkan untuk import")
  }

  return prisma.importTemplateJob.create({
    data: {
      kelas_id: Number.parseInt(kelasId, 10),
      periode_ajaran_id: Number.parseInt(periodeAjaranId, 10),
      file_name: fileName,
      total_siswa: studentNises.length,
      total_batches: batches.length,
      batches: {
        create: batches.map((batch, index) => ({
          nomor_batch: index + 1,
          total_siswa: batch.total_siswa,
          payload: batch.payload as any,
        })),
      },
    },
    include: {
      batches: {
        select: {
          id: true,
          nomor_batch: true,
          status: true,
          total_siswa: true,
          percobaan: true,
        },
        orderBy: { nomor_batch: "asc" },
      },
    },
  })
}
