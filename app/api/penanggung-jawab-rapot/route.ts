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
        { jabatan: { contains: search, mode: "insensitive" } },
        { nama_pejabat: { contains: search, mode: "insensitive" } },
        { nip: { contains: search, mode: "insensitive" } },
      ]
    }

    // Get total count
    const total = await prisma.penanggungJawabRapot.count({ where })

    // Get data with pagination
    const data = await prisma.penanggungJawabRapot.findMany({
      where,
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
    console.error("Error fetching penanggung jawab rapot:", error)
    return NextResponse.json({ success: false, error: "Gagal mengambil data penanggung jawab rapot" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.jabatan || !body.nama_pejabat) {
      return NextResponse.json({ success: false, error: "Jabatan dan nama pejabat wajib diisi" }, { status: 400 })
    }

    const penanggungJawabRapot = await prisma.penanggungJawabRapot.create({
      data: {
        jabatan: body.jabatan,
        nama_pejabat: body.nama_pejabat,
        nip: body.nip,
        tanda_tangan: body.tanda_tangan,
        jenis_kelamin_target: body.jenis_kelamin_target || "Semua",
        status: body.status || "aktif",
      },
    })

    return NextResponse.json({
      success: true,
      data: penanggungJawabRapot,
      message: "Penanggung jawab rapot berhasil ditambahkan",
    })
  } catch (error) {
    console.error("Error creating penanggung jawab rapot:", error)
    return NextResponse.json({ success: false, error: "Gagal menambahkan penanggung jawab rapot" }, { status: 500 })
  }
}