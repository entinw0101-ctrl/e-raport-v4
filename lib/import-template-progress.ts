import { prisma } from "@/lib/prisma"
import type { ImportResult, ImportTableResult } from "@/lib/import-template-processor"

function emptyTableResult(): ImportTableResult {
  return { inserted: 0, updated: 0, errors: 0 }
}

function aggregateResults(results: Array<ImportResult | null | undefined>): ImportResult {
  const total: ImportResult = {
    nilaiUjian: emptyTableResult(),
    nilaiHafalan: emptyTableResult(),
    kehadiran: emptyTableResult(),
    penilaianSikap: emptyTableResult(),
    catatanSiswa: emptyTableResult(),
  }

  results.filter(Boolean).forEach((result) => {
    Object.keys(total).forEach((table) => {
      const key = table as keyof ImportResult
      total[key].inserted += result![key].inserted
      total[key].updated += result![key].updated
      total[key].errors += result![key].errors
    })
  })

  return total
}

export async function synchronizeImportTemplateJob(jobId: string) {
  const job = await prisma.importTemplateJob.findUnique({
    where: { id: jobId },
    include: { batches: { orderBy: { nomor_batch: "asc" } } },
  })

  if (!job) return null

  const selesai = job.batches.filter((batch) => batch.status === "COMPLETED")
  const gagal = job.batches.filter((batch) => batch.status === "FAILED")
  const aktif = job.batches.filter((batch) => batch.status === "PENDING" || batch.status === "PROCESSING")
  const hasil = aggregateResults(selesai.map((batch) => batch.hasil as ImportResult | null))

  const status = selesai.length === job.total_batches
    ? "COMPLETED"
    : gagal.length > 0 && aktif.length === 0
      ? "PARTIAL_FAILED"
      : selesai.length > 0 || aktif.length > 0
        ? "PROCESSING"
        : "PENDING"

  return prisma.importTemplateJob.update({
    where: { id: jobId },
    data: {
      status,
      selesai_batches: selesai.length,
      gagal_batches: gagal.length,
      processed_siswa: selesai.reduce((total, batch) => total + batch.total_siswa, 0),
      hasil: hasil as any,
      pesan_error: gagal.length > 0 ? "Ada batch yang gagal setelah beberapa percobaan" : null,
    },
    include: {
      batches: {
        select: {
          id: true,
          nomor_batch: true,
          status: true,
          total_siswa: true,
          percobaan: true,
          pesan_error: true,
        },
        orderBy: { nomor_batch: "asc" },
      },
    },
  })
}
