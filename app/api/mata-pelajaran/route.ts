import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jenis = searchParams.get("jenis")

    // Build where clause
    const where: any = {}
    if (jenis) {
      where.jenis = jenis
    }

    const data = await prisma.mataPelajaran.findMany({
      where,
      orderBy: { nama_mapel: "asc" },
    })

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error("Error fetching mata pelajaran:", error)
    return NextResponse.json({ success: false, error: "Gagal mengambil data mata pelajaran" }, { status: 500 })
  }
}
