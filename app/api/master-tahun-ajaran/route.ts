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
        { nama_ajaran: { contains: search, mode: "insensitive" } },
      ]
    }

    // Get total count
    const total = await prisma.masterTahunAjaran.count({ where })

    // Get data with pagination
    const data = await prisma.masterTahunAjaran.findMany({
      where,
      include: {
        _count: {
          select: {
            siswa: true,
            periode_ajaran: true,
            riwayat_kelas_siswa: true,
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
    console.error("Error fetching master tahun ajaran:", error)
    return NextResponse.json({ success: false, error: "Gagal mengambil data master tahun ajaran" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.nama_ajaran) {
      return NextResponse.json({ success: false, error: "Nama ajaran wajib diisi" }, { status: 400 })
    }

    // Check if nama_ajaran already exists
    const existing = await prisma.masterTahunAjaran.findUnique({
      where: { nama_ajaran: body.nama_ajaran },
    })

    if (existing) {
      return NextResponse.json({ success: false, error: "Nama ajaran sudah digunakan" }, { status: 400 })
    }

    // Create with urutan field (temporary workaround until Prisma client is regenerated)
    const createData: any = {
      nama_ajaran: body.nama_ajaran,
      status: body.status || "nonaktif",
    }

    if (body.urutan !== undefined) {
      createData.urutan = body.urutan ? Number.parseInt(body.urutan) : null
    }

    const masterTahunAjaran = await prisma.masterTahunAjaran.create({
      data: createData,
    })

    // Auto-create Periode Ajaran for Semester 1 and 2
    await prisma.periodeAjaran.createMany({
      data: [
        {
          nama_ajaran: body.nama_ajaran,
          semester: "SATU",
          master_tahun_ajaran_id: masterTahunAjaran.id,
        },
        {
          nama_ajaran: body.nama_ajaran,
          semester: "DUA",
          master_tahun_ajaran_id: masterTahunAjaran.id,
        },
      ],
    })

    return NextResponse.json({
      success: true,
      data: masterTahunAjaran,
      message: "Master tahun ajaran berhasil ditambahkan beserta periode ajaran",
    })
  } catch (error) {
    console.error("Error creating master tahun ajaran:", error)
    return NextResponse.json({ success: false, error: "Gagal menambahkan master tahun ajaran" }, { status: 500 })
  }
}
