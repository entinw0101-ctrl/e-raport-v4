import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const per_page = Number.parseInt(searchParams.get("per_page") || "10")
    const search = searchParams.get("search") || ""
    const kelas_id = searchParams.get("kelas_id")
    const master_tahun_ajaran_id = searchParams.get("master_tahun_ajaran_id")
    const status = searchParams.get("status")

    const skip = (page - 1) * per_page

    // Build where clause
    const where: any = {}

    if (search) {
      where.OR = [
        { nama: { contains: search, mode: "insensitive" } },
        { nis: { contains: search, mode: "insensitive" } },
      ]
    }

    if (kelas_id) {
      where.kelas_id = Number.parseInt(kelas_id)
    }

    if (master_tahun_ajaran_id) {
      where.master_tahun_ajaran_id = Number.parseInt(master_tahun_ajaran_id)
    }

    if (status) {
      where.status = status
    }

    // Get total count
    const total = await prisma.siswa.count({ where })

    // Get data with pagination
    const data = await prisma.siswa.findMany({
      where,
      include: {
        kelas: {
          include: {
            tingkatan: true,
          },
        },
        kamar: true,
        master_tahun_ajaran: true,
      },
      orderBy: { nama: "asc" },
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
    console.error("Error fetching siswa:", error)
    return NextResponse.json({ success: false, error: "Gagal mengambil data siswa" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.nama || !body.nis) {
      return NextResponse.json({ success: false, error: "Nama dan NIS wajib diisi" }, { status: 400 })
    }

    // Check if NIS already exists
    const existingSiswa = await prisma.siswa.findUnique({
      where: { nis: body.nis },
    })

    if (existingSiswa) {
      return NextResponse.json({ success: false, error: "NIS sudah digunakan" }, { status: 400 })
    }

    // Convert date strings to Date objects
    const data = {
      ...body,
      tanggal_lahir: body.tanggal_lahir ? new Date(body.tanggal_lahir) : null,
      kelas_id: body.kelas_id ? Number.parseInt(body.kelas_id) : null,
      kamar_id: body.kamar_id ? Number.parseInt(body.kamar_id) : null,
      master_tahun_ajaran_id: body.master_tahun_ajaran_id ? Number.parseInt(body.master_tahun_ajaran_id) : null,
    }

    const siswa = await prisma.siswa.create({
      data,
      include: {
        kelas: {
          include: {
            tingkatan: true,
          },
        },
        kamar: true,
        master_tahun_ajaran: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: siswa,
      message: "Siswa berhasil ditambahkan",
    })
  } catch (error) {
    console.error("Error creating siswa:", error)
    return NextResponse.json({ success: false, error: "Gagal menambahkan siswa" }, { status: 500 })
  }
}
