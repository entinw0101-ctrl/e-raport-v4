import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

    // Validate required fields
    if (!body.jabatan || !body.nama_pejabat || !body.jenis_kelamin_target) {
      return NextResponse.json({ success: false, error: "Jabatan, nama pejabat, dan target jenis kelamin wajib diisi" }, { status: 400 })
    }

    // Check if record exists
    const existing = await prisma.penanggungJawabRapot.findUnique({
      where: { id: Number(id) },
    })
    if (!existing) {
      return NextResponse.json({ success: false, error: "Penanggung jawab rapot tidak ditemukan" }, { status: 404 })
    }

    // Validate uniqueness for LAKI_LAKI and PEREMPUAN (exclude current record)
    if (body.jenis_kelamin_target === "LAKI_LAKI" || body.jenis_kelamin_target === "PEREMPUAN") {
      const duplicate = await prisma.penanggungJawabRapot.findFirst({
        where: {
          jenis_kelamin_target: body.jenis_kelamin_target,
          id: { not: Number(id) },
        },
      })
      if (duplicate) {
        return NextResponse.json({
          success: false,
          error: `Penanggung jawab rapot untuk target ${body.jenis_kelamin_target === "LAKI_LAKI" ? "Laki-laki" : "Perempuan"} sudah ada. Hanya boleh satu per target jenis kelamin.`
        }, { status: 400 })
      }
    }

    const penanggungJawabRapot = await prisma.penanggungJawabRapot.update({
      where: { id: Number(id) },
      data: {
        jabatan: body.jabatan,
        nama_pejabat: body.nama_pejabat,
        nip: body.nip,
        tanda_tangan: body.tanda_tangan,
        jenis_kelamin_target: body.jenis_kelamin_target,
        status: body.status || "aktif",
      },
    })

    return NextResponse.json({
      success: true,
      data: penanggungJawabRapot,
      message: "Penanggung jawab rapot berhasil diperbarui",
    })
  } catch (error) {
    console.error("Error updating penanggung jawab rapot:", error)
    return NextResponse.json({ success: false, error: "Gagal memperbarui penanggung jawab rapot" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Check if record exists
    const existing = await prisma.penanggungJawabRapot.findUnique({
      where: { id: Number(id) },
    })
    if (!existing) {
      return NextResponse.json({ success: false, error: "Penanggung jawab rapot tidak ditemukan" }, { status: 404 })
    }

    await prisma.penanggungJawabRapot.delete({
      where: { id: Number(id) },
    })

    return NextResponse.json({
      success: true,
      message: "Penanggung jawab rapot berhasil dihapus",
    })
  } catch (error) {
    console.error("Error deleting penanggung jawab rapot:", error)
    return NextResponse.json({ success: false, error: "Gagal menghapus penanggung jawab rapot" }, { status: 500 })
  }
}