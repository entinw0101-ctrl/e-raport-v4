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
      return NextResponse.json({ success: false, error: "File Excel tidak valid" }, { status: 400 })
    }
    if (
      worksheet.getCell("A1").value?.toString() !== "NIS"
      || worksheet.getCell("B1").value?.toString() !== "Nama Siswa"
      || worksheet.getCell("C1").value?.toString() !== "Indikator Sikap"
      || worksheet.getCell("D1").value?.toString() !== "Nilai"
      || worksheet.getCell("E1").value?.toString() !== "Semester"
      || worksheet.getCell("F1").value?.toString() !== "Periode Ajaran"
    ) {
      return NextResponse.json({ success: false, error: "Format header Excel tidak sesuai dengan template." }, { status: 400 })
    }

    const payload = createEmptyImportTemplatePayload()
    const errors: string[] = []
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return
      const nis = row.getCell(1).value?.toString().trim() || ""
      const nama = row.getCell(2).value?.toString().trim() || ""
      const indikator = row.getCell(3).value?.toString().trim() || ""
      const nilaiRaw = row.getCell(4).value?.toString().trim() || ""
      if (!nis && !nama && !indikator && !nilaiRaw) return
      const nilai = Number.parseInt(nilaiRaw, 10)
      if (!nis || !indikator || Number.isNaN(nilai) || nilai < 0 || nilai > 100) {
        errors.push(`Baris ${rowNumber}: NIS, indikator, dan nilai 0-100 harus valid.`)
        return
      }
      payload.penilaianSikap.push({ nis, nama, indikator, nilai })
    })

    if (errors.length > 0 || payload.penilaianSikap.length === 0) {
      return NextResponse.json({ success: false, error: "Validasi penilaian sikap gagal", details: errors }, { status: 400 })
    }

    const job = await createImportTemplateJob(payload, kelasId, periodeAjaranId, file.name)
    const backgroundQueued = await enqueueImportTemplateJob(job.id)
    return NextResponse.json({ success: true, message: "Import penilaian sikap dijadwalkan per batch.", job, backgroundQueued })
  } catch (error) {
    console.error("Error scheduling penilaian sikap import:", error)
    return NextResponse.json({ success: false, error: "Gagal memproses file penilaian sikap" }, { status: 500 })
  }
}
