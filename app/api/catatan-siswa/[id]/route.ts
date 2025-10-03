import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { createAuditLog, getClientInfo } from "@/lib/audit-log"

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
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: "Akses ditolak. Hanya admin yang dapat mengakses fitur ini." },
        { status: 403 }
      )
    }

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
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: "Akses ditolak. Hanya admin yang dapat mengakses fitur ini." },
        { status: 403 }
      )
    }

    const resolvedParams = await params
    const id = parseInt(resolvedParams.id)

    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: "ID tidak valid" },
        { status: 400 }
      )
    }

    // Get record for audit logging before deletion
    const catatanSiswa = await prisma.catatanSiswa.findUnique({
      where: { id },
      include: {
        siswa: true,
      },
    })

    if (!catatanSiswa) {
      return NextResponse.json(
        { success: false, error: "Catatan siswa tidak ditemukan" },
        { status: 404 }
      )
    }

    await prisma.catatanSiswa.delete({
      where: { id },
    })

    // Audit logging
    const clientInfo = getClientInfo(request)
    await createAuditLog({
      admin_id: session.id,
      action: 'DELETE',
      table_name: 'catatan_siswa',
      record_id: id.toString(),
      old_values: {
        catatan_akademik: catatanSiswa.catatan_akademik,
        catatan_sikap: catatanSiswa.catatan_sikap
      },
      description: `Catatan siswa ${catatanSiswa.siswa.nama} dihapus`,
      ...clientInfo,
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