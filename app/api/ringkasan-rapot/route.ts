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
        { siswa: { nama: { contains: search, mode: "insensitive" } } },
        { siswa: { nis: { contains: search, mode: "insensitive" } } },
        { catatan_akademik: { contains: search, mode: "insensitive" } },
      ]
    }

    // Get total count
    const total = await prisma.ringkasanRapot.count({ where })

    // Get data with pagination
    const data = await prisma.ringkasanRapot.findMany({
      where,
      include: {
        siswa: {
          select: {
            id: true,
            nama: true,
            nis: true,
            kelas: {
              select: {
                nama_kelas: true,
                tingkatan: {
                  select: {
                    nama_tingkatan: true,
                  },
                },
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
      orderBy: { diperbarui_pada: "desc" },
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
    console.error("Error fetching ringkasan rapot:", error)
    return NextResponse.json({ success: false, error: "Gagal mengambil data ringkasan rapot" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.siswa_id || !body.periode_ajaran_id) {
      return NextResponse.json({ success: false, error: "Siswa dan periode ajaran wajib diisi" }, { status: 400 })
    }

    // Check if combination already exists
    const existing = await prisma.ringkasanRapot.findUnique({
      where: {
        siswa_id_periode_ajaran_id: {
          siswa_id: Number.parseInt(body.siswa_id),
          periode_ajaran_id: Number.parseInt(body.periode_ajaran_id),
        },
      },
    })

    if (existing) {
      return NextResponse.json({ success: false, error: "Ringkasan rapot untuk siswa dan periode ini sudah ada" }, { status: 400 })
    }

    const ringkasanRapot = await prisma.ringkasanRapot.create({
      data: {
        siswa_id: Number.parseInt(body.siswa_id),
        periode_ajaran_id: Number.parseInt(body.periode_ajaran_id),
        total_sakit: body.total_sakit ? Number.parseInt(body.total_sakit) : null,
        total_izin: body.total_izin ? Number.parseInt(body.total_izin) : null,
        total_alpha: body.total_alpha ? Number.parseInt(body.total_alpha) : null,
        catatan_akademik: body.catatan_akademik,
        rata_rata_spiritual: body.rata_rata_spiritual ? Number.parseFloat(body.rata_rata_spiritual) : null,
        rata_rata_sosial: body.rata_rata_sosial ? Number.parseFloat(body.rata_rata_sosial) : null,
        predikat_akhir_sikap: body.predikat_akhir_sikap,
        catatan_sikap: body.catatan_sikap,
      },
      include: {
        siswa: {
          select: {
            id: true,
            nama: true,
            nis: true,
            kelas: {
              select: {
                nama_kelas: true,
                tingkatan: {
                  select: {
                    nama_tingkatan: true,
                  },
                },
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
      data: ringkasanRapot,
      message: "Ringkasan rapot berhasil ditambahkan",
    })
  } catch (error) {
    console.error("Error creating ringkasan rapot:", error)
    return NextResponse.json({ success: false, error: "Gagal menambahkan ringkasan rapot" }, { status: 500 })
  }
}