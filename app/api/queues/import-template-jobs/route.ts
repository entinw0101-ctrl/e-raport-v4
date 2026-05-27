import { handleCallback, send } from "@vercel/queue"
import { IMPORT_TEMPLATE_TOPIC } from "@/lib/import-template-queue"
import { processNextImportTemplateBatch } from "@/lib/import-template-runner"

type ImportTemplateQueueMessage = {
  jobId: string
}

export const runtime = "nodejs"
export const maxDuration = 60

export const POST = handleCallback<ImportTemplateQueueMessage>(async (message) => {
  const job = await processNextImportTemplateBatch(message.jobId)
  if (job?.status === "PENDING" || job?.status === "PROCESSING") {
    await send(IMPORT_TEMPLATE_TOPIC, { jobId: message.jobId })
  }
})
