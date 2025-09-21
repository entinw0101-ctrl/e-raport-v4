import { NextRequest, NextResponse } from "next/server"
import ExcelJS from "exceljs"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest, { params }: { params: Promise<{ kelas_id: string }> }) {
  try {
    const resolvedParams = await params
    const kelasId = parseInt(resolvedParams.kelas_id)
    const { searchParams } = new URL(request.url)
    const periodeAjaranId = searchParams.get("periode_ajaran_id")

    if (isNaN(kelasId)) {
      return NextResponse.json({ success: false, error: "ID kelas tidak valid" }, { status: 400 })
    }

    if (!periodeAjaranId) {
      return NextResponse.json({ success: false, error: "ID periode ajaran diperlukan" }, { status: 400 })
    }

    // Find periode ajaran
    const periodeAjaran = await prisma.periodeAjaran.findUnique({
      where: { id: parseInt(periodeAjaranId) },
      select: {
        id: true,
        nama_ajaran: true,
        semester: true
      }
    })

    if (!periodeAjaran) {
      return NextResponse.json({ success: false, error: "Periode ajaran tidak ditemukan" }, { status: 404 })
    }

    // Get kelas
    const kelas = await prisma.kelas.findUnique({
      where: { id: kelasId },
      select: {
        id: true,
        nama_kelas: true,
      },
    })

    if (!kelas) {
      return NextResponse.json({ success: false, error: "Kelas tidak ditemukan" }, { status: 404 })
    }

    // Get students in this class
    const siswaInKelas = await prisma.siswa.findMany({
      where: {
        kelas_id: kelasId,
        status: "Aktif",
      },
      select: {
        id: true,
        nama: true,
        nis: true,
      },
      orderBy: {
        nama: "asc",
      },
    })

    if (siswaInKelas.length === 0) {
      return NextResponse.json({ success: false, error: "Tidak ada siswa aktif di kelas ini" }, { status: 404 })
    }

    // Get all attendance indicators
    const indikatorKehadiran = await prisma.indikatorKehadiran.findMany({
      orderBy: {
        nama_indikator: "asc",
      },
    })

    if (indikatorKehadiran.length === 0) {
      return NextResponse.json({ success: false, error: "Tidak ada indikator kehadiran" }, { status: 404 })
    }

    // Create workbook
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet(`Template Kehadiran - ${kelas.nama_kelas}`)

    // Define columns
    const columns = [
      { header: "NIS", key: "nis", width: 15 },
      { header: "Nama Siswa", key: "nama", width: 25 },
      { header: "Indikator Kehadiran", key: "indikator", width: 20 },
      { header: "Sakit", key: "sakit", width: 10 },
      { header: "Izin", key: "izin", width: 10 },
      { header: "Alpha", key: "alpha", width: 10 },
      { header: "Semester", key: "semester", width: 12 },
      { header: "Periode Ajaran", key: "periode_ajaran", width: 20 },
    ]

    worksheet.columns = columns

    // Style headers
    worksheet.getRow(1).eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0066CC" }, // Blue color
      }
      cell.font = {
        color: { argb: "FFFFFFFF" }, // White text
        bold: true,
      }
      cell.alignment = {
        horizontal: "center",
        vertical: "middle",
      }
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
    })

    // Add data rows for each student and each indicator
    let currentRow = 2 // Start after header
    siswaInKelas.forEach((siswa, studentIndex) => {
      const isFirstStudent = studentIndex === 0
      const isLastStudent = studentIndex === siswaInKelas.length - 1

      indikatorKehadiran.forEach((indikator, indicatorIndex) => {
        const isFirstIndicator = indicatorIndex === 0
        const isLastIndicator = indicatorIndex === indikatorKehadiran.length - 1

        const row = worksheet.addRow({
          nis: isFirstIndicator ? siswa.nis : "",
          nama: isFirstIndicator ? siswa.nama : "",
          indikator: indikator.nama_indikator,
          sakit: "",
          izin: "",
          alpha: "",
          semester: isFirstIndicator ? `Semester ${periodeAjaran.semester === "SATU" ? "1" : "2"}` : "",
          periode_ajaran: isFirstIndicator ? periodeAjaran.nama_ajaran : "",
        })

        // Add borders to all cells in the data row
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          }
        })

        currentRow++
      })

      // Merge cells for NIS, Nama, Semester, and Periode Ajaran
      if (indikatorKehadiran.length > 1) {
        const startRow = currentRow - indikatorKehadiran.length
        const endRow = currentRow - 1

        // Merge NIS column (column A)
        worksheet.mergeCells(`A${startRow}:A${endRow}`)
        // Merge Nama Siswa column (column B)
        worksheet.mergeCells(`B${startRow}:B${endRow}`)
        // Merge Semester column (column G)
        worksheet.mergeCells(`G${startRow}:G${endRow}`)
        // Merge Periode Ajaran column (column H)
        worksheet.mergeCells(`H${startRow}:H${endRow}`)

        // Center align merged cells
        worksheet.getCell(`A${startRow}`).alignment = { horizontal: 'center', vertical: 'middle' }
        worksheet.getCell(`B${startRow}`).alignment = { horizontal: 'center', vertical: 'middle' }
        worksheet.getCell(`G${startRow}`).alignment = { horizontal: 'center', vertical: 'middle' }
        worksheet.getCell(`H${startRow}`).alignment = { horizontal: 'center', vertical: 'middle' }
      }
    })

    // Set response headers
    const buffer = await workbook.xlsx.writeBuffer()

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=template_kehadiran_${kelas.nama_kelas}_semester_${periodeAjaran.semester === "SATU" ? "1" : "2"}_${new Date().toISOString().split("T")[0]}.xlsx`,
      },
    })
  } catch (error) {
    console.error("Error generating kehadiran template:", error)
    return NextResponse.json({ success: false, error: "Gagal membuat template kehadiran" }, { status: 500 })
  }
}