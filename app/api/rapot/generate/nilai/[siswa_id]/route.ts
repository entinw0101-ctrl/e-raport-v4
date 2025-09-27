import { NextRequest, NextResponse } from "next/server"
import { generateLaporanNilai } from "@/lib/raport-utils"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ siswa_id: string }> }
) {
  try {
    const resolvedParams = await params
    const siswaId = resolvedParams.siswa_id
    const { searchParams } = new URL(request.url)
    const periodeAjaranId = searchParams.get("periode_ajaran_id")

    if (!siswaId) {
      return NextResponse.json(
        { success: false, error: "ID siswa wajib diisi" },
        { status: 400 }
      )
    }

    if (!periodeAjaranId) {
      return NextResponse.json(
        { success: false, error: "ID periode ajaran wajib diisi" },
        { status: 400 }
      )
    }

    // Generate laporan nilai
    const result = await generateLaporanNilai(siswaId, periodeAjaranId)

    if (!result.canGenerate) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          warnings: result.warnings
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      warnings: result.warnings,
      message: "Laporan nilai berhasil di-generate"
    })

  } catch (error) {
    console.error("Error generating laporan nilai:", error)
    return NextResponse.json(
      { success: false, error: "Gagal generate laporan nilai" },
      { status: 500 }
    )
  }
}