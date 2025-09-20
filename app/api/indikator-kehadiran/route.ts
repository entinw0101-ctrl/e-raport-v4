import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const per_page = Number.parseInt(searchParams.get("per_page") || "10")
    const search = searchParams.get("search") || ""

    const skip = (page - 1) * per_page

    // Build where clause
    const where: any = {}
    if (search) {
      where.OR = [
        { nama_indikator: { contains: search, mode: "insensitive" } },
      ]
    }

    // Get total count
    const total = await prisma.indikatorKehadiran.count({ where })

    const data = await prisma.indikatorKehadiran.findMany({
      where,
      orderBy: { nama_indikator: "asc" },
      skip,
      take: per_page,
    })

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        per_page,
        total,
        total_pages: Math.ceil(total / per_page),
      },
    })
  } catch (error) {
    console.error("Error fetching indikator kehadiran:", error)
    return NextResponse.json({ success: false, error: "Gagal mengambil data indikator kehadiran" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.nama_indikator) {
      return NextResponse.json({ success: false, error: "Nama indikator wajib diisi" }, { status: 400 })
    }

    const indikatorKehadiran = await prisma.indikatorKehadiran.create({
      data: body,
    })

    return NextResponse.json({
      success: true,
      data: indikatorKehadiran,
      message: "Indikator kehadiran berhasil ditambahkan",
    })
  } catch (error) {
    console.error("Error creating indikator kehadiran:", error)
    return NextResponse.json({ success: false, error: "Gagal menambahkan indikator kehadiran" }, { status: 500 })
  }
}