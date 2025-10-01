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

    if (!file || !kelasId || !periodeAjaranId) {
      return NextResponse.json({ success: false, error: "File, kelas ID, dan periode ajaran ID diperlukan" }, { status: 400 })
    }

    // Validate file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json({ success: false, error: "File harus berformat Excel (.xlsx atau .xls)" }, { status: 400 })
    }

    // Read Excel file
    const buffer = await file.arrayBuffer()
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)

    // Get first worksheet (should be the nilai ujian template)
    const worksheet = workbook.worksheets[0]
    if (!worksheet) {
      return NextResponse.json({ success: false, error: "Tidak ada sheet di file Excel" }, { status: 400 })
    }

    // Parse data
    const rows = worksheet.getSheetValues()
    const dataRows = rows.slice(2) // Skip header
    const results = { inserted: 0, updated: 0, errors: 0 }

    // Pre-load lookups
    const allNis = new Set(dataRows.map((row: any) => row?.[1]).filter(Boolean))
    const allMapel = new Set(dataRows.map((row: any) => row?.[3]).filter(Boolean))

    const siswaList = await prisma.siswa.findMany({
      where: { nis: { in: Array.from(allNis) }, status: "Aktif" },
      include: { kelas: { include: { tingkatan: true } } }
    })
    const siswaMap = new Map(siswaList.map(s => [s.nis, s]))

    // Get all tingkatan mappings for validation
    const siswaTingkatanMap = new Map()
    for (const siswa of siswaList) {
      if (siswa.kelas?.tingkatan?.id) {
        siswaTingkatanMap.set(siswa.nis, siswa.kelas.tingkatan.id)
      }
    }

    const mapelList = await prisma.mataPelajaran.findMany({
      where: {
        nama_mapel: { in: Array.from(allMapel) },
        jenis: "Ujian" // Ensure we only get ujian subjects
      }
    })
    const mapelMap = new Map(mapelList.map(m => [m.nama_mapel, m]))

    // Process upserts in parallel
    const upsertPromises: Promise<any>[] = []

    // Collect all valid upsert operations
    for (const row of dataRows) {
      if (!row || !Array.isArray(row) || row.length < 5) continue

      const nis = row[1] as string
      const mataPelajaran = row[3] as string
      const nilai = row[4]

      if (!nis || !mataPelajaran || nilai === null || nilai === undefined || nilai === '') continue

      const siswa = siswaMap.get(nis)
      const mapel = mapelMap.get(mataPelajaran)

      if (siswa && mapel) {
        // Optional kurikulum validation for ujian (similar to hafalan fix)
        const studentTingkatanId = siswaTingkatanMap.get(nis);
        if (!studentTingkatanId) {
          results.errors++;
          continue;
        }

        const kurikulum = await prisma.kurikulum.findFirst({
          where: {
            mapel_id: mapel.id,
            tingkatan_id: studentTingkatanId,
            mata_pelajaran: { jenis: "Ujian" }
          }
        });

        if (!kurikulum) {
          console.log(`Warning: Mata pelajaran ujian "${mataPelajaran}" tidak terdaftar di kurikulum tingkatan siswa ${nis}, tapi tetap diizinkan import`);
        }

        const nilaiNum = parseFloat(String(nilai))
        if (!isNaN(nilaiNum) && nilaiNum >= 0 && nilaiNum <= 100) {
          const upsertPromise = prisma.nilaiUjian.upsert({
            where: {
              siswa_id_mapel_id_periode_ajaran_id: {
                siswa_id: siswa.id,
                mapel_id: mapel.id,
                periode_ajaran_id: parseInt(periodeAjaranId)
              }
            },
            update: {
              nilai_angka: nilaiNum,
              predikat: generatePredikat(nilaiNum)
            },
            create: {
              siswa_id: siswa.id,
              mapel_id: mapel.id,
              periode_ajaran_id: parseInt(periodeAjaranId),
              nilai_angka: nilaiNum,
              predikat: generatePredikat(nilaiNum)
            }
          }).catch((error: any) => {
            console.error('Upsert error for nilai ujian:', error)
            results.errors++
            return null
          })

          upsertPromises.push(upsertPromise)
        } else {
          results.errors++
        }
      } else {
        results.errors++
      }
    }

    // Execute all upserts in parallel
    if (upsertPromises.length > 0) {
      const upsertResults = await Promise.all(upsertPromises)
      results.inserted = upsertResults.filter(r => r !== null).length
      // Note: We can't easily distinguish between inserts and updates in parallel mode
      // For simplicity, we'll count all successful operations as inserted
    }

    return NextResponse.json({
      success: true,
      message: `Nilai ujian berhasil diproses: ${results.inserted} inserted, ${results.updated} updated, ${results.errors} errors`,
      results
    })

  } catch (error) {
    console.error("Error processing nilai ujian:", error)
    return NextResponse.json({ success: false, error: "Gagal memproses file nilai ujian" }, { status: 500 })
  }
}