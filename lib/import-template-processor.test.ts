import { processImportTemplateBatch } from "./import-template-processor"
import { mockPrisma } from "../jest.setup"

describe("processImportTemplateBatch", () => {
  beforeEach(() => {
    mockPrisma.siswa.findMany.mockResolvedValue([
      { id: 1, nis: "NIS-001", kelas: { tingkatan: { id: 10 } } },
    ] as any)
    mockPrisma.mataPelajaran.findMany.mockResolvedValue([
      { id: 20, nama_mapel: "Nahwu", jenis: "Ujian" },
      { id: 21, nama_mapel: "Hafalan", jenis: "Hafalan" },
    ] as any)
    mockPrisma.kurikulum.findMany.mockResolvedValue([
      { tingkatan_id: 10, mapel_id: 20, kitab: null, batas_hafalan: null },
      { tingkatan_id: 10, mapel_id: 21, kitab: { nama_kitab: "Juz Amma" }, batas_hafalan: null },
    ] as any)
    mockPrisma.indikatorKehadiran.findMany.mockResolvedValue([{ id: 30, nama_indikator: "Harian" }] as any)
    mockPrisma.indikatorSikap.findMany.mockResolvedValue([{ id: 40, indikator: "Disiplin" }] as any)
    mockPrisma.nilaiUjian.upsert.mockResolvedValue({} as any)
    mockPrisma.nilaiHafalan.upsert.mockResolvedValue({} as any)
    mockPrisma.kehadiran.upsert.mockResolvedValue({} as any)
    mockPrisma.penilaianSikap.upsert.mockResolvedValue({} as any)
    mockPrisma.catatanSiswa.upsert.mockResolvedValue({} as any)
    mockPrisma.importTemplateSimulationResult.upsert.mockResolvedValue({} as any)
  })

  test("memproses seluruh sheet dalam satu batch siswa", async () => {
    const result = await processImportTemplateBatch({
      nilaiUjian: [{ nis: "NIS-001", mataPelajaran: "Nahwu", nilai: 9 }],
      nilaiHafalan: [{ nis: "NIS-001", mataPelajaran: "Hafalan", predikat: "Tercapai" }],
      kehadiran: [{ nis: "NIS-001", indikator: "Harian", sakit: 1, izin: 0, alpha: 0 }],
      penilaianSikap: [{ nis: "NIS-001", indikator: "Disiplin", nilai: 95 }],
      catatanSiswa: [{ nis: "NIS-001", catatanSikap: "Baik", catatanAkademik: "Tekun" }],
    }, 1, 2)

    expect(result.nilaiUjian.inserted).toBe(1)
    expect(result.nilaiHafalan.inserted).toBe(1)
    expect(result.kehadiran.inserted).toBe(1)
    expect(result.penilaianSikap.inserted).toBe(1)
    expect(result.catatanSiswa.inserted).toBe(1)

    expect(mockPrisma.nilaiUjian.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ nilai_angka: 9, predikat: "Baik Sekali" }),
    }))
    expect(mockPrisma.penilaianSikap.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ nilai: 95, predikat: "Baik Sekali" }),
    }))
  })

  test("menolak nilai ujian di atas 10 dan penilaian sikap di atas 100", async () => {
    const result = await processImportTemplateBatch({
      nilaiUjian: [{ nis: "NIS-001", mataPelajaran: "Nahwu", nilai: 11 }],
      nilaiHafalan: [],
      kehadiran: [],
      penilaianSikap: [{ nis: "NIS-001", indikator: "Disiplin", nilai: 101 }],
      catatanSiswa: [],
    }, 1, 2)

    expect(result.nilaiUjian.errors).toBe(1)
    expect(result.penilaianSikap.errors).toBe(1)
    expect(mockPrisma.nilaiUjian.upsert).not.toHaveBeenCalled()
    expect(mockPrisma.penilaianSikap.upsert).not.toHaveBeenCalled()
  })

  test("mode simulasi menulis snapshot tanpa menimpa tabel nilai asli", async () => {
    const result = await processImportTemplateBatch({
      nilaiUjian: [{ nis: "NIS-001", mataPelajaran: "Nahwu", nilai: 9 }],
      nilaiHafalan: [{ nis: "NIS-001", mataPelajaran: "Hafalan", predikat: "Tercapai" }],
      kehadiran: [{ nis: "NIS-001", indikator: "Harian", sakit: 1, izin: 0, alpha: 0 }],
      penilaianSikap: [{ nis: "NIS-001", indikator: "Disiplin", nilai: 95 }],
      catatanSiswa: [{ nis: "NIS-001", catatanSikap: "Baik", catatanAkademik: "Tekun" }],
    }, 1, 2, { simulationJobId: "simulation-job" })

    expect(result.nilaiUjian.inserted).toBe(1)
    expect(result.penilaianSikap.inserted).toBe(1)
    expect(mockPrisma.importTemplateSimulationResult.upsert).toHaveBeenCalledTimes(5)
    expect(mockPrisma.importTemplateSimulationResult.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ job_id: "simulation-job", kategori: "nilai_ujian" }),
    }))
    expect(mockPrisma.nilaiUjian.upsert).not.toHaveBeenCalled()
    expect(mockPrisma.nilaiHafalan.upsert).not.toHaveBeenCalled()
    expect(mockPrisma.kehadiran.upsert).not.toHaveBeenCalled()
    expect(mockPrisma.penilaianSikap.upsert).not.toHaveBeenCalled()
    expect(mockPrisma.catatanSiswa.upsert).not.toHaveBeenCalled()
  })
})
