import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = await params
    const kelasId = Number.parseInt(id)

    const kelas = await prisma.kelas.findUnique({
      where: { id: kelasId },
      include: {
        wali_kelas: true,
        tingkatan: true,
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
    const { id } = await params
    const kelasId = Number.parseInt(id)
    const body = await request.json()

    // Check if kelas exists
    const existingKelas = await prisma.kelas.findUnique({
      where: { id: kelasId },
    })

    if (!existingKelas) {
      return NextResponse.json({ success: false, error: "Kelas tidak ditemukan" }, { status: 404 })
    }

    // Extract only the fields that belong to Kelas model
    const allowedFields = ['nama_kelas', 'kapasitas', 'wali_kelas_id', 'tingkatan_id']
    const data: any = {}

    // Handle each allowed field
    if (body.nama_kelas !== undefined) {
      data.nama_kelas = body.nama_kelas
    }

    if (body.kapasitas !== undefined) {
      data.kapasitas = body.kapasitas ? Number.parseInt(body.kapasitas) : null
    }

    if (body.wali_kelas_id !== undefined) {
      data.wali_kelas_id = body.wali_kelas_id ? Number.parseInt(body.wali_kelas_id) : null
    }

    if (body.tingkatan_id !== undefined) {
      data.tingkatan_id = body.tingkatan_id ? Number.parseInt(body.tingkatan_id) : null
    }

    const kelas = await prisma.kelas.update({
      where: { id: kelasId },
      data,
      include: {
        wali_kelas: true,
        tingkatan: true,
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
    const { id } = await params
    const kelasId = Number.parseInt(id)

    // Check if kelas exists
    const existingKelas = await prisma.kelas.findUnique({
      where: { id: kelasId },
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
      where: { id: kelasId },
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
