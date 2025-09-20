import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const per_page = Number.parseInt(searchParams.get("per_page") || "10")
    const search = searchParams.get("search") || ""
    const tingkatan_id = searchParams.get("tingkatan_id")

    const skip = (page - 1) * per_page

    // Build where clause
    const where: any = {}

    if (search) {
      where.nama_kelas = { contains: search, mode: "insensitive" }
    }

    if (tingkatan_id) {
      where.tingkatan_id = Number.parseInt(tingkatan_id)
    }

    // Get total count
    const total = await prisma.kelas.count({ where })

    // Get data with pagination
    const data = await prisma.kelas.findMany({
      where,
      include: {
        wali_kelas: true,
        tingkatan: true,
        next_kelas: true,
        _count: {
          select: {
            siswa: true,
          },
        },
      },
      orderBy: [{ tingkatan: { urutan: "asc" } }, { nama_kelas: "asc" }],
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
    console.error("Error fetching kelas:", error)
    return NextResponse.json({ success: false, error: "Gagal mengambil data kelas" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.nama_kelas || !body.tingkatan_id) {
      return NextResponse.json({ success: false, error: "Nama kelas dan tingkatan wajib diisi" }, { status: 400 })
    }

    // Convert string IDs to integers and exclude invalid fields
    const { tahun_ajaran, status, ...bodyWithoutInvalid } = body
    const data = {
      ...bodyWithoutInvalid,
      tingkatan_id: Number.parseInt(body.tingkatan_id),
      wali_kelas_id: body.wali_kelas_id ? Number.parseInt(body.wali_kelas_id) : null,
      next_kelas_id: body.next_kelas_id ? Number.parseInt(body.next_kelas_id) : null,
      kapasitas: body.kapasitas ? Number.parseInt(body.kapasitas) : null,
    }

    const kelas = await prisma.kelas.create({
      data,
      include: {
        wali_kelas: true,
        tingkatan: true,
        next_kelas: true,
        _count: {
          select: {
            siswa: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: kelas,
      message: "Kelas berhasil ditambahkan",
    })
  } catch (error) {
    console.error("Error creating kelas:", error)
    return NextResponse.json({ success: false, error: "Gagal menambahkan kelas" }, { status: 500 })
  }
}
