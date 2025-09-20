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
        { kelas: { nama_kelas: { contains: search, mode: "insensitive" } } },
      ]
    }

    // Get total count
    const total = await prisma.riwayatKelasSiswa.count({ where })

    // Get data with pagination
    const data = await prisma.riwayatKelasSiswa.findMany({
      where,
      include: {
        siswa: {
          select: {
            id: true,
            nama: true,
            nis: true,
          },
        },
        kelas: {
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
        master_tahun_ajaran: {
          select: {
            id: true,
            nama_ajaran: true,
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
    console.error("Error fetching riwayat kelas siswa:", error)
    return NextResponse.json({ success: false, error: "Gagal mengambil data riwayat kelas siswa" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.siswa_id || !body.kelas_id) {
      return NextResponse.json({ success: false, error: "Siswa dan kelas wajib diisi" }, { status: 400 })
    }

    const riwayatKelasSiswa = await prisma.riwayatKelasSiswa.create({
      data: {
        siswa_id: Number.parseInt(body.siswa_id),
        kelas_id: Number.parseInt(body.kelas_id),
        master_tahun_ajaran_id: body.master_tahun_ajaran_id ? Number.parseInt(body.master_tahun_ajaran_id) : null,
      },
      include: {
        siswa: {
          select: {
            id: true,
            nama: true,
            nis: true,
          },
        },
        kelas: {
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
        master_tahun_ajaran: {
          select: {
            id: true,
            nama_ajaran: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: riwayatKelasSiswa,
      message: "Riwayat kelas siswa berhasil ditambahkan",
    })
  } catch (error) {
    console.error("Error creating riwayat kelas siswa:", error)
    return NextResponse.json({ success: false, error: "Gagal menambahkan riwayat kelas siswa" }, { status: 500 })
  }
}