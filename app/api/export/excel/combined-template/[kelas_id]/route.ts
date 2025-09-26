import { NextRequest, NextResponse } from "next/server"
import ExcelJS from "exceljs"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest, { params }: { params: { kelas_id: string } }) {
  try {
    const kelasId = parseInt(params.kelas_id)
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

    // Get students currently in this class
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

    // Create workbook
    const workbook = new ExcelJS.Workbook()

    // ==========================================
    // SHEET 1: NILAI UJIAN
    // ==========================================
    await createNilaiUjianSheet(workbook, kelas, periodeAjaran, siswaInKelas)

    // ==========================================
    // SHEET 2: NILAI HAFALAN
    // ==========================================
    await createNilaiHafalanSheet(workbook, kelas, periodeAjaran, siswaInKelas)

    // ==========================================
    // SHEET 3: KEHADIRAN
    // ==========================================
    await createKehadiranSheet(workbook, kelas, periodeAjaran, siswaInKelas)

    // ==========================================
    // SHEET 4: PENILAIAN SIKAP
    // ==========================================
    await createPenilaianSikapSheet(workbook, kelas, periodeAjaran, siswaInKelas)

    // ==========================================
    // SHEET 5: CATATAN SISWA
    // ==========================================
    await createCatatanSiswaSheet(workbook, kelas, periodeAjaran, siswaInKelas)

    // Set response headers
    const buffer = await workbook.xlsx.writeBuffer()

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=template_lengkap_${kelas.nama_kelas}_semester_${periodeAjaran.semester === "SATU" ? "1" : "2"}_${new Date().toISOString().split("T")[0]}.xlsx`,
      },
    })
  } catch (error) {
    console.error("Error generating combined template:", error)
    return NextResponse.json({ success: false, error: "Gagal membuat template gabungan" }, { status: 500 })
  }
}

// Helper function to create Nilai Ujian sheet
async function createNilaiUjianSheet(workbook: ExcelJS.Workbook, kelas: any, periodeAjaran: any, siswaInKelas: any[]) {
  const worksheet = workbook.addWorksheet("Nilai Ujian")

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

  const validKurikulum = kurikulum.filter((item) => item.mata_pelajaran !== null)

  // Define columns
  const columns = [
    { header: "NIS", key: "nis", width: 15 },
    { header: "Nama Siswa", key: "nama", width: 25 },
    { header: "Mata Pelajaran", key: "mata_pelajaran", width: 20 },
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
      fgColor: { argb: "FF0066CC" },
    }
    cell.font = {
      color: { argb: "FFFFFFFF" },
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
  let currentRow = 2
  siswaInKelas.forEach((siswa) => {
    const startRow = currentRow
    validKurikulum.forEach((item, subjectIndex) => {
      const isFirstSubject = subjectIndex === 0

      const row = worksheet.addRow({
        nis: isFirstSubject ? siswa.nis : "",
        nama: isFirstSubject ? siswa.nama : "",
        mata_pelajaran: item.mata_pelajaran!.nama_mapel,
        nilai: "",
        semester: isFirstSubject ? `Semester ${periodeAjaran.semester === "SATU" ? "1" : "2"}` : "",
        periode_ajaran: isFirstSubject ? periodeAjaran.nama_ajaran : "",
      })

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
      const endRow = currentRow - 1

      worksheet.mergeCells(`A${startRow}:A${endRow}`)
      worksheet.mergeCells(`B${startRow}:B${endRow}`)
      worksheet.mergeCells(`E${startRow}:E${endRow}`)
      worksheet.mergeCells(`F${startRow}:F${endRow}`)

      worksheet.getCell(`A${startRow}`).alignment = { horizontal: 'center', vertical: 'middle' }
      worksheet.getCell(`B${startRow}`).alignment = { horizontal: 'center', vertical: 'middle' }
      worksheet.getCell(`E${startRow}`).alignment = { horizontal: 'center', vertical: 'middle' }
      worksheet.getCell(`F${startRow}`).alignment = { horizontal: 'center', vertical: 'middle' }
    }
  })
}

// Helper function to create Nilai Hafalan sheet
async function createNilaiHafalanSheet(workbook: ExcelJS.Workbook, kelas: any, periodeAjaran: any, siswaInKelas: any[]) {
  const worksheet = workbook.addWorksheet("Nilai Hafalan")

  // Get curriculum subjects for this level (only Hafalan type)
  const kurikulum = await prisma.kurikulum.findMany({
    where: {
      tingkatan_id: kelas.tingkatan.id,
      mata_pelajaran: {
        jenis: "Hafalan",
      },
    },
    include: {
      kitab: {
        select: {
          id: true,
          nama_kitab: true,
        },
      },
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

  // Define columns
  const columns = [
    { header: "NIS", key: "nis", width: 15 },
    { header: "Nama Siswa", key: "nama", width: 25 },
    { header: "Mata Pelajaran", key: "mata_pelajaran", width: 20 },
    { header: "Kitab", key: "kitab", width: 20 },
    { header: "Target Hafalan", key: "target_hafalan", width: 25 },
    { header: "Predikat", key: "predikat", width: 15 },
    { header: "Periode Ajaran", key: "periode_ajaran", width: 20 },
    { header: "Semester", key: "semester", width: 10 },
  ]

  worksheet.columns = columns

  // Style headers
  worksheet.getRow(1).eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0066CC" },
    }
    cell.font = {
      color: { argb: "FFFFFFFF" },
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

  // Add data rows for each student and each hafalan subject
  let currentRow = 2
  siswaInKelas.forEach((siswa) => {
    const startRow = currentRow
    validKurikulum.forEach((item, subjectIndex) => {
      const isFirstSubject = subjectIndex === 0

      const row = {
        nis: isFirstSubject ? siswa.nis : "",
        nama: isFirstSubject ? siswa.nama : "",
        mata_pelajaran: item.mata_pelajaran!.nama_mapel,
        kitab: item.kitab?.nama_kitab || "",
        target_hafalan: item.batas_hafalan || "",
        predikat: "",
        periode_ajaran: isFirstSubject ? periodeAjaran.nama_ajaran : "",
        semester: isFirstSubject ? `Semester ${periodeAjaran.semester === "SATU" ? "1" : "2"}` : "",
      }

      const addedRow = worksheet.addRow(row)
      addedRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
      })

      currentRow++
    })

    // Merge cells for NIS, Nama, Periode Ajaran, and Semester
    if (validKurikulum.length > 1) {
      const endRow = currentRow - 1

      worksheet.mergeCells(`A${startRow}:A${endRow}`)
      worksheet.mergeCells(`B${startRow}:B${endRow}`)
      // ✅ PERBAIKAN: Kolom G (Periode) dan H (Semester) yang digabung
      worksheet.mergeCells(`G${startRow}:G${endRow}`)
      worksheet.mergeCells(`H${startRow}:H${endRow}`)

      worksheet.getCell(`A${startRow}`).alignment = { horizontal: 'center', vertical: 'middle' }
      worksheet.getCell(`B${startRow}`).alignment = { horizontal: 'center', vertical: 'middle' }
      worksheet.getCell(`G${startRow}`).alignment = { horizontal: 'center', vertical: 'middle' }
      worksheet.getCell(`H${startRow}`).alignment = { horizontal: 'center', vertical: 'middle' }
    }
  })

  // Add dropdown validation for Predikat column (Column F)
  const predikatList = ["Tercapai", "Tidak Tercapai"];
  const predikatFormula = `"${predikatList.join(",")}"`;

  // Apply data validation to each cell in the Predikat column (F) starting from row 2
  for (let i = 2; i <= currentRow - 1; i++) {
    const cell = worksheet.getCell(`F${i}`);
    cell.dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [predikatFormula],
      showErrorMessage: true,
      errorTitle: 'Predikat Tidak Valid',
      error: `Harap pilih salah satu dari: ${predikatList.join(", ")}`
    };
  }
}

// Helper function to create Kehadiran sheet
async function createKehadiranSheet(workbook: ExcelJS.Workbook, kelas: any, periodeAjaran: any, siswaInKelas: any[]) {
  const worksheet = workbook.addWorksheet("Kehadiran")

  // Get all attendance indicators
  const indikatorKehadiran = await prisma.indikatorKehadiran.findMany({
    orderBy: {
      nama_indikator: "asc",
    },
  })

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
      fgColor: { argb: "FF0066CC" },
    }
    cell.font = {
      color: { argb: "FFFFFFFF" },
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
  let currentRow = 2
  siswaInKelas.forEach((siswa) => {
    const startRow = currentRow
    indikatorKehadiran.forEach((indikator, indicatorIndex) => {
      const isFirstIndicator = indicatorIndex === 0

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
      const endRow = currentRow - 1

      worksheet.mergeCells(`A${startRow}:A${endRow}`)
      worksheet.mergeCells(`B${startRow}:B${endRow}`)
      worksheet.mergeCells(`G${startRow}:G${endRow}`)
      worksheet.mergeCells(`H${startRow}:H${endRow}`)

      worksheet.getCell(`A${startRow}`).alignment = { horizontal: 'center', vertical: 'middle' }
      worksheet.getCell(`B${startRow}`).alignment = { horizontal: 'center', vertical: 'middle' }
      worksheet.getCell(`G${startRow}`).alignment = { horizontal: 'center', vertical: 'middle' }
      worksheet.getCell(`H${startRow}`).alignment = { horizontal: 'center', vertical: 'middle' }
    }
  })
}

// Helper function to create Penilaian Sikap sheet
async function createPenilaianSikapSheet(workbook: ExcelJS.Workbook, kelas: any, periodeAjaran: any, siswaInKelas: any[]) {
  const worksheet = workbook.addWorksheet("Penilaian Sikap")

  // Get all sikap indicators
  const indikatorSikap = await prisma.indikatorSikap.findMany({
    where: {
      is_active: true,
    },
    orderBy: [
      { jenis_sikap: "asc" },
      { indikator: "asc" },
    ],
  })

  // Define columns
  const columns = [
    { header: "NIS", key: "nis", width: 15 },
    { header: "Nama Siswa", key: "nama", width: 25 },
    { header: "Jenis Sikap", key: "jenis_sikap", width: 15 },
    { header: "Indikator Sikap", key: "indikator", width: 30 },
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
      fgColor: { argb: "FF0066CC" },
    }
    cell.font = {
      color: { argb: "FFFFFFFF" },
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
  let currentRow = 2
  siswaInKelas.forEach((siswa) => {
    const startRow = currentRow
    indikatorSikap.forEach((indikator, indicatorIndex) => {
      const isFirstIndicator = indicatorIndex === 0

      const row = worksheet.addRow({
        nis: isFirstIndicator ? siswa.nis : "",
        nama: isFirstIndicator ? siswa.nama : "",
        jenis_sikap: indikator.jenis_sikap,
        indikator: indikator.indikator,
        nilai: "",
        semester: isFirstIndicator ? `Semester ${periodeAjaran.semester === "SATU" ? "1" : "2"}` : "",
        periode_ajaran: isFirstIndicator ? periodeAjaran.nama_ajaran : "",
      })

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
    if (indikatorSikap.length > 1) {
      const endRow = currentRow - 1

      worksheet.mergeCells(`A${startRow}:A${endRow}`)
      worksheet.mergeCells(`B${startRow}:B${endRow}`)
      // ✅ PERBAIKAN: Kolom F (Semester) dan G (Periode) yang digabung
      worksheet.mergeCells(`F${startRow}:F${endRow}`)
      worksheet.mergeCells(`G${startRow}:G${endRow}`)

      worksheet.getCell(`A${startRow}`).alignment = { horizontal: 'center', vertical: 'middle' }
      worksheet.getCell(`B${startRow}`).alignment = { horizontal: 'center', vertical: 'middle' }
      worksheet.getCell(`F${startRow}`).alignment = { horizontal: 'center', vertical: 'middle' }
      worksheet.getCell(`G${startRow}`).alignment = { horizontal: 'center', vertical: 'middle' }
    }
  })
}

// Helper function to create Catatan Siswa sheet
async function createCatatanSiswaSheet(workbook: ExcelJS.Workbook, kelas: any, periodeAjaran: any, siswaInKelas: any[]) {
  const worksheet = workbook.addWorksheet("Catatan Siswa")

  // Define columns
  const columns = [
    { header: "NIS", key: "nis", width: 15 },
    { header: "Nama Siswa", key: "nama", width: 25 },
    { header: "Catatan Sikap", key: "catatan_sikap", width: 40 },
    { header: "Catatan Akademik", key: "catatan_akademik", width: 40 },
    { header: "Semester", key: "semester", width: 12 },
    { header: "Periode Ajaran", key: "periode_ajaran", width: 20 },
  ]

  worksheet.columns = columns

  // Style headers
  worksheet.getRow(1).eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0066CC" },
    }
    cell.font = {
      color: { argb: "FFFFFFFF" },
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
    const row = {
      nis: siswa.nis,
      nama: siswa.nama,
      catatan_sikap: "",
      catatan_akademik: "",
      semester: `Semester ${periodeAjaran.semester === "SATU" ? "1" : "2"}`,
      periode_ajaran: periodeAjaran.nama_ajaran,
    }

    const addedRow = worksheet.addRow(row)
    addedRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
    })
  })
}