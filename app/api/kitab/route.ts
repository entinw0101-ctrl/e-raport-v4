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
      where.nama_kitab = { contains: search, mode: "insensitive" }
    }

    // Get total count
    const total = await prisma.kitab.count({ where })

    const data = await prisma.kitab.findMany({
      where,
      orderBy: { nama_kitab: "asc" },
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
    console.error("Error fetching kitab:", error)
    return NextResponse.json({ success: false, error: "Gagal mengambil data kitab" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.nama_kitab) {
      return NextResponse.json({ success: false, error: "Nama kitab wajib diisi" }, { status: 400 })
    }

    const kitab = await prisma.kitab.create({
      data: {
        nama_kitab: body.nama_kitab,
      },
    })

    return NextResponse.json({
      success: true,
      data: kitab,
      message: "Kitab berhasil ditambahkan",
    })
  } catch (error) {
    console.error("Error creating kitab:", error)
    return NextResponse.json({ success: false, error: "Gagal menambahkan kitab" }, { status: 500 })
  }
}
