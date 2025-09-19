import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jenis = searchParams.get("jenis")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const per_page = Number.parseInt(searchParams.get("per_page") || "10")
    const search = searchParams.get("search") || ""

    const skip = (page - 1) * per_page

    // Build where clause
    const where: any = {}
    if (jenis) {
      where.jenis = jenis
    }
    if (search) {
      where.OR = [
        { nama_mapel: { contains: search, mode: "insensitive" } },
        { kode_mapel: { contains: search, mode: "insensitive" } },
      ]
    }

    // Get total count
    const total = await prisma.mataPelajaran.count({ where })

    const data = await prisma.mataPelajaran.findMany({
      where,
      orderBy: { nama_mapel: "asc" },
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
    console.error("Error fetching mata pelajaran:", error)
    return NextResponse.json({ success: false, error: "Gagal mengambil data mata pelajaran" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.nama_mapel || !body.jenis) {
      return NextResponse.json({ success: false, error: "Nama mata pelajaran dan jenis wajib diisi" }, { status: 400 })
    }

    // Check if kode_mapel already exists (if provided)
    if (body.kode_mapel) {
      const existingMapel = await prisma.mataPelajaran.findFirst({
        where: { kode_mapel: body.kode_mapel },
      })

      if (existingMapel) {
        return NextResponse.json({ success: false, error: "Kode mata pelajaran sudah digunakan" }, { status: 400 })
      }
    }

    const mataPelajaran = await prisma.mataPelajaran.create({
      data: body,
    })

    return NextResponse.json({
      success: true,
      data: mataPelajaran,
      message: "Mata pelajaran berhasil ditambahkan",
    })
  } catch (error) {
    console.error("Error creating mata pelajaran:", error)
    return NextResponse.json({ success: false, error: "Gagal menambahkan mata pelajaran" }, { status: 500 })
  }
}
