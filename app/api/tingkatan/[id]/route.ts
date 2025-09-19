import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    const body = await request.json()

    // Validate required fields
    if (!body.nama_tingkatan || !body.urutan) {
      return NextResponse.json({ success: false, error: "Nama tingkatan dan urutan wajib diisi" }, { status: 400 })
    }

    // Check if urutan already exists (excluding current record)
    const existingTingkatan = await prisma.tingkatan.findFirst({
      where: {
        urutan: Number.parseInt(body.urutan),
        NOT: { id },
      },
    })

    if (existingTingkatan) {
      return NextResponse.json({ success: false, error: "Urutan sudah digunakan" }, { status: 400 })
    }

    const data = {
      ...body,
      urutan: Number.parseInt(body.urutan),
    }

    const tingkatan = await prisma.tingkatan.update({
      where: { id },
      data,
    })

    return NextResponse.json({
      success: true,
      data: tingkatan,
      message: "Tingkatan berhasil diperbarui",
    })
  } catch (error) {
    console.error("Error updating tingkatan:", error)
    return NextResponse.json({ success: false, error: "Gagal memperbarui tingkatan" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)

    // Check if tingkatan is being used
    const kelasCount = await prisma.kelas.count({
      where: { tingkatan_id: id },
    })

    if (kelasCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Tingkatan tidak dapat dihapus karena masih digunakan oleh kelas",
        },
        { status: 400 },
      )
    }

    await prisma.tingkatan.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: "Tingkatan berhasil dihapus",
    })
  } catch (error) {
    console.error("Error deleting tingkatan:", error)
    return NextResponse.json({ success: false, error: "Gagal menghapus tingkatan" }, { status: 500 })
  }
}
