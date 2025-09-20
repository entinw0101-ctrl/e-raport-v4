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

    const riwayatKelasSiswa = await prisma.riwayatKelasSiswa.findUnique({
      where: { id },
      include: {
        siswa: {
          select: {
            id: true,
            nama: true,
            nis: true,
          },
        },
        kelas: {
          select: {
            id: true,
            nama_kelas: true,
            tingkatan: {
              select: {
                nama_tingkatan: true,
              },
            },
          },
        },
        master_tahun_ajaran: {
          select: {
            id: true,
            nama_ajaran: true,
          },
        },
      },
    })

    if (!riwayatKelasSiswa) {
      return NextResponse.json({ success: false, error: "Riwayat kelas siswa tidak ditemukan" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: riwayatKelasSiswa,
    })
  } catch (error) {
    console.error("Error fetching riwayat kelas siswa:", error)
    return NextResponse.json({ success: false, error: "Gagal mengambil data riwayat kelas siswa" }, { status: 500 })
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
    if (!body.siswa_id || !body.kelas_id) {
      return NextResponse.json({ success: false, error: "Siswa dan kelas wajib diisi" }, { status: 400 })
    }

    const riwayatKelasSiswa = await prisma.riwayatKelasSiswa.update({
      where: { id },
      data: {
        siswa_id: Number.parseInt(body.siswa_id),
        kelas_id: Number.parseInt(body.kelas_id),
        master_tahun_ajaran_id: body.master_tahun_ajaran_id ? Number.parseInt(body.master_tahun_ajaran_id) : null,
      },
      include: {
        siswa: {
          select: {
            id: true,
            nama: true,
            nis: true,
          },
        },
        kelas: {
          select: {
            id: true,
            nama_kelas: true,
            tingkatan: {
              select: {
                nama_tingkatan: true,
              },
            },
          },
        },
        master_tahun_ajaran: {
          select: {
            id: true,
            nama_ajaran: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: riwayatKelasSiswa,
      message: "Riwayat kelas siswa berhasil diperbarui",
    })
  } catch (error) {
    console.error("Error updating riwayat kelas siswa:", error)
    return NextResponse.json({ success: false, error: "Gagal memperbarui riwayat kelas siswa" }, { status: 500 })
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

    await prisma.riwayatKelasSiswa.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: "Riwayat kelas siswa berhasil dihapus",
    })
  } catch (error) {
    console.error("Error deleting riwayat kelas siswa:", error)
    return NextResponse.json({ success: false, error: "Gagal menghapus riwayat kelas siswa" }, { status: 500 })
  }
}