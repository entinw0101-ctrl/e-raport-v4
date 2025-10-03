import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: "Akses ditolak. Hanya admin yang dapat mengakses fitur ini." },
        { status: 403 }
      )
    }

    const { ids, deleteAll } = await request.json()

    if (deleteAll) {
      // Delete all records
      const result = await prisma.kehadiran.deleteMany({})

      return NextResponse.json({
        success: true,
        message: `Berhasil menghapus ${result.count} data kehadiran`,
        deletedCount: result.count
      })
    } else if (ids && Array.isArray(ids) && ids.length > 0) {
      // Delete selected records
      const result = await prisma.kehadiran.deleteMany({
        where: {
          id: {
            in: ids.map(id => parseInt(id.toString()))
          }
        }
      })

      return NextResponse.json({
        success: true,
        message: `Berhasil menghapus ${result.count} data kehadiran`,
        deletedCount: result.count
      })
    } else {
      return NextResponse.json({
        success: false,
        error: "Parameter ids atau deleteAll diperlukan"
      }, { status: 400 })
    }
  } catch (error) {
    console.error("Error bulk deleting kehadiran:", error)
    return NextResponse.json({
      success: false,
      error: "Gagal menghapus data kehadiran"
    }, { status: 500 })
  }
}