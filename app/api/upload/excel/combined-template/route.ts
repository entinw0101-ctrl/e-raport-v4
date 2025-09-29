import { NextRequest, NextResponse } from "next/server"
import ExcelJS from "exceljs"
import { prisma } from "@/lib/prisma"
import { generatePredikat } from "@/lib/utils"
import { getPredicate } from "@/lib/raport-utils"
import { PredikatHafalan } from "@prisma/client"

interface ValidationResult {
  sheet: string
  status: 'success' | 'warning' | 'error'
  message: string
  details?: string[]
  data?: any[]
}

export async function POST(request: NextRequest) {
  console.time('Total processing time')
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
    console.time('Excel file loading')
    const buffer = await file.arrayBuffer()
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    console.timeEnd('Excel file loading')

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
    console.time('Sheet validation')
    const nilaiUjianValidation = await validateNilaiUjianSheet(workbook.getWorksheet('Nilai Ujian'), kelasId, periodeAjaranId)
    const nilaiHafalanValidation = await validateNilaiHafalanSheet(workbook.getWorksheet('Nilai Hafalan'), kelasId, periodeAjaranId)
    const kehadiranValidation = await validateKehadiranSheet(workbook.getWorksheet('Kehadiran'), kelasId, periodeAjaranId)
    const penilaianSikapValidation = await validatePenilaianSikapSheet(workbook.getWorksheet('Penilaian Sikap'), kelasId, periodeAjaranId)
    const catatanSiswaValidation = await validateCatatanSiswaSheet(workbook.getWorksheet('Catatan Siswa'), kelasId, periodeAjaranId)
    console.timeEnd('Sheet validation')

    // Collect validated data from all sheets
    const validatedData = {
      nilaiUjian: nilaiUjianValidation.data || [],
      nilaiHafalan: nilaiHafalanValidation.data || [],
      kehadiran: kehadiranValidation.data || [],
      penilaianSikap: penilaianSikapValidation.data || [],
      catatanSiswa: catatanSiswaValidation.data || []
    }

    // Debug: Log validated data counts
    console.log('Validated data counts:', {
      nilaiUjian: validatedData.nilaiUjian.length,
      nilaiHafalan: validatedData.nilaiHafalan.length,
      kehadiran: validatedData.kehadiran.length,
      penilaianSikap: validatedData.penilaianSikap.length,
      catatanSiswa: validatedData.catatanSiswa.length
    })

    // Debug: Log first few nilai hafalan items
    if (validatedData.nilaiHafalan.length > 0) {
      console.log('First nilai hafalan item:', validatedData.nilaiHafalan[0])
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
      console.time('Data import')
      importResult = await performImport(validatedData, kelasId, periodeAjaranId)
      console.timeEnd('Data import')
    }

    console.timeEnd('Total processing time')
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

// Bulk import function using transactions and createMany
async function performImport(validatedData: any, kelasId: string, periodeAjaranId: string) {
  const results = {
    nilaiUjian: { inserted: 0, updated: 0, errors: 0 },
    nilaiHafalan: { inserted: 0, updated: 0, errors: 0 },
    kehadiran: { inserted: 0, updated: 0, errors: 0 },
    penilaianSikap: { inserted: 0, updated: 0, errors: 0 },
    catatanSiswa: { inserted: 0, updated: 0, errors: 0 }
  }

  try {
    console.time('Bulk import process')

    // 1. Pre-load all lookups (outside transaction for speed)
    console.time('Pre-loading lookups')
    const siswaMap = new Map()
    const mapelMap = new Map()
    const indikatorKehadiranMap = new Map()
    const indikatorSikapMap = new Map()

    // Get all unique NIS
    const allNis = new Set([
      ...validatedData.nilaiUjian?.map((item: any) => item.nis) || [],
      ...validatedData.nilaiHafalan?.map((item: any) => item.nis) || [],
      ...validatedData.kehadiran?.map((item: any) => item.nis) || [],
      ...validatedData.penilaianSikap?.map((item: any) => item.nis) || [],
      ...validatedData.catatanSiswa?.map((item: any) => item.nis) || []
    ].filter(Boolean))

    // Bulk load siswa
    const siswaList = await prisma.siswa.findMany({
      where: { nis: { in: Array.from(allNis) }, status: "Aktif" }
    })
    siswaList.forEach(siswa => siswaMap.set(siswa.nis, siswa))

    // Get all unique mapel names
    const allMapelNames = new Set([
      ...validatedData.nilaiUjian?.map((item: any) => item.mataPelajaran) || [],
      ...validatedData.nilaiHafalan?.map((item: any) => item.mataPelajaran) || []
    ].filter(Boolean))

    // Bulk load mapel
    const mapelList = await prisma.mataPelajaran.findMany({
      where: { nama_mapel: { in: Array.from(allMapelNames) } }
    })
    mapelList.forEach(mapel => mapelMap.set(mapel.nama_mapel, mapel))

    // Get all unique indikator
    const allIndikatorKehadiran = new Set(
      validatedData.kehadiran?.map((item: any) => item.indikator).filter(Boolean) || []
    )
    const allIndikatorSikap = new Set(
      validatedData.penilaianSikap?.map((item: any) => item.indikator).filter(Boolean) || []
    )

    // Bulk load indikator
    const indikatorKehadiranList = await prisma.indikatorKehadiran.findMany({
      where: { nama_indikator: { in: Array.from(allIndikatorKehadiran) as string[] } }
    })
    indikatorKehadiranList.forEach(ind => indikatorKehadiranMap.set(ind.nama_indikator, ind))

    const indikatorSikapList = await prisma.indikatorSikap.findMany({
      where: { indikator: { in: Array.from(allIndikatorSikap) as string[] } }
    })
    indikatorSikapList.forEach(ind => indikatorSikapMap.set(ind.indikator, ind))

    console.timeEnd('Pre-loading lookups')

    // 2. Process all tables in parallel for maximum speed
    console.time('Processing tables')

    // Process all tables simultaneously
    const [
      nilaiUjianResult,
      nilaiHafalanResult,
      kehadiranResult,
      penilaianSikapResult,
      catatanSiswaResult
    ] = await Promise.all([
      processNilaiUjian(validatedData.nilaiUjian || [], siswaMap, mapelMap, periodeAjaranId),
      processNilaiHafalan(validatedData.nilaiHafalan || [], siswaMap, mapelMap, periodeAjaranId),
      processKehadiran(validatedData.kehadiran || [], siswaMap, indikatorKehadiranMap, periodeAjaranId),
      processPenilaianSikap(validatedData.penilaianSikap || [], siswaMap, indikatorSikapMap, periodeAjaranId),
      processCatatanSiswa(validatedData.catatanSiswa || [], siswaMap, periodeAjaranId)
    ])

    results.nilaiUjian = nilaiUjianResult
    results.nilaiHafalan = nilaiHafalanResult
    results.kehadiran = kehadiranResult
    results.penilaianSikap = penilaianSikapResult
    results.catatanSiswa = catatanSiswaResult

    console.timeEnd('Processing tables')
    console.timeEnd('Bulk import process')
    console.log('Final import results:', results)
    return results

  } catch (error) {
    console.error('Bulk import error:', error)
    throw error
  }
}

// Helper function to process data in chunks
async function processTableInChunks<T>(
  data: T[],
  chunkSize: number,
  processor: (chunk: T[]) => Promise<{ inserted: number; updated: number; errors: number }>
): Promise<{ inserted: number; updated: number; errors: number }> {
  const results = { inserted: 0, updated: 0, errors: 0 }

  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize)
    const chunkResult = await processor(chunk)

    results.inserted += chunkResult.inserted
    results.updated += chunkResult.updated
    results.errors += chunkResult.errors

    // Small delay between chunks to prevent overwhelming the database
    if (i + chunkSize < data.length) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  return results
}

// Parallel upsert functions for each table
async function processNilaiUjian(data: any[], siswaMap: Map<string, any>, mapelMap: Map<string, any>, periodeAjaranId: string) {
  const result = { inserted: 0, updated: 0, errors: 0 }
  const upsertPromises: Promise<any>[] = []

  // Collect all valid upsert operations
  for (const item of data) {
    const siswa = siswaMap.get(item.nis)
    const mapel = mapelMap.get(item.mataPelajaran)

    if (siswa && mapel) {
      const upsertPromise = prisma.nilaiUjian.upsert({
        where: {
          siswa_id_mapel_id_periode_ajaran_id: {
            siswa_id: siswa.id,
            mapel_id: mapel.id,
            periode_ajaran_id: parseInt(periodeAjaranId)
          }
        },
        update: {
          nilai_angka: item.nilai,
          predikat: generatePredikat(item.nilai)
        },
        create: {
          siswa_id: siswa.id,
          mapel_id: mapel.id,
          periode_ajaran_id: parseInt(periodeAjaranId),
          nilai_angka: item.nilai,
          predikat: generatePredikat(item.nilai)
        }
      }).catch((error: any) => {
        console.error('Upsert error for nilai ujian:', error)
        result.errors++
        return null
      })

      upsertPromises.push(upsertPromise)
    } else {
      result.errors++
    }
  }

  // Execute all upserts in parallel
  if (upsertPromises.length > 0) {
    const upsertResults = await Promise.all(upsertPromises)
    result.inserted = upsertResults.filter(r => r !== null).length
  }

  return result
}

async function processNilaiHafalan(data: any[], siswaMap: Map<string, any>, mapelMap: Map<string, any>, periodeAjaranId: string) {
  const result = { inserted: 0, updated: 0, errors: 0 }
  const upsertPromises: Promise<any>[] = []

  // Collect all valid upsert operations
  for (const item of data) {
    const trimmedItem = {
      nis: item.nis?.trim(),
      mataPelajaran: item.mataPelajaran?.trim(),
      targetHafalan: item.targetHafalan?.trim(),
      predikat: item.predikat?.trim()
    }

    const siswa = siswaMap.get(trimmedItem.nis)
    const mapel = mapelMap.get(trimmedItem.mataPelajaran)

    if (siswa && mapel) {
      let predikatEnum: PredikatHafalan | null = null
      if (trimmedItem.predikat === 'Tercapai') {
        predikatEnum = PredikatHafalan.TERCAPAI
      } else if (trimmedItem.predikat === 'Tidak Tercapai') {
        predikatEnum = PredikatHafalan.TIDAK_TERCAPAI
      } else {
        result.errors++
        continue
      }

      const upsertPromise = prisma.nilaiHafalan.upsert({
        where: {
          siswa_id_mapel_id_periode_ajaran_id: {
            siswa_id: siswa.id,
            mapel_id: mapel.id,
            periode_ajaran_id: parseInt(periodeAjaranId)
          }
        },
        update: {
          target_hafalan: trimmedItem.targetHafalan,
          predikat: predikatEnum
        },
        create: {
          siswa_id: siswa.id,
          mapel_id: mapel.id,
          periode_ajaran_id: parseInt(periodeAjaranId),
          target_hafalan: trimmedItem.targetHafalan,
          predikat: predikatEnum
        }
      }).catch((error: any) => {
        console.error('Upsert error for nilai hafalan:', error)
        result.errors++
        return null
      })

      upsertPromises.push(upsertPromise)
    } else {
      result.errors++
    }
  }

  // Execute all upserts in parallel
  if (upsertPromises.length > 0) {
    const upsertResults = await Promise.all(upsertPromises)
    result.inserted = upsertResults.filter(r => r !== null).length
  }

  return result
}

async function processKehadiran(data: any[], siswaMap: Map<string, any>, indikatorMap: Map<string, any>, periodeAjaranId: string) {
  const result = { inserted: 0, updated: 0, errors: 0 }
  const upsertPromises: Promise<any>[] = []

  // Collect all valid upsert operations
  for (const item of data) {
    const siswa = siswaMap.get(item.nis)
    const indikator = indikatorMap.get(item.indikator)

    if (siswa && indikator) {
      const upsertPromise = prisma.kehadiran.upsert({
        where: {
          siswa_id_periode_ajaran_id_indikator_kehadiran_id: {
            siswa_id: siswa.id,
            periode_ajaran_id: parseInt(periodeAjaranId),
            indikator_kehadiran_id: indikator.id
          }
        },
        update: {
          sakit: parseInt(item.sakit) || 0,
          izin: parseInt(item.izin) || 0,
          alpha: parseInt(item.alpha) || 0
        },
        create: {
          siswa_id: siswa.id,
          periode_ajaran_id: parseInt(periodeAjaranId),
          indikator_kehadiran_id: indikator.id,
          sakit: parseInt(item.sakit) || 0,
          izin: parseInt(item.izin) || 0,
          alpha: parseInt(item.alpha) || 0
        }
      }).catch((error: any) => {
        console.error('Upsert error for kehadiran:', error)
        result.errors++
        return null
      })

      upsertPromises.push(upsertPromise)
    } else {
      result.errors++
    }
  }

  // Execute all upserts in parallel
  if (upsertPromises.length > 0) {
    const upsertResults = await Promise.all(upsertPromises)
    result.inserted = upsertResults.filter(r => r !== null).length
  }

  return result
}

async function processPenilaianSikap(data: any[], siswaMap: Map<string, any>, indikatorMap: Map<string, any>, periodeAjaranId: string) {
  console.log('Processing penilaian sikap data:', data.length, 'items')
  const result = { inserted: 0, updated: 0, errors: 0 }
  const upsertPromises: Promise<any>[] = []

  // Collect all valid upsert operations
  for (const item of data) {
    console.log('Processing penilaian sikap item:', item)
    const siswa = siswaMap.get(item.nis)
    const indikator = indikatorMap.get(item.indikator)

    console.log('Found siswa:', !!siswa, 'indikator:', !!indikator, 'for indikator:', item.indikator)

    if (siswa && indikator) {
      const nilaiNum = parseInt(item.nilai)
      const predikat = getPredicate(nilaiNum)

      console.log('Creating upsert for penilaian sikap:', {
        siswa_id: siswa.id,
        indikator_id: indikator.id,
        nilai: nilaiNum,
        predikat
      })

      const upsertPromise = prisma.penilaianSikap.upsert({
        where: {
          siswa_id_indikator_id_periode_ajaran_id: {
            siswa_id: siswa.id,
            indikator_id: indikator.id,
            periode_ajaran_id: parseInt(periodeAjaranId)
          }
        },
        update: {
          nilai: nilaiNum,
          predikat: predikat
        },
        create: {
          siswa_id: siswa.id,
          indikator_id: indikator.id,
          periode_ajaran_id: parseInt(periodeAjaranId),
          nilai: nilaiNum,
          predikat: predikat
        }
      }).catch((error: any) => {
        console.error('Upsert error for penilaian sikap:', error, 'for item:', item)
        result.errors++
        return null
      })

      upsertPromises.push(upsertPromise)
    } else {
      console.log('Missing siswa or indikator for penilaian sikap item:', item)
      result.errors++
    }
  }

  console.log('Executing', upsertPromises.length, 'penilaian sikap upserts')

  // Execute all upserts in parallel
  if (upsertPromises.length > 0) {
    const upsertResults = await Promise.all(upsertPromises)
    result.inserted = upsertResults.filter(r => r !== null).length
    console.log('Penilaian sikap upsert results:', upsertResults.length, 'total,', result.inserted, 'successful')
  }

  console.log('Penilaian sikap processing result:', result)
  return result
}

async function processCatatanSiswa(data: any[], siswaMap: Map<string, any>, periodeAjaranId: string) {
  const result = { inserted: 0, updated: 0, errors: 0 }
  const upsertPromises: Promise<any>[] = []

  // Collect all valid upsert operations
  for (const item of data) {
    const siswa = siswaMap.get(item.nis)

    if (siswa) {
      const upsertPromise = prisma.catatanSiswa.upsert({
        where: {
          siswa_id_periode_ajaran_id: {
            siswa_id: siswa.id,
            periode_ajaran_id: parseInt(periodeAjaranId)
          }
        },
        update: {
          catatan_sikap: item.catatanSikap,
          catatan_akademik: item.catatanAkademik
        },
        create: {
          siswa_id: siswa.id,
          periode_ajaran_id: parseInt(periodeAjaranId),
          catatan_sikap: item.catatanSikap,
          catatan_akademik: item.catatanAkademik
        }
      }).catch((error: any) => {
        console.error('Upsert error for catatan siswa:', error)
        result.errors++
        return null
      })

      upsertPromises.push(upsertPromise)
    } else {
      result.errors++
    }
  }

  // Execute all upserts in parallel
  if (upsertPromises.length > 0) {
    const upsertResults = await Promise.all(upsertPromises)
    result.inserted = upsertResults.filter(r => r !== null).length
  }

  return result
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