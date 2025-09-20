import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const { attendance, periode_ajaran_id } = await request.json()

    if (!Array.isArray(attendance)) {
      return NextResponse.json(
        { success: false, error: "Data kehadiran harus berupa array" },
        { status: 400 }
      )
    }

    if (!periode_ajaran_id) {
      return NextResponse.json(
        { success: false, error: "periode_ajaran_id wajib diisi" },
        { status: 400 }
      )
    }

    const results = []

    for (const student of attendance) {
      const { siswa_id } = student

      // Get all indicators to process each one
      const indicators = await prisma.indikatorKehadiran.findMany()

      for (const indicator of indicators) {
        const sakit = student[`indikator_${indicator.id}_sakit`] || 0
        const izin = student[`indikator_${indicator.id}_izin`] || 0
        const alpha = student[`indikator_${indicator.id}_alpha`] || 0
        const existingId = student[`indikator_${indicator.id}_id`]

        // Check if any values are non-zero
        const hasData = sakit > 0 || izin > 0 || alpha > 0

        if (hasData) {
          // Create or update attendance record
          const data = {
            siswa_id: Number(siswa_id),
            periode_ajaran_id: Number(periode_ajaran_id),
            indikator_kehadiran_id: indicator.id,
            sakit: Number(sakit),
            izin: Number(izin),
            alpha: Number(alpha),
          }

          if (existingId) {
            // Update existing record
            const result = await prisma.kehadiran.update({
              where: { id: Number(existingId) },
              data,
            })
            results.push(result)
          } else {
            // Create new record
            const result = await prisma.kehadiran.create({
              data,
            })
            results.push(result)
          }
        } else if (existingId) {
          // Delete record if all values are zero and record exists
          await prisma.kehadiran.delete({
            where: { id: Number(existingId) },
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      message: "Data kehadiran berhasil disimpan",
    })
  } catch (error) {
    console.error("Error saving batch attendance:", error)
    return NextResponse.json(
      { success: false, error: "Gagal menyimpan data kehadiran" },
      { status: 500 }
    )
  }
}