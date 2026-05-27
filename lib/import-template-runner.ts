import { prisma } from "@/lib/prisma"
import type { CombinedTemplatePayload } from "@/lib/import-template-job"
import { processImportTemplateBatch } from "@/lib/import-template-processor"
import { synchronizeImportTemplateJob } from "@/lib/import-template-progress"

const MAX_ATTEMPTS = 3
const STALE_PROCESSING_MS = 90 * 1000

export async function processNextImportTemplateBatch(jobId: string) {
  const job = await prisma.importTemplateJob.findUnique({ where: { id: jobId } })
  if (!job) return null

  if (job.status === "COMPLETED" || job.status === "PARTIAL_FAILED" || job.status === "FAILED") {
    return synchronizeImportTemplateJob(job.id)
  }

  const staleBefore = new Date(Date.now() - STALE_PROCESSING_MS)
  await prisma.importTemplateBatch.updateMany({
    where: {
      job_id: job.id,
      status: "PROCESSING",
      diperbarui_pada: { lt: staleBefore },
      percobaan: { lt: MAX_ATTEMPTS },
    },
    data: {
      status: "PENDING",
      pesan_error: "Pemrosesan sebelumnya melewati batas waktu dan dijadwalkan ulang",
    },
  })
  await prisma.importTemplateBatch.updateMany({
    where: {
      job_id: job.id,
      status: "PROCESSING",
      diperbarui_pada: { lt: staleBefore },
      percobaan: { gte: MAX_ATTEMPTS },
    },
    data: {
      status: "FAILED",
      pesan_error: "Batch gagal karena melewati batas waktu setelah beberapa percobaan",
    },
  })

  const batch = await prisma.importTemplateBatch.findFirst({
    where: { job_id: job.id, status: "PENDING" },
    orderBy: { nomor_batch: "asc" },
  })
  if (!batch) return synchronizeImportTemplateJob(job.id)

  const claimed = await prisma.importTemplateBatch.updateMany({
    where: { id: batch.id, status: "PENDING", percobaan: batch.percobaan },
    data: { status: "PROCESSING", percobaan: { increment: 1 }, pesan_error: null },
  })
  if (claimed.count === 0) return synchronizeImportTemplateJob(job.id)

  await prisma.importTemplateJob.update({
    where: { id: job.id },
    data: { status: "PROCESSING" },
  })

  try {
    const result = await processImportTemplateBatch(
      batch.payload as unknown as CombinedTemplatePayload,
      job.kelas_id,
      job.periode_ajaran_id,
      job.is_simulasi ? { simulationJobId: job.id } : {},
    )
    await prisma.importTemplateBatch.update({
      where: { id: batch.id },
      data: { status: "COMPLETED", hasil: result as any },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pemrosesan batch gagal"
    const isFinalFailure = batch.percobaan + 1 >= MAX_ATTEMPTS
    await prisma.importTemplateBatch.update({
      where: { id: batch.id },
      data: {
        status: isFinalFailure ? "FAILED" : "PENDING",
        pesan_error: message,
      },
    })
  }

  return synchronizeImportTemplateJob(job.id)
}
