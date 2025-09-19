import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const per_page = Number.parseInt(searchParams.get("per_page") || "10")
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status")

    const skip = (page - 1) * per_page

    // Build where clause
    const where: any = {}

    if (search) {
      where.OR = [
        { nama: { contains: search, mode: "insensitive" } },
        { nip: { contains: search, mode: "insensitive" } },
      ]
    }

    if (status) {
      where.status = status
    }

    // Get total count
    const total = await prisma.guru.count({ where })

    // Get data with pagination
    const data = await prisma.guru.findMany({
      where,
      include: {
        kelas_wali: {
          include: {
            tingkatan: true,
          },
        },
      },
      orderBy: { nama: "asc" },
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
    console.error("Error fetching guru:", error)
    return NextResponse.json({ success: false, error: "Gagal mengambil data guru" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.nama) {
      return NextResponse.json({ success: false, error: "Nama wajib diisi" }, { status: 400 })
    }

    // Check if NIP already exists (if provided)
    if (body.nip) {
      const existingGuru = await prisma.guru.findFirst({
        where: { nip: body.nip },
      })

      if (existingGuru) {
        return NextResponse.json({ success: false, error: "NIP sudah digunakan" }, { status: 400 })
      }
    }

    // Convert date strings to Date objects
    const data = {
      ...body,
      tanggal_lahir: body.tanggal_lahir ? new Date(body.tanggal_lahir) : null,
    }

    const guru = await prisma.guru.create({
      data,
      include: {
        kelas_wali: {
          include: {
            tingkatan: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: guru,
      message: "Guru berhasil ditambahkan",
    })
  } catch (error) {
    console.error("Error creating guru:", error)
    return NextResponse.json({ success: false, error: "Gagal menambahkan guru" }, { status: 500 })
  }
}
