import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const id = parseInt(resolvedParams.id)

    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: "ID tidak valid" },
        { status: 400 }
      )
    }

    const catatanSiswa = await prisma.catatanSiswa.findUnique({
      where: { id },
      include: {
        siswa: {
          include: {
            kelas: true,
          },
        },
        periode_ajaran: true,
      },
    })

    if (!catatanSiswa) {
      return NextResponse.json(
        { success: false, error: "Catatan siswa tidak ditemukan" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: catatanSiswa,
    })
  } catch (error) {
    console.error("Error fetching catatan siswa:", error)
    return NextResponse.json(
      { success: false, error: "Gagal mengambil data catatan siswa" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const id = parseInt(resolvedParams.id)
    const body = await request.json()
    const { catatan_sikap, catatan_akademik } = body

    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: "ID tidak valid" },
        { status: 400 }
      )
    }

    const catatanSiswa = await prisma.catatanSiswa.update({
      where: { id },
      data: {
        catatan_sikap: catatan_sikap || null,
        catatan_akademik: catatan_akademik || null,
      },
      include: {
        siswa: {
          include: {
            kelas: true,
          },
        },
        periode_ajaran: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: catatanSiswa,
      message: "Catatan siswa berhasil diperbarui",
    })
  } catch (error) {
    console.error("Error updating catatan siswa:", error)
    return NextResponse.json(
      { success: false, error: "Gagal memperbarui catatan siswa" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const id = parseInt(resolvedParams.id)

    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: "ID tidak valid" },
        { status: 400 }
      )
    }

    await prisma.catatanSiswa.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: "Catatan siswa berhasil dihapus",
    })
  } catch (error) {
    console.error("Error deleting catatan siswa:", error)
    return NextResponse.json(
      { success: false, error: "Gagal menghapus catatan siswa" },
      { status: 500 }
    )
  }
}