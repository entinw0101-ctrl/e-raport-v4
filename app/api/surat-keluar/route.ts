import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const per_page = Number.parseInt(searchParams.get("per_page") || "10")
    const search = searchParams.get("search") || ""
    const jenis_keluar = searchParams.get("jenis_keluar") || ""

    const skip = (page - 1) * per_page

    // Build where clause
    const where: any = {}

    if (search) {
      where.OR = [
        { nomor_surat: { contains: search, mode: "insensitive" } },
        { perihal: { contains: search, mode: "insensitive" } },
        { siswa: { nama: { contains: search, mode: "insensitive" } } },
        { siswa: { nis: { contains: search, mode: "insensitive" } } },
      ]
    }

    if (jenis_keluar) {
      where.jenis_keluar = jenis_keluar
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
            kelas: {
              select: {
                nama_kelas: true
              }
            }
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

    if (!body.siswa_id) {
      return NextResponse.json({ success: false, error: "Siswa wajib dipilih" }, { status: 400 })
    }

    if (!body.jenis_keluar) {
      return NextResponse.json({ success: false, error: "Jenis keluar wajib dipilih" }, { status: 400 })
    }

    // Check if nomor_surat already exists
    const existing = await prisma.suratKeluar.findUnique({
      where: { nomor_surat: body.nomor_surat },
    })

    if (existing) {
      return NextResponse.json({ success: false, error: "Nomor surat sudah digunakan" }, { status: 400 })
    }

    // Create surat keluar in a transaction to also update student status
    const result = await prisma.$transaction(async (tx) => {
      // Create the surat keluar
      const suratKeluar = await tx.suratKeluar.create({
        data: {
          nomor_surat: body.nomor_surat,
          siswa_id: Number.parseInt(body.siswa_id),
          tanggal_surat: body.tanggal_surat ? new Date(body.tanggal_surat) : new Date(),
          perihal: body.perihal,
          isi_surat: body.isi_surat,
          jenis_keluar: body.jenis_keluar,
          tujuan_nama_pesantren: body.tujuan_nama_pesantren,
          tujuan_alamat_pesantren: body.tujuan_alamat_pesantren,
          alasan: body.alasan,
          penanggung_jawab: body.penanggung_jawab || "Orang Tua/Wali",
          penanggung_nama: body.penanggung_nama,
          penanggung_pekerjaan: body.penanggung_pekerjaan,
          penanggung_alamat: body.penanggung_alamat,
        } as any,
        include: {
          siswa: {
            select: {
              id: true,
              nama: true,
              nis: true,
              kelas: {
                select: {
                  nama_kelas: true
                }
              }
            },
          },
        },
      })

      // Update student status to "Pindah" if jenis_keluar is "Pindah"
      if (body.jenis_keluar === "Pindah") {
        await tx.siswa.update({
          where: { id: Number.parseInt(body.siswa_id) },
          data: { status: "Pindah" }
        })
      }

      return suratKeluar
    })

    const statusMessage = body.jenis_keluar === "Pindah"
      ? "Surat keluar berhasil ditambahkan dan status siswa diubah menjadi Pindah"
      : "Surat keluar berhasil ditambahkan"

    return NextResponse.json({
      success: true,
      data: result,
      message: statusMessage,
    })
  } catch (error) {
    console.error("Error creating surat keluar:", error)
    return NextResponse.json({ success: false, error: "Gagal menambahkan surat keluar" }, { status: 500 })
  }
}