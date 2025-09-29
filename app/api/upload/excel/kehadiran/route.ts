import { NextRequest, NextResponse } from "next/server"
import ExcelJS from "exceljs"
import { prisma } from "@/lib/prisma"

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
    const worksheet = workbook.getWorksheet('Kehadiran')
    if (!worksheet) {
      return NextResponse.json({ success: false, error: "Sheet 'Kehadiran' tidak ditemukan" }, { status: 400 })
    }

    // Parse data
    const rows = worksheet.getSheetValues()
    const dataRows = rows.slice(2) // Skip header
    const results = { inserted: 0, updated: 0, errors: 0 }

    // Pre-load lookups
    const allNis = new Set(dataRows.map((row: any) => row?.[1]).filter(Boolean))
    const allIndikator = new Set(dataRows.map((row: any) => row?.[3]).filter(Boolean))

    const siswaList = await prisma.siswa.findMany({
      where: { nis: { in: Array.from(allNis) }, status: "Aktif" }
    })
    const siswaMap = new Map(siswaList.map(s => [s.nis, s]))

    const indikatorList = await prisma.indikatorKehadiran.findMany({
      where: { nama_indikator: { in: Array.from(allIndikator) as string[] } }
    })
    const indikatorMap = new Map(indikatorList.map(i => [i.nama_indikator, i]))

    // Process data
    for (const row of dataRows) {
      if (!row || !Array.isArray(row) || row.length < 8) continue

      const nis = row[1] as string
      const indikator = row[3] as string
      const sakit = row[4]
      const izin = row[5]
      const alpha = row[6]

      if (!nis || !indikator) continue

      const siswa = siswaMap.get(nis)
      const indikatorData = indikatorMap.get(indikator)

      if (siswa && indikatorData) {
        const sakitNum = parseInt(String(sakit || 0))
        const izinNum = parseInt(String(izin || 0))
        const alphaNum = parseInt(String(alpha || 0))

        if (sakitNum >= 0 && izinNum >= 0 && alphaNum >= 0) {
          const existing = await prisma.kehadiran.findUnique({
            where: {
              siswa_id_periode_ajaran_id_indikator_kehadiran_id: {
                siswa_id: siswa.id,
                periode_ajaran_id: parseInt(periodeAjaranId),
                indikator_kehadiran_id: indikatorData.id
              }
            }
          })

          if (existing) {
            await prisma.kehadiran.update({
              where: {
                siswa_id_periode_ajaran_id_indikator_kehadiran_id: {
                  siswa_id: siswa.id,
                  periode_ajaran_id: parseInt(periodeAjaranId),
                  indikator_kehadiran_id: indikatorData.id
                }
              },
              data: {
                sakit: sakitNum,
                izin: izinNum,
                alpha: alphaNum
              }
            })
            results.updated++
          } else {
            await prisma.kehadiran.create({
              data: {
                siswa_id: siswa.id,
                periode_ajaran_id: parseInt(periodeAjaranId),
                indikator_kehadiran_id: indikatorData.id,
                sakit: sakitNum,
                izin: izinNum,
                alpha: alphaNum
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
      message: `Kehadiran berhasil diproses: ${results.inserted} inserted, ${results.updated} updated, ${results.errors} errors`,
      results
    })

  } catch (error) {
    console.error("Error processing kehadiran:", error)
    return NextResponse.json({ success: false, error: "Gagal memproses file kehadiran" }, { status: 500 })
  }
}