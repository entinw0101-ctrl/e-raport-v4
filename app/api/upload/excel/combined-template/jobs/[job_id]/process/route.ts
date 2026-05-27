import { NextResponse } from "next/server"
import { processNextImportTemplateBatch } from "@/lib/import-template-runner"

export const maxDuration = 60

export async function POST(_request: Request, { params }: { params: { job_id: string } }) {
  const job = await processNextImportTemplateBatch(params.job_id)
  if (!job) {
    return NextResponse.json({ success: false, error: "Job import tidak ditemukan" }, { status: 404 })
  }
  return NextResponse.json({ success: true, data: job })
}
