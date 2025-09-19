import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)

    const kelas = await prisma.kelas.findUnique({
      where: { id },
      include: {
        wali_kelas: true,
        tingkatan: true,
        next_kelas: true,
        siswa: {
          orderBy: { nama: "asc" },
        },
        _count: {
          select: {
            siswa: true,
          },
        },
      },
    })

    if (!kelas) {
      return NextResponse.json({ success: false, error: "Kelas tidak ditemukan" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: kelas,
    })
  } catch (error) {
    console.error("Error fetching kelas:", error)
    return NextResponse.json({ success: false, error: "Gagal mengambil data kelas" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    const body = await request.json()

    // Check if kelas exists
    const existingKelas = await prisma.kelas.findUnique({
      where: { id },
    })

    if (!existingKelas) {
      return NextResponse.json({ success: false, error: "Kelas tidak ditemukan" }, { status: 404 })
    }

    // Convert string IDs to integers
    const data = {
      ...body,
      tingkatan_id: body.tingkatan_id ? Number.parseInt(body.tingkatan_id) : null,
      wali_kelas_id: body.wali_kelas_id ? Number.parseInt(body.wali_kelas_id) : null,
      next_kelas_id: body.next_kelas_id ? Number.parseInt(body.next_kelas_id) : null,
      kapasitas: body.kapasitas ? Number.parseInt(body.kapasitas) : null,
    }

    const kelas = await prisma.kelas.update({
      where: { id },
      data,
      include: {
        wali_kelas: true,
        tingkatan: true,
        next_kelas: true,
        _count: {
          select: {
            siswa: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: kelas,
      message: "Kelas berhasil diperbarui",
    })
  } catch (error) {
    console.error("Error updating kelas:", error)
    return NextResponse.json({ success: false, error: "Gagal memperbarui kelas" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)

    // Check if kelas exists
    const existingKelas = await prisma.kelas.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            siswa: true,
          },
        },
      },
    })

    if (!existingKelas) {
      return NextResponse.json({ success: false, error: "Kelas tidak ditemukan" }, { status: 404 })
    }

    // Check if kelas has students
    if (existingKelas._count.siswa > 0) {
      return NextResponse.json(
        { success: false, error: "Tidak dapat menghapus kelas yang masih memiliki siswa" },
        { status: 400 },
      )
    }

    await prisma.kelas.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: "Kelas berhasil dihapus",
    })
  } catch (error) {
    console.error("Error deleting kelas:", error)
    return NextResponse.json({ success: false, error: "Gagal menghapus kelas" }, { status: 500 })
  }
}
