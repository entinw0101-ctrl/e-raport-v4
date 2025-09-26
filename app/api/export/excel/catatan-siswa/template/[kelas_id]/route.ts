import { NextRequest, NextResponse } from "next/server"
import ExcelJS from "exceljs"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ kelas_id: string }> }
) {
  try {
    const resolvedParams = await params
    const kelasId = parseInt(resolvedParams.kelas_id)
    const { searchParams } = new URL(request.url)
    const periodeAjaranId = searchParams.get("periode_ajaran_id")

    if (isNaN(kelasId)) {
      return NextResponse.json(
        { success: false, error: "ID kelas tidak valid" },
        { status: 400 }
      )
    }

    if (!periodeAjaranId) {
      return NextResponse.json(
        { success: false, error: "periode_ajaran_id diperlukan" },
        { status: 400 }
      )
    }

    // Get kelas info
    const kelas = await prisma.kelas.findUnique({
      where: { id: kelasId },
      select: { nama_kelas: true }
    })

    if (!kelas) {
      return NextResponse.json(
        { success: false, error: "Kelas tidak ditemukan" },
        { status: 404 }
      )
    }

    // Get students in the class
    const siswa = await prisma.siswa.findMany({
      where: {
        kelas_id: kelasId,
        status: "Aktif"
      },
      select: {
        nis: true,
        nama: true,
      },
      orderBy: {
        nama: "asc"
      }
    })

    // Create workbook
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet("Catatan Siswa")

    // Set column widths
    worksheet.columns = [
      { key: "nis", header: "NIS", width: 15 },
      { key: "nama", header: "Nama Siswa", width: 30 },
      { key: "catatan_sikap", header: "Catatan Sikap", width: 40 },
      { key: "catatan_akademik", header: "Catatan Akademik", width: 40 },
    ]

    // Add data rows
    siswa.forEach((student) => {
      worksheet.addRow({
        nis: student.nis,
        nama: student.nama,
        catatan_sikap: "",
        catatan_akademik: "",
      })
    })

    // Style header row
    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true }
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE6E6FA" }
    }

    // Note: Data validation removed for simplicity
    // Catatan fields are free text without specific validation

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer()

    // Set headers for file download
    const headers = new Headers()
    headers.set("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    headers.set("Content-Disposition", `attachment; filename="template_catatan_siswa_${kelas.nama_kelas?.replace(/\s+/g, "_") || "kelas"}.xlsx"`)

    return new NextResponse(buffer, {
      status: 200,
      headers,
    })

  } catch (error) {
    console.error("Error generating catatan siswa template:", error)
    return NextResponse.json(
      { success: false, error: "Gagal generate template catatan siswa" },
      { status: 500 }
    )
  }
}