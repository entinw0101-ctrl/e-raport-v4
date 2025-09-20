import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const per_page = Number.parseInt(searchParams.get("per_page") || "10")
    const search = searchParams.get("search") || ""
    const master_tahun_ajaran_id = searchParams.get("master_tahun_ajaran_id")
    const semester = searchParams.get("semester")

    const skip = (page - 1) * per_page

    // Build where clause
    const where: any = {}

    if (search) {
      where.OR = [
        { nama_ajaran: { contains: search, mode: "insensitive" } },
      ]
    }

    if (master_tahun_ajaran_id) {
      where.master_tahun_ajaran_id = Number.parseInt(master_tahun_ajaran_id)
    }

    if (semester) {
      where.semester = semester
    }

    // Get total count
    const total = await prisma.periodeAjaran.count({ where })

    // Get data with pagination
    const data = await prisma.periodeAjaran.findMany({
      where,
      include: {
        master_tahun_ajaran: {
          select: {
            id: true,
            nama_ajaran: true,
            status: true,
          },
        },
        _count: {
          select: {
            nilai_ujian: true,
            nilai_hafalan: true,
            kehadiran: true,
            penilaian_sikap: true,
            ringkasan_rapot: true,
            kelas_periode: true,
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
    console.error("Error fetching periode ajaran:", error)
    return NextResponse.json({ success: false, error: "Gagal mengambil data periode ajaran" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.nama_ajaran || !body.semester) {
      return NextResponse.json({ success: false, error: "Nama ajaran dan semester wajib diisi" }, { status: 400 })
    }

    // Check if combination already exists
    const existing = await prisma.periodeAjaran.findUnique({
      where: {
        nama_ajaran_semester: {
          nama_ajaran: body.nama_ajaran,
          semester: body.semester,
        },
      },
    })

    if (existing) {
      return NextResponse.json({ success: false, error: "Kombinasi nama ajaran dan semester sudah ada" }, { status: 400 })
    }

    const periodeAjaran = await prisma.periodeAjaran.create({
      data: {
        nama_ajaran: body.nama_ajaran,
        semester: body.semester,
        master_tahun_ajaran_id: body.master_tahun_ajaran_id ? Number.parseInt(body.master_tahun_ajaran_id) : null,
      },
      include: {
        master_tahun_ajaran: {
          select: {
            id: true,
            nama_ajaran: true,
            status: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: periodeAjaran,
      message: "Periode ajaran berhasil ditambahkan",
    })
  } catch (error) {
    console.error("Error creating periode ajaran:", error)
    return NextResponse.json({ success: false, error: "Gagal menambahkan periode ajaran" }, { status: 500 })
  }
}
