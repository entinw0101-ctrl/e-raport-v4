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
    const tanggal = searchParams.get("tanggal")

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

    if (tanggal) {
      where.tanggal = new Date(tanggal)
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
        periode_ajaran: {
          include: {
            master_tahun_ajaran: true,
          },
        },
      },
      orderBy: [{ tanggal: "desc" }, { siswa: { nama: "asc" } }],
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
    if (!body.siswa_id || !body.periode_ajaran_id || !body.semester || !body.tanggal || !body.status) {
      return NextResponse.json(
        { success: false, error: "Siswa, periode ajaran, semester, tanggal, dan status wajib diisi" },
        { status: 400 },
      )
    }

    // Check if attendance record already exists for this student on this date
    const existingKehadiran = await prisma.kehadiran.findFirst({
      where: {
        siswa_id: Number.parseInt(body.siswa_id),
        periode_ajaran_id: Number.parseInt(body.periode_ajaran_id),
        semester: Number.parseInt(body.semester),
        tanggal: new Date(body.tanggal),
      },
    })

    if (existingKehadiran) {
      return NextResponse.json(
        { success: false, error: "Data kehadiran untuk siswa ini pada tanggal tersebut sudah ada" },
        { status: 400 },
      )
    }

    const data = {
      ...body,
      siswa_id: Number.parseInt(body.siswa_id),
      periode_ajaran_id: Number.parseInt(body.periode_ajaran_id),
      semester: Number.parseInt(body.semester),
      tanggal: new Date(body.tanggal),
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
