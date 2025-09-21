import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    const body = await request.json()

    // Validate required fields
    if (!body.nama_mapel || !body.jenis) {
      return NextResponse.json({ success: false, error: "Nama mata pelajaran dan jenis wajib diisi" }, { status: 400 })
    }

    // Validate jenis enum
    if (!['Ujian', 'Hafalan'].includes(body.jenis)) {
      return NextResponse.json({ success: false, error: "Jenis mata pelajaran harus 'Ujian' atau 'Hafalan'" }, { status: 400 })
    }


    const mataPelajaran = await prisma.mataPelajaran.update({
      where: { id },
      data: body,
    })

    return NextResponse.json({
      success: true,
      data: mataPelajaran,
      message: "Mata pelajaran berhasil diperbarui",
    })
  } catch (error) {
    console.error("Error updating mata pelajaran:", error)
    return NextResponse.json({ success: false, error: "Gagal memperbarui mata pelajaran" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)

    // Check if mata pelajaran is being used
    const nilaiUjianCount = await prisma.nilaiUjian.count({
      where: { mapel_id: id },
    })

    const nilaiHafalanCount = await prisma.nilaiHafalan.count({
      where: { mapel_id: id },
    })

    if (nilaiUjianCount > 0 || nilaiHafalanCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Mata pelajaran tidak dapat dihapus karena masih digunakan dalam penilaian",
        },
        { status: 400 },
      )
    }

    await prisma.mataPelajaran.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: "Mata pelajaran berhasil dihapus",
    })
  } catch (error) {
    console.error("Error deleting mata pelajaran:", error)
    return NextResponse.json({ success: false, error: "Gagal menghapus mata pelajaran" }, { status: 500 })
  }
}
