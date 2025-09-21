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
        { indikator: { contains: search, mode: "insensitive" } },
      ]
    }

    // Get total count
    const total = await prisma.indikatorSikap.count({ where })

    const data = await prisma.indikatorSikap.findMany({
      where,
      orderBy: { indikator: "asc" },
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
    console.error("Error fetching indikator sikap:", error)
    return NextResponse.json({ success: false, error: "Gagal mengambil data indikator sikap" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.indikator) {
      return NextResponse.json({ success: false, error: "Indikator wajib diisi" }, { status: 400 })
    }

    if (!body.jenis_sikap) {
      return NextResponse.json({ success: false, error: "Jenis sikap wajib diisi" }, { status: 400 })
    }

    // Validate jenis_sikap enum
    if (!['Spiritual', 'Sosial'].includes(body.jenis_sikap)) {
      return NextResponse.json({ success: false, error: "Jenis sikap harus 'Spiritual' atau 'Sosial'" }, { status: 400 })
    }

    const indikatorSikap = await prisma.indikatorSikap.create({
      data: body,
    })

    return NextResponse.json({
      success: true,
      data: indikatorSikap,
      message: "Indikator sikap berhasil ditambahkan",
    })
  } catch (error) {
    console.error("Error creating indikator sikap:", error)
    return NextResponse.json({ success: false, error: "Gagal menambahkan indikator sikap" }, { status: 500 })
  }
}
