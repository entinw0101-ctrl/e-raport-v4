import { NextRequest, NextResponse } from "next/server"
import ExcelJS from "exceljs"
import { createEmptyImportTemplatePayload, createImportTemplateJob } from "@/lib/import-template-job"
import { enqueueImportTemplateJob } from "@/lib/import-template-queue"

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const kelasId = formData.get("kelas_id") as string | null
    const periodeAjaranId = formData.get("periode_ajaran_id") as string | null

    if (!file || !kelasId || !periodeAjaranId) {
      return NextResponse.json({ success: false, error: "File, kelas ID, dan periode ajaran ID diperlukan" }, { status: 400 })
    }
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      return NextResponse.json({ success: false, error: "File harus berformat Excel (.xlsx atau .xls)" }, { status: 400 })
    }

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(await file.arrayBuffer())
    const worksheet = workbook.worksheets[0]
    if (!worksheet) {
      return NextResponse.json({ success: false, error: "Tidak ada sheet di file Excel" }, { status: 400 })
    }

    const payload = createEmptyImportTemplatePayload()
    const errors: string[] = []
    const rows = worksheet.getSheetValues().slice(2)
    rows.forEach((row, index) => {
      if (!Array.isArray(row) || row.length < 5) return
      const nis = String(row[1] ?? "").trim()
      const nama = String(row[2] ?? "").trim()
      const mataPelajaran = String(row[3] ?? "").trim()
      const nilai = Number.parseFloat(String(row[4] ?? ""))
      if (!nis || !mataPelajaran || Number.isNaN(nilai) || nilai < 0 || nilai > 10) {
        errors.push(`Baris ${index + 3}: NIS, mata pelajaran, dan nilai 0-10 harus valid.`)
        return
      }
      payload.nilaiUjian.push({ nis, nama, mataPelajaran, nilai })
    })

    if (errors.length > 0 || payload.nilaiUjian.length === 0) {
      return NextResponse.json({ success: false, error: "Validasi nilai ujian gagal", details: errors }, { status: 400 })
    }

    const job = await createImportTemplateJob(payload, kelasId, periodeAjaranId, file.name)
    const backgroundQueued = await enqueueImportTemplateJob(job.id)
    return NextResponse.json({ success: true, message: "Import nilai ujian dijadwalkan per batch.", job, backgroundQueued })
  } catch (error) {
    console.error("Error scheduling nilai ujian import:", error)
    return NextResponse.json({ success: false, error: "Gagal memproses file nilai ujian" }, { status: 500 })
  }
}
