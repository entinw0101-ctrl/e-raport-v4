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
        { kelas: { nama_kelas: { contains: search, mode: "insensitive" } } },
        { periode_ajaran: { nama_ajaran: { contains: search, mode: "insensitive" } } },
      ]
    }

    // Get total count
    const total = await prisma.kelasPeriode.count({ where })

    // Get data with pagination
    const data = await prisma.kelasPeriode.findMany({
      where,
      include: {
        kelas: {
          select: {
            id: true,
            nama_kelas: true,
            tingkatan: {
              select: {
                nama_tingkatan: true,
              },
            },
          },
        },
        periode_ajaran: {
          select: {
            id: true,
            nama_ajaran: true,
            semester: true,
          },
        },
      },
      orderBy: { dibuat_pada: "desc" },
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
    console.error("Error fetching kelas periode:", error)
    return NextResponse.json({ success: false, error: "Gagal mengambil data kelas periode" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.kelas_id || !body.periode_ajaran_id) {
      return NextResponse.json({ success: false, error: "Kelas dan periode ajaran wajib diisi" }, { status: 400 })
    }

    // Check if combination already exists
    const existing = await prisma.kelasPeriode.findUnique({
      where: {
        kelas_id_periode_ajaran_id: {
          kelas_id: Number.parseInt(body.kelas_id),
          periode_ajaran_id: Number.parseInt(body.periode_ajaran_id),
        },
      },
    })

    if (existing) {
      return NextResponse.json({ success: false, error: "Kombinasi kelas dan periode ajaran sudah ada" }, { status: 400 })
    }

    const kelasPeriode = await prisma.kelasPeriode.create({
      data: {
        kelas_id: Number.parseInt(body.kelas_id),
        periode_ajaran_id: Number.parseInt(body.periode_ajaran_id),
      },
      include: {
        kelas: {
          select: {
            id: true,
            nama_kelas: true,
            tingkatan: {
              select: {
                nama_tingkatan: true,
              },
            },
          },
        },
        periode_ajaran: {
          select: {
            id: true,
            nama_ajaran: true,
            semester: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: kelasPeriode,
      message: "Kelas periode berhasil ditambahkan",
    })
  } catch (error) {
    console.error("Error creating kelas periode:", error)
    return NextResponse.json({ success: false, error: "Gagal menambahkan kelas periode" }, { status: 500 })
  }
}