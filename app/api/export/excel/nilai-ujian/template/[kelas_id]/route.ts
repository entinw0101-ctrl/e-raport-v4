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

    // Get kelas with tingkatan
    const kelas = await prisma.kelas.findUnique({
      where: { id: kelasId },
      include: {
        tingkatan: true,
      },
    })

    if (!kelas) {
      return NextResponse.json({ success: false, error: "Kelas tidak ditemukan" }, { status: 404 })
    }

    if (!kelas.tingkatan) {
      return NextResponse.json({ success: false, error: "Tingkatan kelas tidak ditemukan" }, { status: 404 })
    }

    // Get students currently in this class (for template purposes)
    // Since nilai ujian is per semester, we use current class students
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

    // Get curriculum subjects for this level (only Ujian type)
    const kurikulum = await prisma.kurikulum.findMany({
      where: {
        tingkatan_id: kelas.tingkatan.id,
        mata_pelajaran: {
          jenis: "Ujian",
        },
      },
      include: {
        mata_pelajaran: {
          select: {
            id: true,
            nama_mapel: true,
          },
        },
      },
      orderBy: {
        mata_pelajaran: {
          nama_mapel: "asc",
        },
      },
    })

    // Filter out any kurikulum without mata_pelajaran (shouldn't happen but for type safety)
    const validKurikulum = kurikulum.filter((item) => item.mata_pelajaran !== null)

    if (validKurikulum.length === 0) {
      return NextResponse.json({ success: false, error: "Tidak ada mata pelajaran ujian untuk tingkatan ini" }, { status: 404 })
    }

    // Create workbook
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet(`Template Nilai Ujian - ${kelas.nama_kelas}`)

    // Define columns (following combined template pattern)
    const columns = [
      { header: "NIS", key: "nis", width: 15 },
      { header: "Nama Siswa", key: "nama", width: 25 },
      { header: "Mata Pelajaran", key: "mata_pelajaran", width: 25 },
      { header: "Nilai", key: "nilai", width: 10 },
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

    // Add data rows for each student and each subject
    let currentRow = 2 // Start after header
    siswaInKelas.forEach((siswa, studentIndex) => {
      const isFirstStudent = studentIndex === 0
      const isLastStudent = studentIndex === siswaInKelas.length - 1

      validKurikulum.forEach((kurikulum, subjectIndex) => {
        const isFirstSubject = subjectIndex === 0
        const isLastSubject = subjectIndex === validKurikulum.length - 1

        const row = worksheet.addRow({
          nis: isFirstSubject ? siswa.nis : "",
          nama: isFirstSubject ? siswa.nama : "",
          mata_pelajaran: kurikulum.mata_pelajaran!.nama_mapel,
          nilai: "",
          semester: isFirstSubject ? `Semester ${periodeAjaran.semester === "SATU" ? "1" : "2"}` : "",
          periode_ajaran: isFirstSubject ? periodeAjaran.nama_ajaran : "",
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
      if (validKurikulum.length > 1) {
        const startRow = currentRow - validKurikulum.length
        const endRow = currentRow - 1

        // Merge NIS column (column A)
        worksheet.mergeCells(`A${startRow}:A${endRow}`)
        // Merge Nama Siswa column (column B)
        worksheet.mergeCells(`B${startRow}:B${endRow}`)
        // Merge Semester column (column E)
        worksheet.mergeCells(`E${startRow}:E${endRow}`)
        // Merge Periode Ajaran column (column F)
        worksheet.mergeCells(`F${startRow}:F${endRow}`)

        // Center align merged cells
        worksheet.getCell(`A${startRow}`).alignment = { horizontal: 'center', vertical: 'middle' }
        worksheet.getCell(`B${startRow}`).alignment = { horizontal: 'center', vertical: 'middle' }
        worksheet.getCell(`E${startRow}`).alignment = { horizontal: 'center', vertical: 'middle' }
        worksheet.getCell(`F${startRow}`).alignment = { horizontal: 'center', vertical: 'middle' }
      }
    })

    // Set response headers
    const buffer = await workbook.xlsx.writeBuffer()

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=template_nilai_ujian_${kelas.nama_kelas}_semester_${periodeAjaran.semester === "SATU" ? "1" : "2"}_${new Date().toISOString().split("T")[0]}.xlsx`,
      },
    })
  } catch (error) {
    console.error("Error generating nilai ujian template:", error)
    return NextResponse.json({ success: false, error: "Gagal membuat template nilai ujian" }, { status: 500 })
  }
}