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
        { catatan: { contains: search, mode: "insensitive" } },
        { tahun_ajaran_dari: { nama_ajaran: { contains: search, mode: "insensitive" } } },
        { tahun_ajaran_ke: { nama_ajaran: { contains: search, mode: "insensitive" } } },
      ]
    }

    // Get total count
    const total = await prisma.logPromosi.count({ where })

    // Get data with pagination
    const data = await prisma.logPromosi.findMany({
      where,
      include: {
        tahun_ajaran_dari: {
          select: {
            id: true,
            nama_ajaran: true,
            semester: true,
          },
        },
        tahun_ajaran_ke: {
          select: {
            id: true,
            nama_ajaran: true,
            semester: true,
          },
        },
        kelas_dari: {
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
        kelas_ke: {
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
    console.error("Error fetching log promosi:", error)
    return NextResponse.json({ success: false, error: "Gagal mengambil data log promosi" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const logPromosi = await prisma.logPromosi.create({
      data: {
        tahun_ajaran_dari_id: body.tahun_ajaran_dari_id ? Number.parseInt(body.tahun_ajaran_dari_id) : null,
        tahun_ajaran_ke_id: body.tahun_ajaran_ke_id ? Number.parseInt(body.tahun_ajaran_ke_id) : null,
        kelas_dari_id: body.kelas_dari_id ? Number.parseInt(body.kelas_dari_id) : null,
        kelas_ke_id: body.kelas_ke_id ? Number.parseInt(body.kelas_ke_id) : null,
        dieksekusi_oleh: body.dieksekusi_oleh ? Number.parseInt(body.dieksekusi_oleh) : null,
        catatan: body.catatan,
      },
      include: {
        tahun_ajaran_dari: {
          select: {
            id: true,
            nama_ajaran: true,
            semester: true,
          },
        },
        tahun_ajaran_ke: {
          select: {
            id: true,
            nama_ajaran: true,
            semester: true,
          },
        },
        kelas_dari: {
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
        kelas_ke: {
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
      },
    })

    return NextResponse.json({
      success: true,
      data: logPromosi,
      message: "Log promosi berhasil ditambahkan",
    })
  } catch (error) {
    console.error("Error creating log promosi:", error)
    return NextResponse.json({ success: false, error: "Gagal menambahkan log promosi" }, { status: 500 })
  }
}