import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const { assessments, periode_ajaran_id } = await request.json()

    if (!Array.isArray(assessments)) {
      return NextResponse.json(
        { success: false, error: "Data penilaian sikap harus berupa array" },
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

    for (const assessment of assessments) {
      const { siswa_id, indikator_sikap_id, nilai } = assessment

      // Validate required fields
      if (!siswa_id || !indikator_sikap_id || nilai === undefined) {
        continue // Skip invalid records
      }

      // Convert and validate nilai
      const nilaiNum = Number.parseInt(nilai)
      if (isNaN(nilaiNum) || nilaiNum < 0) {
        continue // Skip invalid nilai
      }

      // Create or update assessment record
      const data = {
        siswa_id: Number(siswa_id),
        periode_ajaran_id: Number(periode_ajaran_id),
        indikator_id: Number(indikator_sikap_id),
        nilai: nilaiNum,
      }

      try {
        const result = await prisma.penilaianSikap.upsert({
          where: {
            siswa_id_indikator_id_periode_ajaran_id: {
              siswa_id: Number(siswa_id),
              indikator_id: Number(indikator_sikap_id),
              periode_ajaran_id: Number(periode_ajaran_id),
            },
          },
          update: {
            nilai: nilaiNum,
          },
          create: data,
        })
        results.push(result)
      } catch (error) {
        // Skip errors and continue with other records
        console.error("Error saving assessment:", error)
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      message: "Data penilaian sikap berhasil disimpan",
    })
  } catch (error) {
    console.error("Error saving batch assessments:", error)
    return NextResponse.json(
      { success: false, error: "Gagal menyimpan data penilaian sikap" },
      { status: 500 }
    )
  }
}