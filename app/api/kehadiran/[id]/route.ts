import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)

    const kehadiran = await prisma.kehadiran.findUnique({
      where: { id },
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

    if (!kehadiran) {
      return NextResponse.json({ success: false, error: "Data kehadiran tidak ditemukan" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: kehadiran,
    })
  } catch (error) {
    console.error("Error fetching kehadiran:", error)
    return NextResponse.json({ success: false, error: "Gagal mengambil data kehadiran" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    const body = await request.json()

    // Check if record exists
    const existingKehadiran = await prisma.kehadiran.findUnique({
      where: { id },
    })

    if (!existingKehadiran) {
      return NextResponse.json({ success: false, error: "Data kehadiran tidak ditemukan" }, { status: 404 })
    }

    // Convert and validate data
    const sakit = Number.parseInt(body.sakit)
    const izin = Number.parseInt(body.izin)
    const alpha = Number.parseInt(body.alpha)

    if (isNaN(sakit) || sakit < 0 || isNaN(izin) || izin < 0 || isNaN(alpha) || alpha < 0) {
      return NextResponse.json({ success: false, error: "Sakit, izin, dan alpha harus berupa angka positif atau nol" }, { status: 400 })
    }

    const data = {
      sakit,
      izin,
      alpha,
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
