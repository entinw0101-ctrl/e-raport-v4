import { NextResponse } from "next/server"
import { processNextImportTemplateBatch } from "@/lib/import-template-runner"

export const maxDuration = 60

export async function POST(_request: Request, props: { params: Promise<{ job_id: string }> }) {
  const params = await props.params;
  const job = await processNextImportTemplateBatch(params.job_id)
  if (!job) {
    return NextResponse.json({ success: false, error: "Job import tidak ditemukan" }, { status: 404 })
  }
  return NextResponse.json({ success: true, data: job })
}
