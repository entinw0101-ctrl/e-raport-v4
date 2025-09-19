import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)

    const siswa = await prisma.siswa.findUnique({
      where: { id },
      include: {
        kelas: {
          include: {
            tingkatan: true,
          },
        },
        kamar: true,
        master_tahun_ajaran: true,
      },
    })

    if (!siswa) {
      return NextResponse.json({ success: false, error: "Siswa tidak ditemukan" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: siswa,
    })
  } catch (error) {
    console.error("Error fetching siswa:", error)
    return NextResponse.json({ success: false, error: "Gagal mengambil data siswa" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    const body = await request.json()

    // Check if siswa exists
    const existingSiswa = await prisma.siswa.findUnique({
      where: { id },
    })

    if (!existingSiswa) {
      return NextResponse.json({ success: false, error: "Siswa tidak ditemukan" }, { status: 404 })
    }

    // Check if NIS is being changed and already exists
    if (body.nis && body.nis !== existingSiswa.nis) {
      const nisExists = await prisma.siswa.findUnique({
        where: { nis: body.nis },
      })

      if (nisExists) {
        return NextResponse.json({ success: false, error: "NIS sudah digunakan" }, { status: 400 })
      }
    }

    // Convert date strings to Date objects
    const data = {
      ...body,
      tanggal_lahir: body.tanggal_lahir ? new Date(body.tanggal_lahir) : null,
      kelas_id: body.kelas_id ? Number.parseInt(body.kelas_id) : null,
      kamar_id: body.kamar_id ? Number.parseInt(body.kamar_id) : null,
      master_tahun_ajaran_id: body.master_tahun_ajaran_id ? Number.parseInt(body.master_tahun_ajaran_id) : null,
    }

    const siswa = await prisma.siswa.update({
      where: { id },
      data,
      include: {
        kelas: {
          include: {
            tingkatan: true,
          },
        },
        kamar: true,
        master_tahun_ajaran: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: siswa,
      message: "Siswa berhasil diperbarui",
    })
  } catch (error) {
    console.error("Error updating siswa:", error)
    return NextResponse.json({ success: false, error: "Gagal memperbarui siswa" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)

    // Check if siswa exists
    const existingSiswa = await prisma.siswa.findUnique({
      where: { id },
    })

    if (!existingSiswa) {
      return NextResponse.json({ success: false, error: "Siswa tidak ditemukan" }, { status: 404 })
    }

    await prisma.siswa.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: "Siswa berhasil dihapus",
    })
  } catch (error) {
    console.error("Error deleting siswa:", error)
    return NextResponse.json({ success: false, error: "Gagal menghapus siswa" }, { status: 500 })
  }
}
