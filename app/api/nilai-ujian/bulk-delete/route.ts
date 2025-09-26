import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const { ids, deleteAll } = await request.json()

    if (deleteAll) {
      // Delete all records
      const result = await prisma.nilaiUjian.deleteMany({})

      return NextResponse.json({
        success: true,
        message: `Berhasil menghapus ${result.count} data nilai ujian`,
        deletedCount: result.count
      })
    } else if (ids && Array.isArray(ids) && ids.length > 0) {
      // Delete selected records
      const result = await prisma.nilaiUjian.deleteMany({
        where: {
          id: {
            in: ids.map(id => parseInt(id.toString()))
          }
        }
      })

      return NextResponse.json({
        success: true,
        message: `Berhasil menghapus ${result.count} data nilai ujian`,
        deletedCount: result.count
      })
    } else {
      return NextResponse.json({
        success: false,
        error: "Parameter ids atau deleteAll diperlukan"
      }, { status: 400 })
    }
  } catch (error) {
    console.error("Error bulk deleting nilai ujian:", error)
    return NextResponse.json({
      success: false,
      error: "Gagal menghapus data nilai ujian"
    }, { status: 500 })
  }
}