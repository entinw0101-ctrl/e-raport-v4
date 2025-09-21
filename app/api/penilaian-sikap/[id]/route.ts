import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    const body = await request.json()

    // Validate required fields
    if (!body.siswa_id || !body.periode_ajaran_id || !body.indikator_sikap_id || !body.nilai) {
      return NextResponse.json(
        { success: false, error: "Siswa, periode ajaran, indikator sikap, dan nilai wajib diisi" },
        { status: 400 },
      )
    }

    // Map nilai string to number
    const nilaiMapping: Record<string, number> = {
      "Sangat Baik": 4,
      "Baik": 3,
      "Cukup": 2,
      "Kurang": 1,
    }

    const data = {
      siswa_id: Number.parseInt(body.siswa_id),
      periode_ajaran_id: Number.parseInt(body.periode_ajaran_id),
      indikator_id: Number.parseInt(body.indikator_sikap_id),
      nilai: nilaiMapping[body.nilai] || 1,
    }

    const penilaianSikap = await prisma.penilaianSikap.update({
      where: { id },
      data,
      include: {
        siswa: {
          include: {
            kelas: {
              include: {
                tingkatan: true,
              },
            },
          },
        },
        periode_ajaran: {
          include: {
            master_tahun_ajaran: true,
          },
        },
        indikator_sikap: true,
      },
    })

    // Map nilai back to string for response
    const nilaiReverseMapping: Record<number, string> = {
      4: "Sangat Baik",
      3: "Baik",
      2: "Cukup",
      1: "Kurang",
    }

    const responseData = {
      ...penilaianSikap,
      nilai: nilaiReverseMapping[penilaianSikap.nilai] || "Kurang",
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      message: "Penilaian sikap berhasil diperbarui",
    })
  } catch (error) {
    console.error("Error updating penilaian sikap:", error)
    return NextResponse.json({ success: false, error: "Gagal memperbarui penilaian sikap" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)

    await prisma.penilaianSikap.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: "Penilaian sikap berhasil dihapus",
    })
  } catch (error) {
    console.error("Error deleting penilaian sikap:", error)
    return NextResponse.json({ success: false, error: "Gagal menghapus penilaian sikap" }, { status: 500 })
  }
}
