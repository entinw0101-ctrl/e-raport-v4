import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const master_tahun_ajaran_id = searchParams.get("master_tahun_ajaran_id")

    // Build where clause
    const where: any = {}
    if (master_tahun_ajaran_id) {
      where.master_tahun_ajaran_id = Number.parseInt(master_tahun_ajaran_id)
    }

    const data = await prisma.periodeAjaran.findMany({
      where,
      include: {
        master_tahun_ajaran: true,
      },
      orderBy: [{ master_tahun_ajaran: { nama_ajaran: "desc" } }, { semester: "asc" }],
    })

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error("Error fetching periode ajaran:", error)
    return NextResponse.json({ success: false, error: "Gagal mengambil data periode ajaran" }, { status: 500 })
  }
}
