import { NextRequest, NextResponse } from "next/server"
import ExcelJS from "exceljs"
import { prisma } from "@/lib/prisma"
import { generatePredikat } from "@/lib/utils"
// DIUBAH: Impor getSikapPredicate juga
import { getPredicate, getSikapPredicate } from "@/lib/raport-utils"
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
      }
      // Kita tidak perlu 'success' di sini, itu yang menyebabkan bug di tes
    }

    // If any required sheets are missing, return early
    if (validationResults.some(r => r.status === 'error')) {
      return NextResponse.json({
        success: true, // API sukses, tapi validasi gagal
        validation: validationResults,
        message: "Beberapa sheet yang diperlukan tidak ditemukan",
        canProceed: false,
        imported: false
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
    
    // --- FIX UNTUK "File Kosong" ---
    const totalDataRows = (nilaiUjianValidation.data?.length || 0) + 
                          (nilaiHafalanValidation.data?.length || 0) + 
                          (kehadiranValidation.data?.length || 0) + 
                          (penilaianSikapValidation.data?.length || 0) + 
                          (catatanSiswaValidation.data?.length || 0);
                          
    // --- FIX: Ini adalah deklarasi 'allValidations' yang BENAR ---
    const allValidations = [
      nilaiUjianValidation,
      nilaiHafalanValidation,
      kehadiranValidation,
      penilaianSikapValidation,
      catatanSiswaValidation
    ]

    // Check if there are any validation errors
    const hasErrors = allValidations.some(r => r.status === 'error')

    // --- FIX: Periksa 'totalDataRows' HANYA JIKA tidak ada error lain & 'shouldImport' true ---
    if (!hasErrors && shouldImport && totalDataRows === 0) {
        return NextResponse.json({
            success: true, 
            validation: allValidations,
            message: "Terdapat error dalam validasi data: File Excel tidak berisi data.",
            canProceed: false,
            imported: false
        }, { status: 200 }); 
    }
    // --- AKHIR FIX ---

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
      validation: allValidations, // <-- Menggunakan 'allValidations' yang sudah benar
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
      
      if (!row || row.length < 5) {
        details.push(`Baris ${i + 3}: Struktur kolom tidak sesuai template (diharapkan minimal 5 kolom, ditemukan ${row?.length || 0})`)
        continue 
      }

      const nis = row[1] 
      const nama = row[2] 
      const mataPelajaran = row[3] 
      const nilai = row[4] 

      if (!nis || !mataPelajaran) {
        details.push(`Baris ${i + 3}: Data NIS atau Mata Pelajaran tidak lengkap (pastikan kolom B dan D terisi)`)
        continue
      }

      if (nilai !== null && nilai !== undefined && nilai !== '') {
        const nilaiNum = parseFloat(nilai)
        
        if (isNaN(nilaiNum) || nilaiNum < 0 || nilaiNum > 10) {
          details.push(`Baris ${i + 3}: Nilai untuk ${mataPelajaran} (${nilai}) tidak valid. Harus angka antara 0-10`)
        } else {
          validCount++
          validatedData.push({
            nis,
            nama,
            mataPelajaran,
            nilai: nilaiNum
          })
        }
      } else {
         details.push(`Baris ${i + 3}: Nilai untuk ${mataPelajaran} tidak boleh kosong`)
      }
    }

    const finalStatus = details.length > 0 ? 'error' : 'success'

    return {
      sheet: 'Nilai Ujian',
      status: finalStatus,
      message: `Ditemukan ${validCount} data nilai ujian valid dari ${dataRows.length} baris. ${details.length} error ditemukan.`,
      details: details.length > 0 ? details : undefined,
      data: validatedData
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { sheet: 'Nilai Ujian', status: 'error', message: `Error memproses data nilai ujian: ${message}` }
  }
}

async function validateNilaiHafalanSheet(worksheet: ExcelJS.Worksheet | undefined, kelasId: string, periodeAjaranId: string): Promise<ValidationResult> {
  if (!worksheet) {
    return { sheet: 'Nilai Hafalan', status: 'error', message: 'Sheet tidak ditemukan' }
  }

  try {
    const rows = worksheet.getSheetValues()
    const dataRows = rows.slice(2)
    const validatedData: any[] = []

    if (dataRows.length === 0) {
      return { sheet: 'Nilai Hafalan', status: 'warning', message: 'Tidak ada data nilai hafalan', data: [] }
    }

    const details: string[] = []
    let validCount = 0
    const validPredikat = ['Tercapai', 'Tidak Tercapai']

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i] as any[]
      if (!row || row.length < 7) {
        details.push(`Baris ${i + 3}: Struktur kolom tidak sesuai template (diharapkan minimal 7 kolom)`)
        continue
      }

      const nis = row[1]
      const nama = row[2]
      const mataPelajaran = row[3]
      const kitab = row[4]
      const targetHafalan = row[5]
      const predikat = row[6]

      if (!nis || !mataPelajaran || !predikat) {
         details.push(`Baris ${i + 3}: Data NIS, Mata Pelajaran, atau Predikat tidak boleh kosong`)
         continue
      }

      if (predikat && !validPredikat.includes(predikat)) {
        details.push(`Baris ${i + 3}: Predikat "${predikat}" tidak valid. Harus "Tercapai" atau "Tidak Tercapai"`)
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

    const finalStatus = details.length > 0 ? 'error' : 'success'

    return {
      sheet: 'Nilai Hafalan',
      status: finalStatus,
      message: `Ditemukan ${validCount} data nilai hafalan valid dari ${dataRows.length} baris. ${details.length} error ditemukan.`,
      details: details.length > 0 ? details : undefined,
      data: validatedData
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { sheet: 'Nilai Hafalan', status: 'error', message: `Error memproses data nilai hafalan: ${message}` }
  }
}

async function validateKehadiranSheet(worksheet: ExcelJS.Worksheet | undefined, kelasId: string, periodeAjaranId: string): Promise<ValidationResult> {
  if (!worksheet) {
    return { sheet: 'Kehadiran', status: 'error', message: 'Sheet tidak ditemukan' }
  }

  try {
    const rows = worksheet.getSheetValues()
    const dataRows = rows.slice(2)
    const validatedData: any[] = []

    if (dataRows.length === 0) {
      return { sheet: 'Kehadiran', status: 'warning', message: 'Tidak ada data kehadiran', data: [] }
    }

    const details: string[] = []
    let validCount = 0

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i] as any[]
      if (!row || row.length < 7) { // Kolom A-G
        details.push(`Baris ${i + 3}: Struktur kolom tidak sesuai template (diharapkan minimal 7 kolom)`)
        continue
      }

      const nis = row[1]
      const nama = row[2]
      const indikator = row[3]
      const sakit = row[4]
      const izin = row[5]
      const alpha = row[6]

      if (!nis || !indikator) {
         details.push(`Baris ${i + 3}: Data NIS atau Indikator tidak boleh kosong`)
         continue
      }

      const sakitNum = parseInt(sakit || 0)
      const izinNum = parseInt(izin || 0)
      const alphaNum = parseInt(alpha || 0)

      if (isNaN(sakitNum) || sakitNum < 0) {
        details.push(`Baris ${i + 3}: Jumlah sakit (${sakit}) harus angka positif`)
      } else if (isNaN(izinNum) || izinNum < 0) {
        details.push(`Baris ${i + 3}: Jumlah izin (${izin}) harus angka positif`)
      } else if (isNaN(alphaNum) || alphaNum < 0) {
        details.push(`Baris ${i + 3}: Jumlah alpha (${alpha}) harus angka positif`)
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
    
    const finalStatus = details.length > 0 ? 'error' : 'success'

    return {
      sheet: 'Kehadiran',
      status: finalStatus,
      message: `Ditemukan ${validCount} data kehadiran valid dari ${dataRows.length} baris. ${details.length} error ditemukan.`,
      details: details.length > 0 ? details : undefined,
      data: validatedData
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { sheet: 'Kehadiran', status: 'error', message: `Error memproses data kehadiran: ${message}` }
  }
}

async function validatePenilaianSikapSheet(worksheet: ExcelJS.Worksheet | undefined, kelasId: string, periodeAjaranId: string): Promise<ValidationResult> {
  if (!worksheet) {
    return { sheet: 'Penilaian Sikap', status: 'error', message: 'Sheet tidak ditemukan' }
  }

  try {
    const rows = worksheet.getSheetValues()
    const dataRows = rows.slice(2)
    const validatedData: any[] = []

    if (dataRows.length === 0) {
      return { sheet: 'Penilaian Sikap', status: 'warning', message: 'Tidak ada data penilaian sikap', data: [] }
    }

    const details: string[] = []
    let validCount = 0

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i] as any[]
      if (!row || row.length < 6) {
        details.push(`Baris ${i + 3}: Struktur kolom tidak sesuai template (diharapkan minimal 6 kolom)`)
        continue
      }

      const nis = row[1]
      const nama = row[2]
      const jenisSikap = row[3]
      const indikator = row[4]
      const nilai = row[5]

      if (!nis || !jenisSikap || !indikator) {
         details.push(`Baris ${i + 3}: Data NIS, Jenis Sikap, atau Indikator tidak boleh kosong`)
         continue
      }

      if (nilai !== null && nilai !== undefined && nilai !== '') {
        const nilaiNum = parseInt(nilai)
        if (isNaN(nilaiNum) || nilaiNum < 0 || nilaiNum > 100) {
          details.push(`Baris ${i + 3}: Nilai sikap (${nilai}) harus angka antara 0-100`)
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
      } else {
         details.push(`Baris ${i + 3}: Nilai untuk ${indikator} tidak boleh kosong`)
      }
    }

    const finalStatus = details.length > 0 ? 'error' : 'success'

    return {
      sheet: 'Penilaian Sikap',
      status: finalStatus,
      message: `Ditemukan ${validCount} data penilaian sikap valid dari ${dataRows.length} baris. ${details.length} error ditemukan.`,
      details: details.length > 0 ? details : undefined,
      data: validatedData
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { sheet: 'Penilaian Sikap', status: 'error', message: `Error memproses data penilaian sikap: ${message}` }
  }
}

async function validateCatatanSiswaSheet(worksheet: ExcelJS.Worksheet | undefined, kelasId: string, periodeAjaranId: string): Promise<ValidationResult> {
  if (!worksheet) {
    return { sheet: 'Catatan Siswa', status: 'error', message: 'Sheet tidak ditemukan' }
  }

  try {
    const rows = worksheet.getSheetValues()
    const dataRows = rows.slice(2)
    const validatedData: any[] = []

    if (dataRows.length === 0) {
      return { sheet: 'Catatan Siswa', status: 'warning', message: 'Tidak ada data catatan siswa', data: [] }
    }

    const details: string[] = []
    let validCount = 0

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i] as any[]
      if (!row || row.length < 5) { // Kolom A-E
         details.push(`Baris ${i + 3}: Struktur kolom tidak sesuai template (diharapkan minimal 5 kolom)`)
         continue
      }

      const nis = row[1]
      const nama = row[2]
      const catatanSikap = row[3]
      const catatanAkademik = row[4]

      if (!nis) {
        details.push(`Baris ${i + 3}: Data NIS tidak boleh kosong`)
        continue
      }

      validCount++
      validatedData.push({
        nis,
        nama,
        catatanSikap: catatanSikap || null,
        catatanAkademik: catatanAkademik || null
      })
    }

    const finalStatus = details.length > 0 ? 'error' : 'success'

    return {
      sheet: 'Catatan Siswa',
      status: finalStatus,
      message: `Ditemukan ${validCount} data catatan siswa dari ${dataRows.length} baris. ${details.length} error ditemukan.`,
      details: details.length > 0 ? details : undefined,
      data: validatedData
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { sheet: 'Catatan Siswa', status: 'error', message: `Error memproses data catatan siswa: ${message}` }
  }
}


// -----------------------------------------------------------------------------
// FUNGSI IMPORT (TIDAK BERUBAH DARI FILE `route.ts` ASLI ANDA)
// -----------------------------------------------------------------------------

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

    const allNis = new Set([
      ...validatedData.nilaiUjian?.map((item: any) => item.nis) || [],
      ...validatedData.nilaiHafalan?.map((item: any) => item.nis) || [],
      ...validatedData.kehadiran?.map((item: any) => item.nis) || [],
      ...validatedData.penilaianSikap?.map((item: any) => item.nis) || [],
      ...validatedData.catatanSiswa?.map((item: any) => item.nis) || []
    ].filter(Boolean))

    const siswaList = await prisma.siswa.findMany({
      where: { nis: { in: Array.from(allNis) }, status: "Aktif" },
      include: { kelas: { include: { tingkatan: true } } }
    })
    siswaList.forEach(siswa => siswaMap.set(siswa.nis, siswa))

    const siswaTingkatanMap = new Map()
    siswaList.forEach(siswa => {
      if (siswa.kelas?.tingkatan?.id) {
        siswaTingkatanMap.set(siswa.nis, siswa.kelas.tingkatan.id)
      }
    })

    const allMapelNames = new Set([
      ...validatedData.nilaiUjian?.map((item: any) => `${item.mataPelajaran}|Ujian`) || [],
      ...validatedData.nilaiHafalan?.map((item: any) => `${item.mataPelajaran}|Hafalan`) || []
    ].filter(Boolean))

    const mapelList = await prisma.mataPelajaran.findMany({
      where: {
        OR: Array.from(allMapelNames).map(nameWithJenis => {
          const [nama, jenis] = nameWithJenis.split('|')
          return { nama_mapel: nama, jenis: jenis as any }
        })
      }
    })
    mapelList.forEach(mapel => mapelMap.set(`${mapel.nama_mapel}|${mapel.jenis}`, mapel))

    const allIndikatorKehadiran = new Set(
      validatedData.kehadiran?.map((item: any) => item.indikator).filter(Boolean) || []
    )
    const allIndikatorSikap = new Set(
      validatedData.penilaianSikap?.map((item: any) => item.indikator).filter(Boolean) || []
    )

    const indikatorKehadiranList = await prisma.indikatorKehadiran.findMany({
      where: { nama_indikator: { in: Array.from(allIndikatorKehadiran) as string[] } }
    })
    indikatorKehadiranList.forEach(ind => indikatorKehadiranMap.set(ind.nama_indikator, ind))

    const indikatorSikapList = await prisma.indikatorSikap.findMany({
      where: { indikator: { in: Array.from(allIndikatorSikap) as string[] } }
    })
    indikatorSikapList.forEach(ind => indikatorSikapMap.set(ind.indikator, ind))

    console.timeEnd('Pre-loading lookups')

    // 2. Process tables sequentially to avoid race conditions
    console.time('Processing tables')

    console.time('Nilai Ujian processing')
    const nilaiUjianResult = await processNilaiUjian(validatedData.nilaiUjian || [], siswaMap, mapelMap, periodeAjaranId, siswaTingkatanMap)
    console.timeEnd('Nilai Ujian processing')

    console.time('Nilai Hafalan processing')
    const nilaiHafalanResult = await processNilaiHafalan(validatedData.nilaiHafalan || [], siswaMap, mapelMap, periodeAjaranId, siswaTingkatanMap)
    console.timeEnd('Nilai Hafalan processing')

    console.time('Kehadiran processing')
    const kehadiranResult = await processKehadiran(validatedData.kehadiran || [], siswaMap, indikatorKehadiranMap, periodeAjaranId)
    console.timeEnd('Kehadiran processing')

    console.time('Penilaian Sikap processing')
    const penilaianSikapResult = await processPenilaianSikap(validatedData.penilaianSikap || [], siswaMap, indikatorSikapMap, periodeAjaranId)
    console.timeEnd('Penilaian Sikap processing')

    console.time('Catatan Siswa processing')
    const catatanSiswaResult = await processCatatanSiswa(validatedData.catatanSiswa || [], siswaMap, periodeAjaranId)
    console.timeEnd('Catatan Siswa processing')

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

async function processNilaiUjian(data: any[], siswaMap: Map<string, any>, mapelMap: Map<string, any>, periodeAjaranId: string, siswaTingkatanMap: Map<string, number>) {
  const result = { inserted: 0, updated: 0, errors: 0 }
  const upsertPromises: Promise<any>[] = []

  for (const item of data) {
    const siswa = siswaMap.get(item.nis)
    const mapel = mapelMap.get(`${item.mataPelajaran}|Ujian`)

    if (siswa && mapel) {
      const studentTingkatanId = siswaTingkatanMap.get(item.nis)
      if (!studentTingkatanId) {
        result.errors++
        console.error(`Siswa ${item.nis} tidak memiliki tingkatan yang valid`)
        continue
      }

      const kurikulumExists = await prisma.kurikulum.findFirst({
        where: {
          mapel_id: mapel.id,
          tingkatan_id: studentTingkatanId,
          mata_pelajaran: { jenis: "Ujian" } 
        }
      })

      if (!kurikulumExists) {
        result.errors++
        console.error(`Mata pelajaran "${item.mataPelajaran}" tidak sesuai dengan tingkatan siswa ${item.nis}`)
        continue
      }
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
          predikat: getPredicate(item.nilai)
        },
        create: {
          siswa_id: siswa.id,
          mapel_id: mapel.id,
          periode_ajaran_id: parseInt(periodeAjaranId),
          nilai_angka: item.nilai,
          predikat: getPredicate(item.nilai)
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

  if (upsertPromises.length > 0) {
    const upsertResults = await Promise.all(upsertPromises)
    result.inserted = upsertResults.filter(r => r !== null).length
  }

  return result
}

async function processNilaiHafalan(data: any[], siswaMap: Map<string, any>, mapelMap: Map<string, any>, periodeAjaranId: string, siswaTingkatanMap: Map<string, number>) {
  const result = { inserted: 0, updated: 0, errors: 0 }
  const upsertPromises: Promise<any>[] = []

  for (const item of data) {
    const trimmedItem = {
      nis: item.nis?.trim(),
      mataPelajaran: item.mataPelajaran?.trim(),
      targetHafalan: item.targetHafalan?.trim(),
      predikat: item.predikat?.trim()
    }

    const siswa = siswaMap.get(trimmedItem.nis)
    const mapel = mapelMap.get(`${trimmedItem.mataPelajaran}|Hafalan`)

    if (siswa && mapel) {
      const studentTingkatanId = siswaTingkatanMap.get(trimmedItem.nis)
      if (!studentTingkatanId) {
        result.errors++
        console.error(`Siswa ${trimmedItem.nis} tidak memiliki tingkatan yang valid`)
        continue
      }

      const kurikulum = await prisma.kurikulum.findFirst({
        where: {
          mapel_id: mapel.id,
          tingkatan_id: studentTingkatanId,
          mata_pelajaran: { jenis: "Hafalan" }
        },
        include: {
          kitab: true
        }
      })

      if (!kurikulum) {
        result.errors++
        console.error(`Mata pelajaran "${trimmedItem.mataPelajaran}" tidak sesuai dengan tingkatan siswa ${trimmedItem.nis}`)
        continue
      }

      const correctKitabName = kurikulum.kitab?.nama_kitab || kurikulum.batas_hafalan || ""
      console.log(`Using kitab name from kurikulum: "${correctKitabName}" for ${trimmedItem.mataPelajaran} (Excel had: "${trimmedItem.targetHafalan}")`)
      
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
          target_hafalan: correctKitabName,
          predikat: predikatEnum
        },
        create: {
          siswa_id: siswa.id,
          mapel_id: mapel.id,
          periode_ajaran_id: parseInt(periodeAjaranId),
          target_hafalan: correctKitabName,
          predikat: predikatEnum
        }
      }).catch((error: any) => {
        console.error('Upsert error for nilai hafalan:', error, 'for item:', item)
        result.errors++
        return null
      })

      upsertPromises.push(upsertPromise)
    } else {
      result.errors++
    }
  }

  if (upsertPromises.length > 0) {
    const upsertResults = await Promise.all(upsertPromises)
    result.inserted = upsertResults.filter(r => r !== null).length
  }

  return result
}

async function processKehadiran(data: any[], siswaMap: Map<string, any>, indikatorMap: Map<string, any>, periodeAjaranId: string) {
  const result = { inserted: 0, updated: 0, errors: 0 }
  const upsertPromises: Promise<any>[] = []

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

  for (const item of data) {
    console.log('Processing penilaian sikap item:', item)
    const siswa = siswaMap.get(item.nis)
    const indikator = indikatorMap.get(item.indikator)

    console.log('Found siswa:', !!siswa, 'indikator:', !!indikator, 'for indikator:', item.indikator)

    if (siswa && indikator) {
      const nilaiNum = parseInt(item.nilai)
      const predikat = getSikapPredicate(nilaiNum)

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

  if (upsertPromises.length > 0) {
    const upsertResults = await Promise.all(upsertPromises)
    result.inserted = upsertResults.filter(r => r !== null).length
    console.log('Penilaian sikap upsert results:', upsertResults.length, 'total,', result.inserted, 'successful')
  }

  console.log('Penilaian sikap processing result:', result)
  return result
}

async function processCatatanSiswa(data: any[], siswaMap: Map<string, any>, periodeAjaranId: string) {
  console.log('Processing catatan siswa data:', data.length, 'items')
  const result = { inserted: 0, updated: 0, errors: 0 }
  const upsertPromises: Promise<any>[] = []

  for (const item of data) {
    console.log('Processing catatan siswa item:', item)
    const siswa = siswaMap.get(item.nis)

    console.log('Found siswa for catatan:', !!siswa, 'for nis:', item.nis)

    if (siswa) {
      console.log('Creating upsert for catatan siswa:', {
        siswa_id: siswa.id,
        periode_ajaran_id: parseInt(periodeAjaranId),
        catatan_sikap: item.catatanSikap,
        catatan_akademik: item.catatanAkademik
      })

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
        console.error('Upsert error for catatan siswa:', error, 'for item:', item)
        result.errors++
        return null
      })

      upsertPromises.push(upsertPromise)
    } else {
      console.log('Siswa not found for catatan siswa item:', item)
      result.errors++
    }
  }

  console.log('Executing', upsertPromises.length, 'catatan siswa upserts')

  if (upsertPromises.length > 0) {
    const upsertResults = await Promise.all(upsertPromises)
    result.inserted = upsertResults.filter(r => r !== null).length
    console.log('Catatan siswa upsert results:', upsertResults.length, 'total,', result.inserted, 'successful')
  }

  console.log('Catatan siswa processing result:', result)
  return result
}