import { type NextRequest, NextResponse } from "next/server"
import ExcelJS from "exceljs"
import { createEmptyImportTemplatePayload, createImportTemplateJob } from "@/lib/import-template-job"
import { enqueueImportTemplateJob } from "@/lib/import-template-queue"

export const maxDuration = 60

function getCellValue(row: ExcelJS.Row, cellIndex: number): string {
  const value = row.getCell(cellIndex).value
  if (value === null || value === undefined) return ""
  if (typeof value === "object" && "richText" in value) return value.richText.map((text) => text.text).join("").trim()
  if (typeof value === "object" && "result" in value) return String(value.result ?? "").trim()
  return String(value).trim()
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const kelasId = formData.get("kelas_id") as string | null
    const periodeAjaranId = formData.get("periode_ajaran_id") as string | null
    if (!file || !kelasId || !periodeAjaranId) {
      return NextResponse.json({ success: false, error: "File, kelas ID, dan periode ajaran ID diperlukan" }, { status: 400 })
    }

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(await file.arrayBuffer())
    const worksheet = workbook.worksheets.find((sheet) => sheet.name.includes("Template Nilai Hafalan")) || workbook.worksheets[0]
    if (!worksheet) {
      return NextResponse.json({ success: false, error: "Sheet nilai hafalan tidak ditemukan." }, { status: 400 })
    }

    const payload = createEmptyImportTemplatePayload()
    const errors: string[] = []
    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber)
      const nis = getCellValue(row, 1)
      const nama = getCellValue(row, 2)
      const mataPelajaran = getCellValue(row, 3)
      const targetHafalan = getCellValue(row, 5)
      const predikat = getCellValue(row, 6)
      if (!nis && !mataPelajaran && !predikat) continue
      if (!nis || !mataPelajaran || !["Tercapai", "Tidak Tercapai"].includes(predikat)) {
        errors.push(`Baris ${rowNumber}: NIS, mata pelajaran, atau predikat hafalan tidak valid.`)
        continue
      }
      payload.nilaiHafalan.push({ nis, nama, mataPelajaran, targetHafalan, predikat })
    }

    if (errors.length > 0 || payload.nilaiHafalan.length === 0) {
      return NextResponse.json({ success: false, error: "Validasi nilai hafalan gagal", details: errors }, { status: 400 })
    }

    const job = await createImportTemplateJob(payload, kelasId, periodeAjaranId, file.name)
    const backgroundQueued = await enqueueImportTemplateJob(job.id)
    return NextResponse.json({ success: true, message: "Import nilai hafalan dijadwalkan per batch.", job, backgroundQueued })
  } catch (error) {
    console.error("Error scheduling nilai hafalan import:", error)
    return NextResponse.json({ success: false, error: "Gagal memproses file nilai hafalan" }, { status: 500 })
  }
}
