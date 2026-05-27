import { send } from "@vercel/queue"

export const IMPORT_TEMPLATE_TOPIC = "import-template-jobs"

export async function enqueueImportTemplateJob(jobId: string): Promise<boolean> {
  if (!process.env.VERCEL) return false

  try {
    await send(IMPORT_TEMPLATE_TOPIC, { jobId })
    return true
  } catch (error) {
    console.error("Gagal mengirim job import ke Vercel Queue:", error)
    return false
  }
}
