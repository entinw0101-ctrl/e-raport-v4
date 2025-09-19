import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)

    const nilaiHafalan = await prisma.nilaiHafalan.findUnique({
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
        mata_pelajaran: true,
        periode_ajaran: {
          include: {
            master_tahun_ajaran: true,
          },
        },
      },
    })

    if (!nilaiHafalan) {
      return NextResponse.json({ success: false, error: "Nilai hafalan tidak ditemukan" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: nilaiHafalan,
    })
  } catch (error) {
    console.error("Error fetching nilai hafalan:", error)
    return NextResponse.json({ success: false, error: "Gagal mengambil data nilai hafalan" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    const body = await request.json()

    // Check if record exists
    const existingNilai = await prisma.nilaiHafalan.findUnique({
      where: { id },
    })

    if (!existingNilai) {
      return NextResponse.json({ success: false, error: "Nilai hafalan tidak ditemukan" }, { status: 404 })
    }

    const data = {
      target_hafalan: body.target_hafalan || null,
      predikat: body.predikat,
    }

    const nilaiHafalan = await prisma.nilaiHafalan.update({
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
        mata_pelajaran: true,
        periode_ajaran: {
          include: {
            master_tahun_ajaran: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: nilaiHafalan,
      message: "Nilai hafalan berhasil diperbarui",
    })
  } catch (error) {
    console.error("Error updating nilai hafalan:", error)
    return NextResponse.json({ success: false, error: "Gagal memperbarui nilai hafalan" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)

    // Check if record exists
    const existingNilai = await prisma.nilaiHafalan.findUnique({
      where: { id },
    })

    if (!existingNilai) {
      return NextResponse.json({ success: false, error: "Nilai hafalan tidak ditemukan" }, { status: 404 })
    }

    await prisma.nilaiHafalan.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: "Nilai hafalan berhasil dihapus",
    })
  } catch (error) {
    console.error("Error deleting nilai hafalan:", error)
    return NextResponse.json({ success: false, error: "Gagal menghapus nilai hafalan" }, { status: 500 })
  }
}
