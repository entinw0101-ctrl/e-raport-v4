import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    const body = await request.json()

    // Validate required fields
    if (!body.siswa_id || !body.periode_ajaran_id || !body.indikator_kehadiran_id || !body.tanggal || !body.status) {
      return NextResponse.json(
        { success: false, error: "Siswa, periode ajaran, indikator kehadiran, tanggal, dan status wajib diisi" },
        { status: 400 },
      )
    }

    const data = {
      siswa_id: Number.parseInt(body.siswa_id),
      periode_ajaran_id: Number.parseInt(body.periode_ajaran_id),
      indikator_kehadiran_id: Number.parseInt(body.indikator_kehadiran_id),
      tanggal: new Date(body.tanggal),
      status: body.status,
    }

    const kehadiran = await prisma.kehadiran.update({
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
        indikator_kehadiran: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: kehadiran,
      message: "Data kehadiran berhasil diperbarui",
    })
  } catch (error) {
    console.error("Error updating kehadiran:", error)
    return NextResponse.json({ success: false, error: "Gagal memperbarui data kehadiran" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)

    await prisma.kehadiran.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: "Data kehadiran berhasil dihapus",
    })
  } catch (error) {
    console.error("Error deleting kehadiran:", error)
    return NextResponse.json({ success: false, error: "Gagal menghapus data kehadiran" }, { status: 500 })
  }
}
