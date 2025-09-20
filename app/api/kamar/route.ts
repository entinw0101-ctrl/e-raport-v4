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
        { nama_kamar: { contains: search, mode: "insensitive" } },
      ]
    }

    // Get total count
    const total = await prisma.kamar.count({ where })

    // Get data with pagination
    const data = await prisma.kamar.findMany({
      where,
      orderBy: { nama_kamar: "asc" },
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
    console.error("Error fetching kamar:", error)
    return NextResponse.json({ success: false, error: "Gagal mengambil data kamar" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.nama_kamar) {
      return NextResponse.json({ success: false, error: "Nama kamar wajib diisi" }, { status: 400 })
    }

    const kamar = await prisma.kamar.create({
      data: {
        nama_kamar: body.nama_kamar,
        kapasitas: body.kapasitas ? Number.parseInt(body.kapasitas) : null,
      },
    })

    return NextResponse.json({
      success: true,
      data: kamar,
      message: "Kamar berhasil ditambahkan",
    })
  } catch (error) {
    console.error("Error creating kamar:", error)
    return NextResponse.json({ success: false, error: "Gagal menambahkan kamar" }, { status: 500 })
  }
}