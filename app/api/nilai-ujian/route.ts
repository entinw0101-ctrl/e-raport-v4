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
    const total = await prisma.nilaiUjian.count({ where })

    // Get data with pagination
    const data = await prisma.nilaiUjian.findMany({
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
    console.error("Error fetching nilai ujian:", error)
    return NextResponse.json({ success: false, error: "Gagal mengambil data nilai ujian" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.siswa_id || !body.mapel_id || !body.periode_ajaran_id || body.nilai_angka === undefined) {
      return NextResponse.json(
        { success: false, error: "Siswa, mata pelajaran, periode ajaran, dan nilai wajib diisi" },
        { status: 400 },
      )
    }

    // Check if record already exists
    const existingNilai = await prisma.nilaiUjian.findUnique({
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

    // Convert and validate data
    const nilai_angka = Number.parseFloat(body.nilai_angka)
    if (isNaN(nilai_angka) || nilai_angka < 0 || nilai_angka > 100) {
      return NextResponse.json({ success: false, error: "Nilai harus berupa angka antara 0-100" }, { status: 400 })
    }

    // Determine predikat based on nilai_angka
    let predikat = ""
    if (nilai_angka >= 90) predikat = "A"
    else if (nilai_angka >= 80) predikat = "B"
    else if (nilai_angka >= 70) predikat = "C"
    else if (nilai_angka >= 60) predikat = "D"
    else predikat = "E"

    const data = {
      siswa_id: Number.parseInt(body.siswa_id),
      mapel_id: Number.parseInt(body.mapel_id),
      periode_ajaran_id: Number.parseInt(body.periode_ajaran_id),
      nilai_angka,
      predikat: body.predikat || predikat,
    }

    const nilaiUjian = await prisma.nilaiUjian.create({
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
      data: nilaiUjian,
      message: "Nilai ujian berhasil ditambahkan",
    })
  } catch (error) {
    console.error("Error creating nilai ujian:", error)
    return NextResponse.json({ success: false, error: "Gagal menambahkan nilai ujian" }, { status: 500 })
  }
}
