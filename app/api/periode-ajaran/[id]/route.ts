import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID periode ajaran wajib diisi" },
        { status: 400 }
      )
    }

    const periodeAjaran = await prisma.periodeAjaran.findUnique({
      where: { id: parseInt(id) },
      include: {
        master_tahun_ajaran: {
          select: {
            id: true,
            nama_ajaran: true,
            status: true,
          },
        },
        _count: {
          select: {
            nilai_ujian: true,
            nilai_hafalan: true,
            kehadiran: true,
            penilaian_sikap: true,
            ringkasan_rapot: true,
          },
        },
      },
    })

    if (!periodeAjaran) {
      return NextResponse.json(
        { success: false, error: "Periode ajaran tidak ditemukan" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: periodeAjaran,
    })
  } catch (error) {
    console.error("Error fetching periode ajaran:", error)
    return NextResponse.json(
      { success: false, error: "Gagal mengambil data periode ajaran" },
      { status: 500 }
    )
  }
}