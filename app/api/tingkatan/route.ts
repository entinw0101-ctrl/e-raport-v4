import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const data = await prisma.tingkatan.findMany({
      orderBy: { urutan: "asc" },
    })

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error("Error fetching tingkatan:", error)
    return NextResponse.json({ success: false, error: "Gagal mengambil data tingkatan" }, { status: 500 })
  }
}
