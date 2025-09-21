import { NextRequest, NextResponse } from "next/server"
import ExcelJS from "exceljs"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const kelasId = formData.get("kelas_id") as string
    const periodeAjaranId = formData.get("periode_ajaran_id") as string

    if (!file) {
      return NextResponse.json({ success: false, error: "File tidak ditemukan" }, { status: 400 })
    }

    if (!kelasId) {
      return NextResponse.json({ success: false, error: "ID kelas diperlukan" }, { status: 400 })
    }

    if (!periodeAjaranId) {
      return NextResponse.json({ success: false, error: "ID periode ajaran diperlukan" }, { status: 400 })
    }

    // Validate file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json({ success: false, error: "File harus berformat Excel (.xlsx atau .xls)" }, { status: 400 })
    }

    // Get periode ajaran
    const periodeAjaran = await prisma.periodeAjaran.findUnique({
      where: { id: parseInt(periodeAjaranId) },
      select: { id: true, nama_ajaran: true }
    })

    if (!periodeAjaran) {
      return NextResponse.json({ success: false, error: "Periode ajaran tidak ditemukan" }, { status: 404 })
    }

    // Get kelas
    const kelas = await prisma.kelas.findUnique({
      where: { id: parseInt(kelasId) },
      select: { id: true, nama_kelas: true }
    })

    if (!kelas) {
      return NextResponse.json({ success: false, error: "Kelas tidak ditemukan" }, { status: 404 })
    }

    // Get all attendance indicators
    const indikatorKehadiran = await prisma.indikatorKehadiran.findMany({
      orderBy: {
        nama_indikator: "asc",
      },
    })

    // Parse Excel file
    const buffer = await file.arrayBuffer()
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)

    const worksheet = workbook.worksheets[0]
    if (!worksheet) {
      return NextResponse.json({ success: false, error: "File Excel tidak valid" }, { status: 400 })
    }

    // Validate required headers (fixed positions)
    const nisHeader = worksheet.getCell('A1').value?.toString()
    const namaHeader = worksheet.getCell('B1').value?.toString()
    const indikatorHeader = worksheet.getCell('C1').value?.toString()
    const sakitHeader = worksheet.getCell('D1').value?.toString()
    const izinHeader = worksheet.getCell('E1').value?.toString()
    const alphaHeader = worksheet.getCell('F1').value?.toString()
    const semesterHeader = worksheet.getCell('G1').value?.toString()
    const periodeHeader = worksheet.getCell('H1').value?.toString()

    if (nisHeader !== "NIS" || namaHeader !== "Nama Siswa" || indikatorHeader !== "Indikator Kehadiran" ||
        sakitHeader !== "Sakit" || izinHeader !== "Izin" || alphaHeader !== "Alpha" ||
        semesterHeader !== "Semester" || periodeHeader !== "Periode Ajaran") {
      return NextResponse.json({
        success: false,
        error: "Format header Excel tidak sesuai. Pastikan header sesuai dengan template."
      }, { status: 400 })
    }

    // Process data rows
    const importData: any[] = []
    const errors: string[] = []

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return // Skip header row

      const nis = row.getCell(1).value?.toString() || ""
      const nama = row.getCell(2).value?.toString() || ""
      const indikatorNama = row.getCell(3).value?.toString() || ""
      const sakitStr = row.getCell(4).value?.toString() || ""
      const izinStr = row.getCell(5).value?.toString() || ""
      const alphaStr = row.getCell(6).value?.toString() || ""

      // Skip empty rows
      if (!nis && !nama && !indikatorNama && !sakitStr && !izinStr && !alphaStr) {
        return
      }

      // Validate required fields
      if (!nis || !nama) {
        errors.push(`Baris ${rowNumber}: NIS dan Nama Siswa wajib diisi`)
        return
      }

      if (!indikatorNama) {
        errors.push(`Baris ${rowNumber}: Indikator Kehadiran wajib diisi`)
        return
      }

      // Find indicator by name
      const indikator = indikatorKehadiran.find(ind => ind.nama_indikator === indikatorNama)
      if (!indikator) {
        errors.push(`Baris ${rowNumber}: Indikator Kehadiran '${indikatorNama}' tidak ditemukan`)
        return
      }

      // Parse attendance values
      const sakit = sakitStr ? parseInt(sakitStr) : 0
      const izin = izinStr ? parseInt(izinStr) : 0
      const alpha = alphaStr ? parseInt(alphaStr) : 0

      if (isNaN(sakit) || isNaN(izin) || isNaN(alpha)) {
        errors.push(`Baris ${rowNumber}: Nilai Sakit, Izin, dan Alpha harus berupa angka`)
        return
      }

      if (sakit < 0 || izin < 0 || alpha < 0) {
        errors.push(`Baris ${rowNumber}: Nilai Sakit, Izin, dan Alpha tidak boleh negatif`)
        return
      }

      // Check if student already exists in import data
      let studentData = importData.find(item => item.nis === nis)
      if (!studentData) {
        studentData = {
          rowNumber,
          nis,
          nama,
          attendanceData: []
        }
        importData.push(studentData)
      }

      // Add attendance data for this indicator
      studentData.attendanceData.push({
        indikator_kehadiran_id: indikator.id,
        sakit,
        izin,
        alpha,
      })
    })

    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        error: "Validasi gagal",
        details: errors
      }, { status: 400 })
    }

    if (importData.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Tidak ada data yang valid untuk diimpor"
      }, { status: 400 })
    }

    // Process import in transaction
    const result = await prisma.$transaction(async (tx) => {
      let successCount = 0
      const errorDetails: string[] = []

      for (const data of importData) {
        try {
          // Find student by NIS
          const siswa = await tx.siswa.findUnique({
            where: { nis: data.nis },
            select: { id: true, nama: true }
          })

          if (!siswa) {
            errorDetails.push(`Baris ${data.rowNumber}: Siswa dengan NIS ${data.nis} tidak ditemukan`)
            continue
          }

          // Insert kehadiran data for each indicator
          for (const attendance of data.attendanceData) {
            await tx.kehadiran.upsert({
              where: {
                siswa_id_periode_ajaran_id_indikator_kehadiran_id: {
                  siswa_id: siswa.id,
                  periode_ajaran_id: periodeAjaran.id,
                  indikator_kehadiran_id: attendance.indikator_kehadiran_id,
                },
              },
              update: {
                sakit: attendance.sakit,
                izin: attendance.izin,
                alpha: attendance.alpha,
              },
              create: {
                siswa_id: siswa.id,
                periode_ajaran_id: periodeAjaran.id,
                indikator_kehadiran_id: attendance.indikator_kehadiran_id,
                sakit: attendance.sakit,
                izin: attendance.izin,
                alpha: attendance.alpha,
              },
            })
          }

          successCount++
        } catch (error: any) {
          if (error.code === 'P2002') {
            errorDetails.push(`Baris ${data.rowNumber}: Data kehadiran sudah ada untuk siswa ${data.nis}`)
          } else {
            errorDetails.push(`Baris ${data.rowNumber}: Error menyimpan data - ${error.message}`)
          }
        }
      }

      return { successCount, errorDetails }
    })

    return NextResponse.json({
      success: true,
      message: `Berhasil mengimpor ${result.successCount} data kehadiran`,
      details: result.errorDetails.length > 0 ? result.errorDetails : undefined
    })
  } catch (error) {
    console.error("Error importing kehadiran:", error)
    return NextResponse.json({
      success: false,
      error: "Gagal mengimpor data kehadiran"
    }, { status: 500 })
  }
}