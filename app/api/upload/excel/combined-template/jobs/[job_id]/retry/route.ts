import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { synchronizeImportTemplateJob } from "@/lib/import-template-progress"
import { enqueueImportTemplateJob } from "@/lib/import-template-queue"

export const maxDuration = 30

export async function POST(_request: Request, props: { params: Promise<{ job_id: string }> }) {
  const params = await props.params;
  const job = await prisma.importTemplateJob.findUnique({ where: { id: params.job_id } })
  if (!job) {
    return NextResponse.json({ success: false, error: "Job import tidak ditemukan" }, { status: 404 })
  }

  await prisma.importTemplateBatch.updateMany({
    where: { job_id: job.id, status: "FAILED" },
    data: { status: "PENDING", percobaan: 0, pesan_error: null },
  })
  await prisma.importTemplateJob.update({
    where: { id: job.id },
    data: { status: "PROCESSING", pesan_error: null },
  })

  const backgroundQueued = await enqueueImportTemplateJob(job.id)
  return NextResponse.json({ success: true, data: await synchronizeImportTemplateJob(job.id), backgroundQueued })
}
