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

    // Define columns
    const columns = [
      { header: "NIS", key: "nis", width: 15 },
      { header: "Nama Siswa", key: "nama", width: 25 },
      { header: "Periode Ajaran", key: "periode_ajaran", width: 20 },
      { header: "Semester", key: "semester", width: 10 },
    ]

    // Add columns for each subject (one column per subject, not per exam type)
    validKurikulum.forEach((item) => {
      const header = item.mata_pelajaran!.nama_mapel
      columns.push({
        header,
        key: `mapel_${item.mata_pelajaran!.id}`,
        width: Math.max(header.length, 10),
      })
    })

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

    // Add data rows for each student
    siswaInKelas.forEach((siswa) => {
      const row: any = {
        nis: siswa.nis,
        nama: siswa.nama,
        periode_ajaran: periodeAjaran.nama_ajaran,
        semester: `Semester ${periodeAjaran.semester === "SATU" ? "1" : "2"}`,
      }

      // Initialize all score columns with empty values
      validKurikulum.forEach((item) => {
        row[`mapel_${item.mata_pelajaran!.id}`] = ""
      })

      const addedRow = worksheet.addRow(row)

      // Add borders to all cells in the data row
      addedRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
      })
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