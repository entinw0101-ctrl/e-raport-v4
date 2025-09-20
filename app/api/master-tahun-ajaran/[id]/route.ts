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

    const masterTahunAjaran = await prisma.masterTahunAjaran.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            siswa: true,
            periode_ajaran: true,
            riwayat_kelas_siswa: true,
          },
        },
        periode_ajaran: {
          include: {
            _count: {
              select: {
                nilai_ujian: true,
                nilai_hafalan: true,
                kehadiran: true,
                penilaian_sikap: true,
              },
            },
          },
        },
      },
    })

    if (!masterTahunAjaran) {
      return NextResponse.json({ success: false, error: "Master tahun ajaran tidak ditemukan" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: masterTahunAjaran,
    })
  } catch (error) {
    console.error("Error fetching master tahun ajaran:", error)
    return NextResponse.json({ success: false, error: "Gagal mengambil data master tahun ajaran" }, { status: 500 })
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
    if (!body.nama_ajaran) {
      return NextResponse.json({ success: false, error: "Nama ajaran wajib diisi" }, { status: 400 })
    }

    // Check if nama_ajaran already exists (excluding current record)
    const existing = await prisma.masterTahunAjaran.findFirst({
      where: {
        nama_ajaran: body.nama_ajaran,
        id: { not: id },
      },
    })

    if (existing) {
      return NextResponse.json({ success: false, error: "Nama ajaran sudah digunakan" }, { status: 400 })
    }

    const masterTahunAjaran = await prisma.masterTahunAjaran.update({
      where: { id },
      data: {
        nama_ajaran: body.nama_ajaran,
        status: body.status,
      },
    })

    return NextResponse.json({
      success: true,
      data: masterTahunAjaran,
      message: "Master tahun ajaran berhasil diperbarui",
    })
  } catch (error) {
    console.error("Error updating master tahun ajaran:", error)
    return NextResponse.json({ success: false, error: "Gagal memperbarui master tahun ajaran" }, { status: 500 })
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

    // Check if master tahun ajaran has related records
    const relatedCounts = await prisma.masterTahunAjaran.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            siswa: true,
            periode_ajaran: true,
            riwayat_kelas_siswa: true,
          },
        },
      },
    })

    if (relatedCounts && (
      relatedCounts._count.siswa > 0 ||
      relatedCounts._count.periode_ajaran > 0 ||
      relatedCounts._count.riwayat_kelas_siswa > 0
    )) {
      return NextResponse.json({
        success: false,
        error: `Tidak dapat menghapus master tahun ajaran karena masih memiliki data terkait: ${relatedCounts._count.siswa} siswa, ${relatedCounts._count.periode_ajaran} periode ajaran, ${relatedCounts._count.riwayat_kelas_siswa} riwayat kelas`
      }, { status: 400 })
    }

    await prisma.masterTahunAjaran.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: "Master tahun ajaran berhasil dihapus",
    })
  } catch (error) {
    console.error("Error deleting master tahun ajaran:", error)
    return NextResponse.json({ success: false, error: "Gagal menghapus master tahun ajaran" }, { status: 500 })
  }
}