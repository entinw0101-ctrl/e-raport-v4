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

    // Get worksheet
    const worksheet = workbook.getWorksheet('Nilai Ujian')
    if (!worksheet) {
      return NextResponse.json({ success: false, error: "Sheet 'Nilai Ujian' tidak ditemukan" }, { status: 400 })
    }

    // Parse data
    const rows = worksheet.getSheetValues()
    const dataRows = rows.slice(2) // Skip header
    const results = { inserted: 0, updated: 0, errors: 0 }

    // Pre-load lookups
    const allNis = new Set(dataRows.map((row: any) => row?.[1]).filter(Boolean))
    const allMapel = new Set(dataRows.map((row: any) => row?.[3]).filter(Boolean))

    const siswaList = await prisma.siswa.findMany({
      where: { nis: { in: Array.from(allNis) }, status: "Aktif" }
    })
    const siswaMap = new Map(siswaList.map(s => [s.nis, s]))

    const mapelList = await prisma.mataPelajaran.findMany({
      where: { nama_mapel: { in: Array.from(allMapel) } }
    })
    const mapelMap = new Map(mapelList.map(m => [m.nama_mapel, m]))

    // Process data
    for (const row of dataRows) {
      if (!row || !Array.isArray(row) || row.length < 5) continue

      const nis = row[1] as string
      const mataPelajaran = row[3] as string
      const nilai = row[4]

      if (!nis || !mataPelajaran || nilai === null || nilai === undefined || nilai === '') continue

      const siswa = siswaMap.get(nis)
      const mapel = mapelMap.get(mataPelajaran)

      if (siswa && mapel) {
        const nilaiNum = parseFloat(String(nilai))
        if (!isNaN(nilaiNum) && nilaiNum >= 0 && nilaiNum <= 100) {
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
                nilai_angka: nilaiNum,
                predikat: generatePredikat(nilaiNum)
              }
            })
            results.updated++
          } else {
            await prisma.nilaiUjian.create({
              data: {
                siswa_id: siswa.id,
                mapel_id: mapel.id,
                periode_ajaran_id: parseInt(periodeAjaranId),
                nilai_angka: nilaiNum,
                predikat: generatePredikat(nilaiNum)
              }
            })
            results.inserted++
          }
        } else {
          results.errors++
        }
      } else {
        results.errors++
      }
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