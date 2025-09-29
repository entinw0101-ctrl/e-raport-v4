import { NextRequest, NextResponse } from "next/server"
import ExcelJS from "exceljs"
import { prisma } from "@/lib/prisma"
import { generatePredikat } from "@/lib/utils"

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

    // Get all attitude indicators
    const indikatorSikap = await prisma.indikatorSikap.findMany({
      orderBy: {
        indikator: "asc",
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
    const nilaiHeader = worksheet.getCell('D1').value?.toString()
    const semesterHeader = worksheet.getCell('E1').value?.toString()
    const periodeHeader = worksheet.getCell('F1').value?.toString()

    if (nisHeader !== "NIS" || namaHeader !== "Nama Siswa" || indikatorHeader !== "Indikator Sikap" ||
        nilaiHeader !== "Nilai" || semesterHeader !== "Semester" || periodeHeader !== "Periode Ajaran") {
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
      const nilaiStr = row.getCell(4).value?.toString() || ""

      // Skip empty rows
      if (!nis && !nama && !indikatorNama && !nilaiStr) {
        return
      }

      // Validate required fields
      if (!nis || !nama) {
        errors.push(`Baris ${rowNumber}: NIS dan Nama Siswa wajib diisi`)
        return
      }

      if (!indikatorNama) {
        errors.push(`Baris ${rowNumber}: Indikator Sikap wajib diisi`)
        return
      }

      // Find indicator by name
      const indikator = indikatorSikap.find(ind => ind.indikator === indikatorNama)
      if (!indikator) {
        errors.push(`Baris ${rowNumber}: Indikator Sikap '${indikatorNama}' tidak ditemukan`)
        return
      }

      // Parse nilai
      const nilai = nilaiStr ? parseInt(nilaiStr) : 0

      if (isNaN(nilai) || nilai < 0) {
        errors.push(`Baris ${rowNumber}: Nilai harus berupa angka positif atau nol`)
        return
      }

      // Check if student already exists in import data
      let studentData = importData.find(item => item.nis === nis)
      if (!studentData) {
        studentData = {
          rowNumber,
          nis,
          nama,
          assessments: []
        }
        importData.push(studentData)
      }

      // Add assessment data for this indicator
      studentData.assessments.push({
        indikator_sikap_id: indikator.id,
        nilai,
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

    // Pre-load all unique lookups to avoid repeated queries
    const allNis = new Set<string>()
    importData.forEach(data => allNis.add(data.nis))

    // Load all students in parallel
    const siswaList = await prisma.siswa.findMany({
      where: { nis: { in: Array.from(allNis) }, status: "Aktif" },
      select: { id: true, nama: true, nis: true }
    })

    // Create lookup map
    const siswaMap = new Map(siswaList.map(s => [s.nis, s]))

    // Process upserts in parallel batches
    const errorDetails: string[] = []
    const upsertPromises: Promise<any>[] = []

    // Collect all valid upsert operations
    for (const data of importData) {
      const siswa = siswaMap.get(data.nis)

      if (!siswa) {
        errorDetails.push(`Baris ${data.rowNumber}: Siswa dengan NIS ${data.nis} tidak ditemukan`)
        continue
      }

      // Create upsert promises for each assessment
      for (const assessment of data.assessments) {
        const predikat = generatePredikat(assessment.nilai)

        const upsertPromise = prisma.penilaianSikap.upsert({
          where: {
            siswa_id_indikator_id_periode_ajaran_id: {
              siswa_id: siswa.id,
              indikator_id: assessment.indikator_sikap_id,
              periode_ajaran_id: periodeAjaran.id,
            },
          },
          update: {
            nilai: assessment.nilai,
            predikat: predikat,
          },
          create: {
            siswa_id: siswa.id,
            indikator_id: assessment.indikator_sikap_id,
            periode_ajaran_id: periodeAjaran.id,
            nilai: assessment.nilai,
            predikat: predikat,
          },
        }).catch((error: any) => {
          if (error.code === 'P2002') {
            errorDetails.push(`Baris ${data.rowNumber}: Data penilaian sikap sudah ada untuk siswa ${data.nis}`)
          } else {
            errorDetails.push(`Baris ${data.rowNumber}: Error menyimpan data - ${error.message}`)
          }
          return null // Return null for failed operations
        })

        upsertPromises.push(upsertPromise)
      }
    }

    // Execute all upserts in parallel
    if (upsertPromises.length > 0) {
      await Promise.all(upsertPromises)
    }

    const result = {
      successCount: upsertPromises.length - errorDetails.length,
      errorDetails
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil mengimpor ${result.successCount} data penilaian sikap`,
      details: result.errorDetails.length > 0 ? result.errorDetails : undefined
    })
  } catch (error) {
    console.error("Error importing penilaian sikap:", error)
    return NextResponse.json({
      success: false,
      error: "Gagal mengimpor data penilaian sikap"
    }, { status: 500 })
  }
}