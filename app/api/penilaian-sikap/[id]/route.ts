import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    const body = await request.json()

    // Validate required fields
    if (!body.siswa_id || !body.periode_ajaran_id || !body.semester || !body.indikator_sikap_id || !body.nilai) {
      return NextResponse.json(
        { success: false, error: "Siswa, periode ajaran, semester, indikator sikap, dan nilai wajib diisi" },
        { status: 400 },
      )
    }

    const data = {
      ...body,
      siswa_id: Number.parseInt(body.siswa_id),
      periode_ajaran_id: Number.parseInt(body.periode_ajaran_id),
      semester: Number.parseInt(body.semester),
      indikator_sikap_id: Number.parseInt(body.indikator_sikap_id),
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

    return NextResponse.json({
      success: true,
      data: penilaianSikap,
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
