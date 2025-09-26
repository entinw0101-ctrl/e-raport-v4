import { NextRequest, NextResponse } from "next/server"
import ExcelJS from "exceljs"
import { prisma } from "@/lib/prisma"

interface ValidationResult {
  sheet: string
  status: 'success' | 'warning' | 'error'
  message: string
  details?: string[]
  data?: any[]
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const kelasId = formData.get("kelas_id") as string
    const periodeAjaranId = formData.get("periode_ajaran_id") as string
    const shouldImport = formData.get("import") === "true"

    if (!file) {
      return NextResponse.json({ success: false, error: "File tidak ditemukan" }, { status: 400 })
    }

    if (!kelasId || !periodeAjaranId) {
      return NextResponse.json({ success: false, error: "Kelas ID dan Periode Ajaran ID diperlukan" }, { status: 400 })
    }

    // Validate file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json({ success: false, error: "File harus berformat Excel (.xlsx atau .xls)" }, { status: 400 })
    }

    // Read Excel file
    const buffer = await file.arrayBuffer()
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)

    // Validate required sheets
    const requiredSheets = ['Nilai Ujian', 'Nilai Hafalan', 'Kehadiran', 'Penilaian Sikap', 'Catatan Siswa']
    const existingSheets = workbook.worksheets.map(ws => ws.name)

    const validationResults: ValidationResult[] = []

    // Check if all required sheets exist
    for (const sheetName of requiredSheets) {
      if (!existingSheets.includes(sheetName)) {
        validationResults.push({
          sheet: sheetName,
          status: 'error',
          message: `Sheet "${sheetName}" tidak ditemukan dalam file Excel`,
        })
      } else {
        validationResults.push({
          sheet: sheetName,
          status: 'success',
          message: `Sheet "${sheetName}" ditemukan`,
        })
      }
    }

    // If any required sheets are missing, return early
    if (validationResults.some(r => r.status === 'error')) {
      return NextResponse.json({
        success: true,
        validation: validationResults,
        message: "Beberapa sheet yang diperlukan tidak ditemukan"
      })
    }

    // Validate each sheet's data
    const nilaiUjianValidation = await validateNilaiUjianSheet(workbook.getWorksheet('Nilai Ujian'), kelasId, periodeAjaranId)
    const nilaiHafalanValidation = await validateNilaiHafalanSheet(workbook.getWorksheet('Nilai Hafalan'), kelasId, periodeAjaranId)
    const kehadiranValidation = await validateKehadiranSheet(workbook.getWorksheet('Kehadiran'), kelasId, periodeAjaranId)
    const penilaianSikapValidation = await validatePenilaianSikapSheet(workbook.getWorksheet('Penilaian Sikap'), kelasId, periodeAjaranId)
    const catatanSiswaValidation = await validateCatatanSiswaSheet(workbook.getWorksheet('Catatan Siswa'), kelasId, periodeAjaranId)

    // Collect validated data from all sheets
    const validatedData = {
      nilaiUjian: nilaiUjianValidation.data || [],
      nilaiHafalan: nilaiHafalanValidation.data || [],
      kehadiran: kehadiranValidation.data || [],
      penilaianSikap: penilaianSikapValidation.data || [],
      catatanSiswa: catatanSiswaValidation.data || []
    }

    // Combine all validation results
    const allValidations = [
      ...validationResults,
      nilaiUjianValidation,
      nilaiHafalanValidation,
      kehadiranValidation,
      penilaianSikapValidation,
      catatanSiswaValidation
    ]

    // Check if there are any errors
    const hasErrors = allValidations.some(r => r.status === 'error')

    let importResult = null
    if (!hasErrors && shouldImport) {
      // Perform import if validation passed and import is requested
      importResult = await performImport(validatedData, kelasId, periodeAjaranId)
    }

    return NextResponse.json({
      success: true,
      validation: allValidations,
      message: hasErrors ? "Terdapat error dalam validasi data" : (shouldImport ? "Data berhasil diimport" : "Semua data berhasil divalidasi"),
      canProceed: !hasErrors,
      imported: shouldImport && !hasErrors,
      importResult: importResult
    })

  } catch (error) {
    console.error("Error processing combined template:", error)
    return NextResponse.json({ success: false, error: "Gagal memproses file template" }, { status: 500 })
  }
}

// Validation functions for each sheet
async function validateNilaiUjianSheet(worksheet: ExcelJS.Worksheet | undefined, kelasId: string, periodeAjaranId: string): Promise<ValidationResult> {
  if (!worksheet) {
    return { sheet: 'Nilai Ujian', status: 'error', message: 'Sheet tidak ditemukan' }
  }

  try {
    const rows = worksheet.getSheetValues()
    const dataRows = rows.slice(2) // Skip header row
    const validatedData: any[] = []

    if (dataRows.length === 0) {
      return { sheet: 'Nilai Ujian', status: 'warning', message: 'Tidak ada data nilai ujian', data: [] }
    }

    const details: string[] = []
    let validCount = 0

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i] as any[]
      if (!row || row.length < 5) continue

      const nis = row[1] // Column B
      const nama = row[2] // Column C
      const mataPelajaran = row[3] // Column D
      const nilai = row[4] // Column E

      if (!nis || !mataPelajaran) continue

      // Validate nilai range (0-100)
      if (nilai !== null && nilai !== undefined && nilai !== '') {
        const nilaiNum = parseFloat(nilai)
        if (isNaN(nilaiNum) || nilaiNum < 0 || nilaiNum > 100) {
          details.push(`Baris ${i + 2}: Nilai untuk ${mataPelajaran} harus antara 0-100`)
        } else {
          validCount++
          validatedData.push({
            nis,
            nama,
            mataPelajaran,
            nilai: nilaiNum
          })
        }
      }
    }

    return {
      sheet: 'Nilai Ujian',
      status: details.length > 0 ? 'warning' : 'success',
      message: `Ditemukan ${validCount} data nilai ujian valid`,
      details: details.length > 0 ? details : undefined,
      data: validatedData
    }

  } catch (error) {
    return { sheet: 'Nilai Ujian', status: 'error', message: 'Error memproses data nilai ujian' }
  }
}

// Import function to save validated data to database
async function performImport(validatedData: any, kelasId: string, periodeAjaranId: string) {
  const results = {
    nilaiUjian: { inserted: 0, updated: 0, errors: 0 },
    nilaiHafalan: { inserted: 0, updated: 0, errors: 0 },
    kehadiran: { inserted: 0, updated: 0, errors: 0 },
    penilaianSikap: { inserted: 0, updated: 0, errors: 0 },
    catatanSiswa: { inserted: 0, updated: 0, errors: 0 }
  }

  try {
    // Import Nilai Ujian
    for (const item of validatedData.nilaiUjian || []) {
      try {
        const siswa = await prisma.siswa.findFirst({ where: { nis: item.nis } })
        const mapel = await prisma.mataPelajaran.findFirst({ where: { nama_mapel: item.mataPelajaran } })

        if (siswa && mapel) {
          const existing = await prisma.nilaiUjian.findUnique({
            where: {
              siswa_id_mapel_id_periode_ajaran_id: {
                siswa_id: siswa.id,
                mapel_id: mapel.id,
                periode_ajaran_id: parseInt(periodeAjaranId)
              }
            }
          })

          if (existing) {
            await prisma.nilaiUjian.update({
              where: {
                siswa_id_mapel_id_periode_ajaran_id: {
                  siswa_id: siswa.id,
                  mapel_id: mapel.id,
                  periode_ajaran_id: parseInt(periodeAjaranId)
                }
              },
              data: {
                nilai_angka: item.nilai,
                predikat: item.nilai >= 90 ? 'A' : item.nilai >= 80 ? 'B' : item.nilai >= 70 ? 'C' : 'D'
              }
            })
            results.nilaiUjian.updated++
          } else {
            await prisma.nilaiUjian.create({
              data: {
                siswa_id: siswa.id,
                mapel_id: mapel.id,
                periode_ajaran_id: parseInt(periodeAjaranId),
                nilai_angka: item.nilai,
                predikat: item.nilai >= 90 ? 'A' : item.nilai >= 80 ? 'B' : item.nilai >= 70 ? 'C' : 'D'
              }
            })
            results.nilaiUjian.inserted++
          }
        } else {
          results.nilaiUjian.errors++
        }
      } catch (error) {
        results.nilaiUjian.errors++
      }
    }

    // Import Nilai Hafalan
    for (const item of validatedData.nilaiHafalan || []) {
      try {
        const siswa = await prisma.siswa.findFirst({ where: { nis: item.nis } })
        const mapel = await prisma.mataPelajaran.findFirst({ where: { nama_mapel: item.mataPelajaran } })

        if (siswa && mapel) {
          const existing = await prisma.nilaiHafalan.findUnique({
            where: {
              siswa_id_mapel_id_periode_ajaran_id: {
                siswa_id: siswa.id,
                mapel_id: mapel.id,
                periode_ajaran_id: parseInt(periodeAjaranId)
              }
            }
          })

          if (existing) {
            await prisma.nilaiHafalan.update({
              where: {
                siswa_id_mapel_id_periode_ajaran_id: {
                  siswa_id: siswa.id,
                  mapel_id: mapel.id,
                  periode_ajaran_id: parseInt(periodeAjaranId)
                }
              },
              data: {
                target_hafalan: item.targetHafalan,
                predikat: item.predikat
              }
            })
            results.nilaiHafalan.updated++
          } else {
            await prisma.nilaiHafalan.create({
              data: {
                siswa_id: siswa.id,
                mapel_id: mapel.id,
                periode_ajaran_id: parseInt(periodeAjaranId),
                target_hafalan: item.targetHafalan,
                predikat: item.predikat
              }
            })
            results.nilaiHafalan.inserted++
          }
        } else {
          results.nilaiHafalan.errors++
        }
      } catch (error) {
        results.nilaiHafalan.errors++
      }
    }

    // Import Kehadiran
    for (const item of validatedData.kehadiran || []) {
      try {
        const siswa = await prisma.siswa.findFirst({ where: { nis: item.nis } })
        const indikator = await prisma.indikatorKehadiran.findFirst({ where: { nama_indikator: item.indikator } })

        if (siswa && indikator) {
          const existing = await prisma.kehadiran.findUnique({
            where: {
              siswa_id_periode_ajaran_id_indikator_kehadiran_id: {
                siswa_id: siswa.id,
                periode_ajaran_id: parseInt(periodeAjaranId),
                indikator_kehadiran_id: indikator.id
              }
            }
          })

          if (existing) {
            await prisma.kehadiran.update({
              where: {
                siswa_id_periode_ajaran_id_indikator_kehadiran_id: {
                  siswa_id: siswa.id,
                  periode_ajaran_id: parseInt(periodeAjaranId),
                  indikator_kehadiran_id: indikator.id
                }
              },
              data: {
                sakit: parseInt(item.sakit) || 0,
                izin: parseInt(item.izin) || 0,
                alpha: parseInt(item.alpha) || 0
              }
            })
            results.kehadiran.updated++
          } else {
            await prisma.kehadiran.create({
              data: {
                siswa_id: siswa.id,
                periode_ajaran_id: parseInt(periodeAjaranId),
                indikator_kehadiran_id: indikator.id,
                sakit: parseInt(item.sakit) || 0,
                izin: parseInt(item.izin) || 0,
                alpha: parseInt(item.alpha) || 0
              }
            })
            results.kehadiran.inserted++
          }
        } else {
          results.kehadiran.errors++
        }
      } catch (error) {
        results.kehadiran.errors++
      }
    }

    // Import Penilaian Sikap
    for (const item of validatedData.penilaianSikap || []) {
      try {
        const siswa = await prisma.siswa.findFirst({ where: { nis: item.nis } })
        const indikator = await prisma.indikatorSikap.findFirst({ where: { indikator: item.indikator } })

        if (siswa && indikator) {
          const existing = await prisma.penilaianSikap.findUnique({
            where: {
              siswa_id_indikator_id_periode_ajaran_id: {
                siswa_id: siswa.id,
                indikator_id: indikator.id,
                periode_ajaran_id: parseInt(periodeAjaranId)
              }
            }
          })

          if (existing) {
            await prisma.penilaianSikap.update({
              where: {
                siswa_id_indikator_id_periode_ajaran_id: {
                  siswa_id: siswa.id,
                  indikator_id: indikator.id,
                  periode_ajaran_id: parseInt(periodeAjaranId)
                }
              },
              data: {
                nilai: parseInt(item.nilai)
              }
            })
            results.penilaianSikap.updated++
          } else {
            await prisma.penilaianSikap.create({
              data: {
                siswa_id: siswa.id,
                indikator_id: indikator.id,
                periode_ajaran_id: parseInt(periodeAjaranId),
                nilai: parseInt(item.nilai)
              }
            })
            results.penilaianSikap.inserted++
          }
        } else {
          results.penilaianSikap.errors++
        }
      } catch (error) {
        results.penilaianSikap.errors++
      }
    }

    // Import Catatan Siswa
    for (const item of validatedData.catatanSiswa || []) {
      try {
        const siswa = await prisma.siswa.findFirst({ where: { nis: item.nis } })

        if (siswa) {
          const existing = await prisma.catatanSiswa.findUnique({
            where: {
              siswa_id_periode_ajaran_id: {
                siswa_id: siswa.id,
                periode_ajaran_id: parseInt(periodeAjaranId)
              }
            }
          })

          if (existing) {
            await prisma.catatanSiswa.update({
              where: {
                siswa_id_periode_ajaran_id: {
                  siswa_id: siswa.id,
                  periode_ajaran_id: parseInt(periodeAjaranId)
                }
              },
              data: {
                catatan_sikap: item.catatanSikap,
                catatan_akademik: item.catatanAkademik
              }
            })
            results.catatanSiswa.updated++
          } else {
            await prisma.catatanSiswa.create({
              data: {
                siswa_id: siswa.id,
                periode_ajaran_id: parseInt(periodeAjaranId),
                catatan_sikap: item.catatanSikap,
                catatan_akademik: item.catatanAkademik
              }
            })
            results.catatanSiswa.inserted++
          }
        } else {
          results.catatanSiswa.errors++
        }
      } catch (error) {
        results.catatanSiswa.errors++
      }
    }

    return results
  } catch (error) {
    console.error('Import error:', error)
    throw error
  }
}

async function validateNilaiHafalanSheet(worksheet: ExcelJS.Worksheet | undefined, kelasId: string, periodeAjaranId: string): Promise<ValidationResult> {
  if (!worksheet) {
    return { sheet: 'Nilai Hafalan', status: 'error', message: 'Sheet tidak ditemukan' }
  }

  try {
    const rows = worksheet.getSheetValues()
    const dataRows = rows.slice(2) // Skip header row
    const validatedData: any[] = []

    if (dataRows.length === 0) {
      return { sheet: 'Nilai Hafalan', status: 'warning', message: 'Tidak ada data nilai hafalan', data: [] }
    }

    const details: string[] = []
    let validCount = 0
    const validPredikat = ['Tercapai', 'Tidak Tercapai']

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i] as any[]
      if (!row || row.length < 7) continue

      const nis = row[1] // Column B
      const nama = row[2] // Column C
      const mataPelajaran = row[3] // Column D
      const kitab = row[4] // Column E
      const targetHafalan = row[5] // Column F
      const predikat = row[6] // Column G

      if (!nis || !mataPelajaran) continue

      // Validate predikat
      if (predikat && !validPredikat.includes(predikat)) {
        details.push(`Baris ${i + 2}: Predikat "${predikat}" tidak valid. Harus "Tercapai" atau "Tidak Tercapai"`)
      } else {
        validCount++
        validatedData.push({
          nis,
          nama,
          mataPelajaran,
          kitab,
          targetHafalan,
          predikat
        })
      }
    }

    return {
      sheet: 'Nilai Hafalan',
      status: details.length > 0 ? 'warning' : 'success',
      message: `Ditemukan ${validCount} data nilai hafalan valid`,
      details: details.length > 0 ? details : undefined,
      data: validatedData
    }

  } catch (error) {
    return { sheet: 'Nilai Hafalan', status: 'error', message: 'Error memproses data nilai hafalan' }
  }
}

async function validateKehadiranSheet(worksheet: ExcelJS.Worksheet | undefined, kelasId: string, periodeAjaranId: string): Promise<ValidationResult> {
  if (!worksheet) {
    return { sheet: 'Kehadiran', status: 'error', message: 'Sheet tidak ditemukan' }
  }

  try {
    const rows = worksheet.getSheetValues()
    const dataRows = rows.slice(2) // Skip header row
    const validatedData: any[] = []

    if (dataRows.length === 0) {
      return { sheet: 'Kehadiran', status: 'warning', message: 'Tidak ada data kehadiran', data: [] }
    }

    const details: string[] = []
    let validCount = 0

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i] as any[]
      if (!row || row.length < 8) continue

      const nis = row[1] // Column B
      const nama = row[2] // Column C
      const indikator = row[3] // Column D
      const sakit = row[4] // Column E
      const izin = row[5] // Column F
      const alpha = row[6] // Column G

      if (!nis || !indikator) continue

      // Validate numeric values
      const sakitNum = parseInt(sakit || 0)
      const izinNum = parseInt(izin || 0)
      const alphaNum = parseInt(alpha || 0)

      if (isNaN(sakitNum) || sakitNum < 0) {
        details.push(`Baris ${i + 2}: Jumlah sakit harus angka positif`)
      } else if (isNaN(izinNum) || izinNum < 0) {
        details.push(`Baris ${i + 2}: Jumlah izin harus angka positif`)
      } else if (isNaN(alphaNum) || alphaNum < 0) {
        details.push(`Baris ${i + 2}: Jumlah alpha harus angka positif`)
      } else {
        validCount++
        validatedData.push({
          nis,
          nama,
          indikator,
          sakit: sakitNum,
          izin: izinNum,
          alpha: alphaNum
        })
      }
    }

    return {
      sheet: 'Kehadiran',
      status: details.length > 0 ? 'warning' : 'success',
      message: `Ditemukan ${validCount} data kehadiran valid`,
      details: details.length > 0 ? details : undefined,
      data: validatedData
    }

  } catch (error) {
    return { sheet: 'Kehadiran', status: 'error', message: 'Error memproses data kehadiran' }
  }
}

async function validatePenilaianSikapSheet(worksheet: ExcelJS.Worksheet | undefined, kelasId: string, periodeAjaranId: string): Promise<ValidationResult> {
  if (!worksheet) {
    return { sheet: 'Penilaian Sikap', status: 'error', message: 'Sheet tidak ditemukan' }
  }

  try {
    const rows = worksheet.getSheetValues()
    const dataRows = rows.slice(2) // Skip header row
    const validatedData: any[] = []

    if (dataRows.length === 0) {
      return { sheet: 'Penilaian Sikap', status: 'warning', message: 'Tidak ada data penilaian sikap', data: [] }
    }

    const details: string[] = []
    let validCount = 0

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i] as any[]
      if (!row || row.length < 6) continue

      const nis = row[1] // Column B
      const nama = row[2] // Column C
      const jenisSikap = row[3] // Column D
      const indikator = row[4] // Column E
      const nilai = row[5] // Column F

      if (!nis || !jenisSikap || !indikator) continue

      // Validate nilai range (1-100 for sikap)
      if (nilai !== null && nilai !== undefined && nilai !== '') {
        const nilaiNum = parseInt(nilai)
        if (isNaN(nilaiNum) || nilaiNum < 1 || nilaiNum > 100) {
          details.push(`Baris ${i + 2}: Nilai sikap harus antara 1-100`)
        } else {
          validCount++
          validatedData.push({
            nis,
            nama,
            jenisSikap,
            indikator,
            nilai: nilaiNum
          })
        }
      }
    }

    return {
      sheet: 'Penilaian Sikap',
      status: details.length > 0 ? 'warning' : 'success',
      message: `Ditemukan ${validCount} data penilaian sikap valid`,
      details: details.length > 0 ? details : undefined,
      data: validatedData
    }

  } catch (error) {
    return { sheet: 'Penilaian Sikap', status: 'error', message: 'Error memproses data penilaian sikap' }
  }
}

async function validateCatatanSiswaSheet(worksheet: ExcelJS.Worksheet | undefined, kelasId: string, periodeAjaranId: string): Promise<ValidationResult> {
  if (!worksheet) {
    return { sheet: 'Catatan Siswa', status: 'error', message: 'Sheet tidak ditemukan' }
  }

  try {
    const rows = worksheet.getSheetValues()
    const dataRows = rows.slice(2) // Skip header row
    const validatedData: any[] = []

    if (dataRows.length === 0) {
      return { sheet: 'Catatan Siswa', status: 'warning', message: 'Tidak ada data catatan siswa', data: [] }
    }

    const details: string[] = []
    let validCount = 0

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i] as any[]
      if (!row || row.length < 4) continue // Adjusted length check

      const nis = row[1] // Column B
      const nama = row[2] // Column C
      const catatanSikap = row[3] // Column D
      const catatanAkademik = row[4] // Column E

      if (!nis) continue

      // Catatan fields are optional, just count as valid if NIS exists
      validCount++
      validatedData.push({
        nis,
        nama,
        catatanSikap: catatanSikap || null,
        catatanAkademik: catatanAkademik || null
      })
    }

    return {
      sheet: 'Catatan Siswa',
      status: 'success', // Status is always success if data is found, as fields are optional
      message: `Ditemukan ${validCount} data catatan siswa`,
      details: undefined, // No specific validation details needed here
      data: validatedData
    }

  } catch (error) {
    return { sheet: 'Catatan Siswa', status: 'error', message: 'Error memproses data catatan siswa' }
  }
}