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
      select: { id: true, master_tahun_ajaran_id: true, nama_ajaran: true }
    })

    if (!periodeAjaran) {
      return NextResponse.json({ success: false, error: "Periode ajaran tidak ditemukan" }, { status: 404 })
    }

    // Get kelas and curriculum
    const kelas = await prisma.kelas.findUnique({
      where: { id: parseInt(kelasId) },
      include: {
        tingkatan: true,
      },
    })

    if (!kelas) {
      return NextResponse.json({ success: false, error: "Kelas tidak ditemukan" }, { status: 404 })
    }

    // Get curriculum subjects
    const kurikulum = await prisma.kurikulum.findMany({
      where: {
        tingkatan_id: kelas.tingkatan?.id,
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

    const validKurikulum = kurikulum.filter((item) => item.mata_pelajaran !== null)

    // Parse Excel file
    const buffer = await file.arrayBuffer()
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)

    const worksheet = workbook.worksheets[0]
    if (!worksheet) {
      return NextResponse.json({ success: false, error: "File Excel tidak valid" }, { status: 400 })
    }

    // Get headers from first row
    const headers: string[] = []
    worksheet.getRow(1).eachCell((cell, colNumber) => {
      headers[colNumber - 1] = cell.value?.toString() || ""
    })

    // Validate required headers
    const requiredHeaders = ["NIS", "Nama Siswa", "Periode Ajaran", "Semester"]
    for (const required of requiredHeaders) {
      if (!headers.includes(required)) {
        return NextResponse.json({
          success: false,
          error: `Header '${required}' tidak ditemukan dalam file Excel`
        }, { status: 400 })
      }
    }

    // Process data rows
    const importData: any[] = []
    const errors: string[] = []

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return // Skip header row

      const rowData: any = {}
      headers.forEach((header, index) => {
        rowData[header] = row.getCell(index + 1).value?.toString() || ""
      })

      // Validate required fields
      if (!rowData["NIS"] || !rowData["Nama Siswa"]) {
        errors.push(`Baris ${rowNumber}: NIS dan Nama Siswa wajib diisi`)
        return
      }

      // Process subject scores
      const subjectScores: any[] = []
      validKurikulum.forEach((item) => {
        const subjectName = item.mata_pelajaran!.nama_mapel
        const score = rowData[subjectName]

        if (score && score.trim() !== "") {
          const scoreValue = parseFloat(score)
          if (isNaN(scoreValue) || scoreValue < 0 || scoreValue > 100) {
            errors.push(`Baris ${rowNumber}: Nilai untuk ${subjectName} harus antara 0-100`)
            return
          }

          subjectScores.push({
            mata_pelajaran_id: item.mata_pelajaran!.id,
            nilai: scoreValue,
          })
        }
      })

      if (subjectScores.length > 0) {
        importData.push({
          rowNumber,
          nis: rowData["NIS"],
          nama: rowData["Nama Siswa"],
          subjectScores,
        })
      }
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

          // Insert nilai ujian for each subject
          for (const subjectScore of data.subjectScores) {
            await tx.nilaiUjian.create({
              data: {
                siswa_id: siswa.id,
                mapel_id: subjectScore.mata_pelajaran_id,
                periode_ajaran_id: periodeAjaran.id,
                nilai_angka: subjectScore.nilai,
                predikat: null, // Will be calculated later if needed
              },
            })
          }

          successCount++
        } catch (error: any) {
          if (error.code === 'P2002') {
            errorDetails.push(`Baris ${data.rowNumber}: Data nilai ujian sudah ada untuk siswa ${data.nis}`)
          } else {
            errorDetails.push(`Baris ${data.rowNumber}: Error menyimpan data - ${error.message}`)
          }
        }
      }

      return { successCount, errorDetails }
    })

    return NextResponse.json({
      success: true,
      message: `Berhasil mengimpor ${result.successCount} data nilai ujian`,
      details: result.errorDetails.length > 0 ? result.errorDetails : undefined
    })
  } catch (error) {
    console.error("Error importing nilai ujian:", error)
    return NextResponse.json({
      success: false,
      error: "Gagal mengimpor data nilai ujian"
    }, { status: 500 })
  }
}