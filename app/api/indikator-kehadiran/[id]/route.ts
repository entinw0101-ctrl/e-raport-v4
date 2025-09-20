import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    const body = await request.json()

    // Validate required fields
    if (!body.nama_indikator) {
      return NextResponse.json({ success: false, error: "Nama indikator wajib diisi" }, { status: 400 })
    }

    const indikatorKehadiran = await prisma.indikatorKehadiran.update({
      where: { id },
      data: body,
    })

    return NextResponse.json({
      success: true,
      data: indikatorKehadiran,
      message: "Indikator kehadiran berhasil diperbarui",
    })
  } catch (error) {
    console.error("Error updating indikator kehadiran:", error)
    return NextResponse.json({ success: false, error: "Gagal memperbarui indikator kehadiran" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)

    // Check if indikator is being used
    const kehadiranCount = await prisma.kehadiran.count({
      where: { indikator_kehadiran_id: id },
    })

    if (kehadiranCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Indikator kehadiran tidak dapat dihapus karena masih digunakan dalam pencatatan kehadiran",
        },
        { status: 400 },
      )
    }

    await prisma.indikatorKehadiran.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: "Indikator kehadiran berhasil dihapus",
    })
  } catch (error) {
    console.error("Error deleting indikator kehadiran:", error)
    return NextResponse.json({ success: false, error: "Gagal menghapus indikator kehadiran" }, { status: 500 })
  }
}