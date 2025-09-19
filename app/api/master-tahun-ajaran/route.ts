import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const data = await prisma.masterTahunAjaran.findMany({
      orderBy: { nama_ajaran: "desc" },
    })

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error("Error fetching master tahun ajaran:", error)
    return NextResponse.json({ success: false, error: "Gagal mengambil data tahun ajaran" }, { status: 500 })
  }
}
