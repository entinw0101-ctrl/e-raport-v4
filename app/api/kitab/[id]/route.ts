import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    const body = await request.json()

    // Validate required fields
    if (!body.nama_kitab) {
      return NextResponse.json({ success: false, error: "Nama kitab wajib diisi" }, { status: 400 })
    }

    const kitab = await prisma.kitab.update({
      where: { id },
      data: {
        nama_kitab: body.nama_kitab,
      },
    })

    return NextResponse.json({
      success: true,
      data: kitab,
      message: "Kitab berhasil diperbarui",
    })
  } catch (error) {
    console.error("Error updating kitab:", error)
    return NextResponse.json({ success: false, error: "Gagal memperbarui kitab" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)

    await prisma.kitab.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: "Kitab berhasil dihapus",
    })
  } catch (error) {
    console.error("Error deleting kitab:", error)
    return NextResponse.json({ success: false, error: "Gagal menghapus kitab" }, { status: 500 })
  }
}
