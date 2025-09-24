import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)

    const guru = await prisma.guru.findUnique({
      where: { id },
      include: {
        kelas_wali: {
          include: {
            tingkatan: true,
          },
        },
      },
    })

    if (!guru) {
      return NextResponse.json({ success: false, error: "Guru tidak ditemukan" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: guru,
    })
  } catch (error) {
    console.error("Error fetching guru:", error)
    return NextResponse.json({ success: false, error: "Gagal mengambil data guru" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    const body = await request.json()

    // Check if guru exists
    const existingGuru = await prisma.guru.findUnique({
      where: { id },
    })

    if (!existingGuru) {
      return NextResponse.json({ success: false, error: "Guru tidak ditemukan" }, { status: 404 })
    }

    // Check if NIP is being changed and already exists
    if (body.nip && body.nip !== existingGuru.nip) {
      const nipExists = await prisma.guru.findFirst({
        where: { nip: body.nip },
      })

      if (nipExists) {
        return NextResponse.json({ success: false, error: "NIP sudah digunakan" }, { status: 400 })
      }
    }

    // Extract relations and files to handle separately
    const { kelas_wali, tanda_tangan, ...guruData } = body

    const data: any = {
      ...guruData,
      tanggal_lahir: body.tanggal_lahir ? new Date(body.tanggal_lahir) : null,
    }

    // Handle kelas_wali relation
    if (kelas_wali && Array.isArray(kelas_wali)) {
      data.kelas_wali = {
        set: kelas_wali.map((kelas: any) => ({ id: kelas.id })),
      }
    }

    // Note: tanda_tangan should be handled via separate /api/upload/signature endpoint
    // Similar to data table upload functionality

    const guru = await prisma.guru.update({
      where: { id },
      data,
      include: {
        kelas_wali: {
          include: {
            tingkatan: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: guru,
      message: "Guru berhasil diperbarui",
    })
  } catch (error) {
    console.error("Error updating guru:", error)
    return NextResponse.json({ success: false, error: "Gagal memperbarui guru" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)

    // Check if guru exists
    const existingGuru = await prisma.guru.findUnique({
      where: { id },
    })

    if (!existingGuru) {
      return NextResponse.json({ success: false, error: "Guru tidak ditemukan" }, { status: 404 })
    }

    await prisma.guru.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: "Guru berhasil dihapus",
    })
  } catch (error) {
    console.error("Error deleting guru:", error)
    return NextResponse.json({ success: false, error: "Gagal menghapus guru" }, { status: 500 })
  }
}
