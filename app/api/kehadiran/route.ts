import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const per_page = Number.parseInt(searchParams.get("per_page") || "10")
    const siswa_id = searchParams.get("siswa_id")
    const indikator_kehadiran_id = searchParams.get("indikator_kehadiran_id")
    const periode_ajaran_id = searchParams.get("periode_ajaran_id")
    const kelas_id = searchParams.get("kelas_id")

    const skip = (page - 1) * per_page

    // Build where clause
    const where: any = {}

    if (siswa_id) {
      where.siswa_id = Number.parseInt(siswa_id)
    }

    if (indikator_kehadiran_id) {
      where.indikator_kehadiran_id = Number.parseInt(indikator_kehadiran_id)
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
    const total = await prisma.kehadiran.count({ where })

    // Get data with pagination
    const data = await prisma.kehadiran.findMany({
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
        indikator_kehadiran: true,
        periode_ajaran: {
          include: {
            master_tahun_ajaran: true,
          },
        },
      },
      orderBy: [{ siswa: { nama: "asc" } }, { indikator_kehadiran: { nama_indikator: "asc" } }],
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
    console.error("Error fetching kehadiran:", error)
    return NextResponse.json({ success: false, error: "Gagal mengambil data kehadiran" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.siswa_id || !body.indikator_kehadiran_id || !body.periode_ajaran_id || body.sakit === undefined || body.izin === undefined || body.alpha === undefined) {
      return NextResponse.json(
        { success: false, error: "Siswa, indikator kehadiran, periode ajaran, sakit, izin, dan alpha wajib diisi" },
        { status: 400 },
      )
    }

    // Check if record already exists
    const existingKehadiran = await prisma.kehadiran.findFirst({
      where: {
        siswa_id: Number.parseInt(body.siswa_id),
        indikator_kehadiran_id: Number.parseInt(body.indikator_kehadiran_id),
        periode_ajaran_id: Number.parseInt(body.periode_ajaran_id),
      },
    })

    if (existingKehadiran) {
      return NextResponse.json(
        { success: false, error: "Data kehadiran untuk siswa, indikator, dan periode ini sudah ada" },
        { status: 400 },
      )
    }

    // Convert and validate data
    const sakit = Number.parseInt(body.sakit)
    const izin = Number.parseInt(body.izin)
    const alpha = Number.parseInt(body.alpha)

    if (isNaN(sakit) || sakit < 0 || isNaN(izin) || izin < 0 || isNaN(alpha) || alpha < 0) {
      return NextResponse.json({ success: false, error: "Sakit, izin, dan alpha harus berupa angka positif atau nol" }, { status: 400 })
    }

    const data = {
      siswa_id: Number.parseInt(body.siswa_id),
      indikator_kehadiran_id: Number.parseInt(body.indikator_kehadiran_id),
      periode_ajaran_id: Number.parseInt(body.periode_ajaran_id),
      sakit,
      izin,
      alpha,
    }

    const kehadiran = await prisma.kehadiran.create({
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
        indikator_kehadiran: true,
        periode_ajaran: {
          include: {
            master_tahun_ajaran: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: kehadiran,
      message: "Data kehadiran berhasil ditambahkan",
    })
  } catch (error) {
    console.error("Error creating kehadiran:", error)
    return NextResponse.json({ success: false, error: "Gagal menambahkan data kehadiran" }, { status: 500 })
  }
}
