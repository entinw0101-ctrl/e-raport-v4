import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const per_page = Number.parseInt(searchParams.get("per_page") || "10")
    const search = searchParams.get("search") || ""
    const kelas_id = searchParams.get("kelas_id")
    const periode_ajaran_id = searchParams.get("periode_ajaran_id")
    const semester = searchParams.get("semester")

    const skip = (page - 1) * per_page

    // Build where clause
    const where: any = {}

    if (search) {
      where.siswa = {
        OR: [{ nama: { contains: search, mode: "insensitive" } }, { nis: { contains: search, mode: "insensitive" } }],
      }
    }

    if (kelas_id) {
      where.siswa = { ...where.siswa, kelas_id: Number.parseInt(kelas_id) }
    }

    if (periode_ajaran_id) {
      where.periode_ajaran_id = Number.parseInt(periode_ajaran_id)
    }

    if (semester) {
      where.semester = Number.parseInt(semester)
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
      orderBy: [{ siswa: { nama: "asc" } }, { indikator_sikap: { nama_indikator: "asc" } }],
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
    if (!body.siswa_id || !body.periode_ajaran_id || !body.semester || !body.indikator_sikap_id || !body.nilai) {
      return NextResponse.json(
        { success: false, error: "Siswa, periode ajaran, semester, indikator sikap, dan nilai wajib diisi" },
        { status: 400 },
      )
    }

    // Check if assessment already exists for this student and indicator
    const existingPenilaian = await prisma.penilaianSikap.findFirst({
      where: {
        siswa_id: Number.parseInt(body.siswa_id),
        periode_ajaran_id: Number.parseInt(body.periode_ajaran_id),
        semester: Number.parseInt(body.semester),
        indikator_sikap_id: Number.parseInt(body.indikator_sikap_id),
      },
    })

    if (existingPenilaian) {
      return NextResponse.json(
        { success: false, error: "Penilaian sikap untuk siswa dan indikator ini sudah ada" },
        { status: 400 },
      )
    }

    const data = {
      ...body,
      siswa_id: Number.parseInt(body.siswa_id),
      periode_ajaran_id: Number.parseInt(body.periode_ajaran_id),
      semester: Number.parseInt(body.semester),
      indikator_sikap_id: Number.parseInt(body.indikator_sikap_id),
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
      message: "Penilaian sikap berhasil ditambahkan",
    })
  } catch (error) {
    console.error("Error creating penilaian sikap:", error)
    return NextResponse.json({ success: false, error: "Gagal menambahkan penilaian sikap" }, { status: 500 })
  }
}
