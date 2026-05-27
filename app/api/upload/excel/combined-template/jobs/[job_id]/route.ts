import { NextResponse } from "next/server"
import { synchronizeImportTemplateJob } from "@/lib/import-template-progress"

export const maxDuration = 30

export async function GET(_request: Request, props: { params: Promise<{ job_id: string }> }) {
  const params = await props.params;
  const job = await synchronizeImportTemplateJob(params.job_id)

  if (!job) {
    return NextResponse.json({ success: false, error: "Job import tidak ditemukan" }, { status: 404 })
  }

  return NextResponse.json({ success: true, data: job })
}
