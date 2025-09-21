import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const per_page = Number.parseInt(searchParams.get("per_page") || "10")
    const siswa_id = searchParams.get("siswa_id")
    const indikator_sikap_id = searchParams.get("indikator_sikap_id")
    const periode_ajaran_id = searchParams.get("periode_ajaran_id")
    const kelas_id = searchParams.get("kelas_id")

    const skip = (page - 1) * per_page

    // Build where clause
    const where: any = {}

    if (siswa_id) {
      where.siswa_id = Number.parseInt(siswa_id)
    }

    if (indikator_sikap_id) {
      where.indikator_id = Number.parseInt(indikator_sikap_id)
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
    const total = await prisma.penilaianSikap.count({ where })

    // Get data with pagination
    const data = await prisma.penilaianSikap.findMany({
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
        periode_ajaran: {
          include: {
            master_tahun_ajaran: true,
          },
        },
        indikator_sikap: true,
      },
      orderBy: [{ siswa: { nama: "asc" } }, { indikator_sikap: { indikator: "asc" } }],
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
    console.error("Error fetching penilaian sikap:", error)
    return NextResponse.json({ success: false, error: "Gagal mengambil data penilaian sikap" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.siswa_id || !body.indikator_sikap_id || !body.periode_ajaran_id || body.nilai === undefined) {
      return NextResponse.json(
        { success: false, error: "Siswa, indikator sikap, periode ajaran, dan nilai wajib diisi" },
        { status: 400 },
      )
    }

    // Check if record already exists
    const existingPenilaian = await prisma.penilaianSikap.findFirst({
      where: {
        siswa_id: Number.parseInt(body.siswa_id),
        indikator_id: Number.parseInt(body.indikator_sikap_id),
        periode_ajaran_id: Number.parseInt(body.periode_ajaran_id),
      },
    })

    if (existingPenilaian) {
      return NextResponse.json(
        { success: false, error: "Data penilaian sikap untuk siswa, indikator, dan periode ini sudah ada" },
        { status: 400 },
      )
    }

    // Convert and validate data
    const nilai = Number.parseInt(body.nilai)
    if (isNaN(nilai) || nilai < 0) {
      return NextResponse.json({ success: false, error: "Nilai harus berupa angka positif atau nol" }, { status: 400 })
    }

    const data = {
      siswa_id: Number.parseInt(body.siswa_id),
      indikator_id: Number.parseInt(body.indikator_sikap_id),
      periode_ajaran_id: Number.parseInt(body.periode_ajaran_id),
      nilai,
    }

    const penilaianSikap = await prisma.penilaianSikap.create({
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
        periode_ajaran: {
          include: {
            master_tahun_ajaran: true,
          },
        },
        indikator_sikap: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: penilaianSikap,
      message: "Data penilaian sikap berhasil ditambahkan",
    })
  } catch (error) {
    console.error("Error creating penilaian sikap:", error)
    return NextResponse.json({ success: false, error: "Gagal menambahkan data penilaian sikap" }, { status: 500 })
  }
}
