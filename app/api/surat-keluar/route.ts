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
        { nomor_surat: { contains: search, mode: "insensitive" } },
        { perihal: { contains: search, mode: "insensitive" } },
        { siswa: { nama: { contains: search, mode: "insensitive" } } },
      ]
    }

    // Get total count
    const total = await prisma.suratKeluar.count({ where })

    // Get data with pagination
    const data = await prisma.suratKeluar.findMany({
      where,
      include: {
        siswa: {
          select: {
            id: true,
            nama: true,
            nis: true,
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
    console.error("Error fetching surat keluar:", error)
    return NextResponse.json({ success: false, error: "Gagal mengambil data surat keluar" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.nomor_surat) {
      return NextResponse.json({ success: false, error: "Nomor surat wajib diisi" }, { status: 400 })
    }

    // Check if nomor_surat already exists
    const existing = await prisma.suratKeluar.findUnique({
      where: { nomor_surat: body.nomor_surat },
    })

    if (existing) {
      return NextResponse.json({ success: false, error: "Nomor surat sudah digunakan" }, { status: 400 })
    }

    const suratKeluar = await prisma.suratKeluar.create({
      data: {
        nomor_surat: body.nomor_surat,
        siswa_id: body.siswa_id ? Number.parseInt(body.siswa_id) : null,
        tanggal_surat: body.tanggal_surat ? new Date(body.tanggal_surat) : null,
        perihal: body.perihal,
        isi_surat: body.isi_surat,
      },
      include: {
        siswa: {
          select: {
            id: true,
            nama: true,
            nis: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: suratKeluar,
      message: "Surat keluar berhasil ditambahkan",
    })
  } catch (error) {
    console.error("Error creating surat keluar:", error)
    return NextResponse.json({ success: false, error: "Gagal menambahkan surat keluar" }, { status: 500 })
  }
}