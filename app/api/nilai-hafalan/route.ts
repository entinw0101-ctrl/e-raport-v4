import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const per_page = Number.parseInt(searchParams.get("per_page") || "10")
    const siswa_id = searchParams.get("siswa_id")
    const mapel_id = searchParams.get("mapel_id")
    const periode_ajaran_id = searchParams.get("periode_ajaran_id")
    const kelas_id = searchParams.get("kelas_id")

    const skip = (page - 1) * per_page

    // Build where clause
    const where: any = {}

    if (siswa_id) {
      where.siswa_id = Number.parseInt(siswa_id)
    }

    if (mapel_id) {
      where.mapel_id = Number.parseInt(mapel_id)
    }

    if (periode_ajaran_id) {
      where.periode_ajaran_id = Number.parseInt(periode_ajaran_id)
    }

    if (kelas_id) {
      where.siswa = {
        kelas_id: Number.parseInt(kelas_id),
      }
    }

    // Get total count
    const total = await prisma.nilaiHafalan.count({ where })

    // Get data with pagination
    const data = await prisma.nilaiHafalan.findMany({
      where,
      include: {
        siswa: {
          include: {
            kelas: {
              include: {
                tingkatan: true,
              },
            },
          },
        },
        mata_pelajaran: true,
        periode_ajaran: {
          include: {
            master_tahun_ajaran: true,
          },
        },
      },
      orderBy: [{ siswa: { nama: "asc" } }, { mata_pelajaran: { nama_mapel: "asc" } }],
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
    console.error("Error fetching nilai hafalan:", error)
    return NextResponse.json({ success: false, error: "Gagal mengambil data nilai hafalan" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.siswa_id || !body.mapel_id || !body.periode_ajaran_id || !body.predikat) {
      return NextResponse.json(
        { success: false, error: "Siswa, mata pelajaran, periode ajaran, dan predikat wajib diisi" },
        { status: 400 },
      )
    }

    // Check if record already exists
    const existingNilai = await prisma.nilaiHafalan.findUnique({
      where: {
        siswa_id_mapel_id_periode_ajaran_id: {
          siswa_id: Number.parseInt(body.siswa_id),
          mapel_id: Number.parseInt(body.mapel_id),
          periode_ajaran_id: Number.parseInt(body.periode_ajaran_id),
        },
      },
    })

    if (existingNilai) {
      return NextResponse.json(
        { success: false, error: "Nilai untuk siswa, mata pelajaran, dan periode ini sudah ada" },
        { status: 400 },
      )
    }

    const data = {
      siswa_id: Number.parseInt(body.siswa_id),
      mapel_id: Number.parseInt(body.mapel_id),
      periode_ajaran_id: Number.parseInt(body.periode_ajaran_id),
      target_hafalan: body.target_hafalan || null,
      predikat: body.predikat,
    }

    const nilaiHafalan = await prisma.nilaiHafalan.create({
      data,
      include: {
        siswa: {
          include: {
            kelas: {
              include: {
                tingkatan: true,
              },
            },
          },
        },
        mata_pelajaran: true,
        periode_ajaran: {
          include: {
            master_tahun_ajaran: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: nilaiHafalan,
      message: "Nilai hafalan berhasil ditambahkan",
    })
  } catch (error) {
    console.error("Error creating nilai hafalan:", error)
    return NextResponse.json({ success: false, error: "Gagal menambahkan nilai hafalan" }, { status: 500 })
  }
}
