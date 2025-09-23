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
        { mata_pelajaran: { nama_mapel: { contains: search, mode: "insensitive" } } },
        { kitab: { nama_kitab: { contains: search, mode: "insensitive" } } },
        { tingkatan: { nama_tingkatan: { contains: search, mode: "insensitive" } } },
      ]
    }

    // Get total count
    const total = await prisma.kurikulum.count({ where })

    // Get data with pagination
    const data = await prisma.kurikulum.findMany({
      where,
      include: {
        mata_pelajaran: true,
        kitab: true,
        tingkatan: true,
      },
      orderBy: [
        { tingkatan: { urutan: "asc" } },
        { mata_pelajaran: { jenis: "asc" } },
        { mata_pelajaran: { nama_mapel: "asc" } }
      ],
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
    console.error("Error fetching kurikulum:", error)
    return NextResponse.json({ success: false, error: "Gagal mengambil data kurikulum" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.tingkatan_id) {
      return NextResponse.json({ success: false, error: "Tingkatan wajib diisi" }, { status: 400 })
    }

    const data = await prisma.kurikulum.create({
      data: {
        mapel_id: body.mapel_id ? Number.parseInt(body.mapel_id) : null,
        kitab_id: body.kitab_id ? Number.parseInt(body.kitab_id) : null,
        batas_hafalan: body.batas_hafalan || null,
        tingkatan_id: Number.parseInt(body.tingkatan_id),
      },
      include: {
        mata_pelajaran: true,
        kitab: true,
        tingkatan: true,
      },
    })

    return NextResponse.json({
      success: true,
      data,
      message: "Kurikulum berhasil ditambahkan",
    })
  } catch (error) {
    console.error("Error creating kurikulum:", error)
    return NextResponse.json({ success: false, error: "Gagal menambahkan kurikulum" }, { status: 500 })
  }
}
