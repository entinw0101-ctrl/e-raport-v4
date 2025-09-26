import { NextRequest, NextResponse } from "next/server"
import ExcelJS from "exceljs"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const periodeAjaranId = formData.get("periode_ajaran_id") as string

    if (!file) {
      return NextResponse.json({ success: false, error: "File tidak ditemukan" }, { status: 400 })
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
    const catatanSikapHeader = worksheet.getCell('C1').value?.toString()
    const catatanAkademikHeader = worksheet.getCell('D1').value?.toString()

    if (nisHeader !== "NIS" || namaHeader !== "Nama Siswa" ||
        catatanSikapHeader !== "Catatan Sikap" || catatanAkademikHeader !== "Catatan Akademik") {
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
      const catatanSikap = row.getCell(3).value?.toString() || ""
      const catatanAkademik = row.getCell(4).value?.toString() || ""

      // Skip empty rows
      if (!nis && !nama && !catatanSikap && !catatanAkademik) {
        return
      }

      // Validate required fields
      if (!nis || !nama) {
        errors.push(`Baris ${rowNumber}: NIS dan Nama Siswa wajib diisi`)
        return
      }

      // Check if student exists
      importData.push({
        rowNumber,
        nis,
        nama,
        catatan_sikap: catatanSikap,
        catatan_akademik: catatanAkademik,
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

          // Upsert catatan siswa
          await tx.catatanSiswa.upsert({
            where: {
              siswa_id_periode_ajaran_id: {
                siswa_id: siswa.id,
                periode_ajaran_id: periodeAjaran.id,
              },
            },
            update: {
              catatan_sikap: data.catatan_sikap || null,
              catatan_akademik: data.catatan_akademik || null,
            },
            create: {
              siswa_id: siswa.id,
              periode_ajaran_id: periodeAjaran.id,
              catatan_sikap: data.catatan_sikap || null,
              catatan_akademik: data.catatan_akademik || null,
            },
          })

          successCount++
        } catch (error: any) {
          errorDetails.push(`Baris ${data.rowNumber}: Error menyimpan data - ${error.message}`)
        }
      }

      return { successCount, errorDetails }
    })

    return NextResponse.json({
      success: true,
      message: `Berhasil mengimpor ${result.successCount} data catatan siswa`,
      details: result.errorDetails.length > 0 ? result.errorDetails : undefined
    })
  } catch (error) {
    console.error("Error importing catatan siswa:", error)
    return NextResponse.json({
      success: false,
      error: "Gagal mengimpor data catatan siswa"
    }, { status: 500 })
  }
}