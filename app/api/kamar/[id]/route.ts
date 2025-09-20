import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number.parseInt(params.id)

    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: "ID tidak valid" }, { status: 400 })
    }

    const kamar = await prisma.kamar.findUnique({
      where: { id },
      include: {
        siswa: {
          select: {
            id: true,
            nama: true,
            nis: true,
          },
        },
      },
    })

    if (!kamar) {
      return NextResponse.json({ success: false, error: "Kamar tidak ditemukan" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: kamar,
    })
  } catch (error) {
    console.error("Error fetching kamar:", error)
    return NextResponse.json({ success: false, error: "Gagal mengambil data kamar" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number.parseInt(params.id)

    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: "ID tidak valid" }, { status: 400 })
    }

    const body = await request.json()

    // Validate required fields
    if (!body.nama_kamar) {
      return NextResponse.json({ success: false, error: "Nama kamar wajib diisi" }, { status: 400 })
    }

    const kamar = await prisma.kamar.update({
      where: { id },
      data: {
        nama_kamar: body.nama_kamar,
        kapasitas: body.kapasitas ? Number.parseInt(body.kapasitas) : null,
      },
    })

    return NextResponse.json({
      success: true,
      data: kamar,
      message: "Kamar berhasil diperbarui",
    })
  } catch (error) {
    console.error("Error updating kamar:", error)
    return NextResponse.json({ success: false, error: "Gagal memperbarui kamar" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number.parseInt(params.id)

    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: "ID tidak valid" }, { status: 400 })
    }

    // Check if kamar has related siswa
    const siswaCount = await prisma.siswa.count({
      where: { kamar_id: id },
    })

    if (siswaCount > 0) {
      return NextResponse.json({
        success: false,
        error: `Tidak dapat menghapus kamar karena masih ada ${siswaCount} siswa yang menggunakan kamar ini`
      }, { status: 400 })
    }

    await prisma.kamar.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: "Kamar berhasil dihapus",
    })
  } catch (error) {
    console.error("Error deleting kamar:", error)
    return NextResponse.json({ success: false, error: "Gagal menghapus kamar" }, { status: 500 })
  }
}