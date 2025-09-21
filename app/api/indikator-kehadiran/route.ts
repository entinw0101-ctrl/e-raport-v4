import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    console.log("Fetching indikator kehadiran data...")
    console.log("Database URL exists:", !!process.env.DATABASE_URL)
    console.log("Node env:", process.env.NODE_ENV)

    // Test database connection
    try {
      await prisma.$connect()
      console.log("Database connection successful")
    } catch (dbError) {
      console.error("Database connection failed:", dbError)
      return NextResponse.json({
        success: false,
        error: "Database connection failed",
        details: dbError instanceof Error ? dbError.message : 'Unknown DB error'
      }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const per_page = Number.parseInt(searchParams.get("per_page") || "10")
    const search = searchParams.get("search") || ""

    console.log(`Page: ${page}, Per page: ${per_page}, Search: ${search}`)

    const skip = (page - 1) * per_page

    // Build where clause
    const where: any = {}
    if (search) {
      where.OR = [
        { nama_indikator: { contains: search, mode: "insensitive" } },
      ]
    }

    console.log("Where clause:", where)

    // Get total count
    const total = await prisma.indikatorKehadiran.count({ where })
    console.log(`Total records: ${total}`)

    const data = await prisma.indikatorKehadiran.findMany({
      where,
      orderBy: { nama_indikator: "asc" },
      skip,
      take: per_page,
    })

    console.log(`Fetched ${data.length} records`)

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
    console.error("Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    })
    return NextResponse.json({
      success: false,
      error: "Gagal mengambil data indikator kehadiran",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
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
      data: {
        nama_indikator: body.nama_indikator,
        deskripsi: body.deskripsi || null,
      },
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