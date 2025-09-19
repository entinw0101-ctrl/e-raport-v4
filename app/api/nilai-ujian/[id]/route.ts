import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)

    const nilaiUjian = await prisma.nilaiUjian.findUnique({
      where: { id },
      include: {
        siswa: {
          include: {
            kelas: {
              include: {
                tingkatan: true,
              },
            },
          },
        },
        mata_pelajaran: true,
        periode_ajaran: {
          include: {
            master_tahun_ajaran: true,
          },
        },
      },
    })

    if (!nilaiUjian) {
      return NextResponse.json({ success: false, error: "Nilai ujian tidak ditemukan" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: nilaiUjian,
    })
  } catch (error) {
    console.error("Error fetching nilai ujian:", error)
    return NextResponse.json({ success: false, error: "Gagal mengambil data nilai ujian" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    const body = await request.json()

    // Check if record exists
    const existingNilai = await prisma.nilaiUjian.findUnique({
      where: { id },
    })

    if (!existingNilai) {
      return NextResponse.json({ success: false, error: "Nilai ujian tidak ditemukan" }, { status: 404 })
    }

    // Convert and validate data
    const nilai_angka = Number.parseFloat(body.nilai_angka)
    if (isNaN(nilai_angka) || nilai_angka < 0 || nilai_angka > 100) {
      return NextResponse.json({ success: false, error: "Nilai harus berupa angka antara 0-100" }, { status: 400 })
    }

    // Determine predikat based on nilai_angka
    let predikat = ""
    if (nilai_angka >= 90) predikat = "A"
    else if (nilai_angka >= 80) predikat = "B"
    else if (nilai_angka >= 70) predikat = "C"
    else if (nilai_angka >= 60) predikat = "D"
    else predikat = "E"

    const data = {
      nilai_angka,
      predikat: body.predikat || predikat,
    }

    const nilaiUjian = await prisma.nilaiUjian.update({
      where: { id },
      data,
      include: {
        siswa: {
          include: {
            kelas: {
              include: {
                tingkatan: true,
              },
            },
          },
        },
        mata_pelajaran: true,
        periode_ajaran: {
          include: {
            master_tahun_ajaran: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: nilaiUjian,
      message: "Nilai ujian berhasil diperbarui",
    })
  } catch (error) {
    console.error("Error updating nilai ujian:", error)
    return NextResponse.json({ success: false, error: "Gagal memperbarui nilai ujian" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)

    // Check if record exists
    const existingNilai = await prisma.nilaiUjian.findUnique({
      where: { id },
    })

    if (!existingNilai) {
      return NextResponse.json({ success: false, error: "Nilai ujian tidak ditemukan" }, { status: 404 })
    }

    await prisma.nilaiUjian.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: "Nilai ujian berhasil dihapus",
    })
  } catch (error) {
    console.error("Error deleting nilai ujian:", error)
    return NextResponse.json({ success: false, error: "Gagal menghapus nilai ujian" }, { status: 500 })
  }
}
