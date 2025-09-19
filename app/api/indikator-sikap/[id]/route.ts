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

    const indikatorSikap = await prisma.indikatorSikap.update({
      where: { id },
      data: body,
    })

    return NextResponse.json({
      success: true,
      data: indikatorSikap,
      message: "Indikator sikap berhasil diperbarui",
    })
  } catch (error) {
    console.error("Error updating indikator sikap:", error)
    return NextResponse.json({ success: false, error: "Gagal memperbarui indikator sikap" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)

    // Check if indikator is being used
    const penilaianCount = await prisma.penilaianSikap.count({
      where: { indikator_sikap_id: id },
    })

    if (penilaianCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Indikator sikap tidak dapat dihapus karena masih digunakan dalam penilaian",
        },
        { status: 400 },
      )
    }

    await prisma.indikatorSikap.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: "Indikator sikap berhasil dihapus",
    })
  } catch (error) {
    console.error("Error deleting indikator sikap:", error)
    return NextResponse.json({ success: false, error: "Gagal menghapus indikator sikap" }, { status: 500 })
  }
}
