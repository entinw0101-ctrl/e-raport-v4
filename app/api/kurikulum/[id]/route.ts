import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)

    const kurikulum = await prisma.kurikulum.findUnique({
      where: { id },
      include: {
        mata_pelajaran: true,
        kitab: true,
        tingkatan: true,
      },
    })

    if (!kurikulum) {
      return NextResponse.json({ success: false, error: "Kurikulum tidak ditemukan" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: kurikulum,
    })
  } catch (error) {
    console.error("Error fetching kurikulum:", error)
    return NextResponse.json({ success: false, error: "Gagal mengambil data kurikulum" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    const body = await request.json()

    // Check if kurikulum exists
    const existingKurikulum = await prisma.kurikulum.findUnique({
      where: { id },
    })

    if (!existingKurikulum) {
      return NextResponse.json({ success: false, error: "Kurikulum tidak ditemukan" }, { status: 404 })
    }

    const data = await prisma.kurikulum.update({
      where: { id },
      data: {
        mapel_id: body.mapel_id ? Number.parseInt(body.mapel_id) : null,
        kitab_id: body.kitab_id ? Number.parseInt(body.kitab_id) : null,
        batas_hafalan: body.batas_hafalan || null,
        ...(body.tingkatan_id && { tingkatan_id: Number.parseInt(body.tingkatan_id) }),
      },
      include: {
        mata_pelajaran: true,
        kitab: true,
        tingkatan: true,
      },
    })

    return NextResponse.json({
      success: true,
      data,
      message: "Kurikulum berhasil diperbarui",
    })
  } catch (error) {
    console.error("Error updating kurikulum:", error)
    return NextResponse.json({ success: false, error: "Gagal memperbarui kurikulum" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)

    // Check if kurikulum exists
    const existingKurikulum = await prisma.kurikulum.findUnique({
      where: { id },
    })

    if (!existingKurikulum) {
      return NextResponse.json({ success: false, error: "Kurikulum tidak ditemukan" }, { status: 404 })
    }

    await prisma.kurikulum.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: "Kurikulum berhasil dihapus",
    })
  } catch (error) {
    console.error("Error deleting kurikulum:", error)
    return NextResponse.json({ success: false, error: "Gagal menghapus kurikulum" }, { status: 500 })
  }
}