import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { createAuditLog, getClientInfo } from "@/lib/audit-log"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const per_page = parseInt(searchParams.get("per_page") || "10")
    const periode_ajaran_id = searchParams.get("periode_ajaran_id")

    const where: any = {}
    if (periode_ajaran_id) {
      where.periode_ajaran_id = parseInt(periode_ajaran_id)
    }

    const [catatanSiswa, total] = await Promise.all([
      prisma.catatanSiswa.findMany({
        where,
        include: {
          siswa: {
            include: {
              kelas: true,
            },
          },
          periode_ajaran: true,
        },
        orderBy: {
          diperbarui_pada: "desc",
        },
        skip: (page - 1) * per_page,
        take: per_page,
      }),
      prisma.catatanSiswa.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: catatanSiswa,
      pagination: {
        page,
        per_page,
        total,
        total_pages: Math.ceil(total / per_page),
      },
    })
  } catch (error) {
    console.error("Error fetching catatan siswa:", error)
    return NextResponse.json(
      { success: false, error: "Gagal mengambil data catatan siswa" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: "Akses ditolak. Hanya admin yang dapat mengakses fitur ini." },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { siswa_id, periode_ajaran_id, catatan_sikap, catatan_akademik } = body

    if (!siswa_id || !periode_ajaran_id) {
      return NextResponse.json(
        { success: false, error: "siswa_id dan periode_ajaran_id wajib diisi" },
        { status: 400 }
      )
    }

    // Check if record exists for audit logging
    const existingRecord = await prisma.catatanSiswa.findUnique({
      where: {
        siswa_id_periode_ajaran_id: {
          siswa_id: parseInt(siswa_id),
          periode_ajaran_id: parseInt(periode_ajaran_id),
        },
      },
    })

    const catatanSiswa = await prisma.catatanSiswa.upsert({
      where: {
        siswa_id_periode_ajaran_id: {
          siswa_id: parseInt(siswa_id),
          periode_ajaran_id: parseInt(periode_ajaran_id),
        },
      },
      update: {
        catatan_sikap: catatan_sikap || null,
        catatan_akademik: catatan_akademik || null,
      },
      create: {
        siswa_id: parseInt(siswa_id),
        periode_ajaran_id: parseInt(periode_ajaran_id),
        catatan_sikap: catatan_sikap || null,
        catatan_akademik: catatan_akademik || null,
      },
      include: {
        siswa: {
          include: {
            kelas: true,
          },
        },
        periode_ajaran: true,
      },
    })

    // Audit logging
    const clientInfo = getClientInfo(request)
    await createAuditLog({
      admin_id: session.id,
      action: existingRecord ? 'UPDATE' : 'CREATE',
      table_name: 'catatan_siswa',
      record_id: catatanSiswa.id.toString(),
      old_values: existingRecord ? {
        catatan_akademik: existingRecord.catatan_akademik,
        catatan_sikap: existingRecord.catatan_sikap
      } : null,
      new_values: {
        catatan_akademik: catatanSiswa.catatan_akademik,
        catatan_sikap: catatanSiswa.catatan_sikap
      },
      description: `Catatan siswa ${catatanSiswa.siswa.nama} ${existingRecord ? 'diperbarui' : 'dibuat'}`,
      ...clientInfo,
    })

    return NextResponse.json({
      success: true,
      data: catatanSiswa,
      message: "Catatan siswa berhasil disimpan",
    })
  } catch (error) {
    console.error("Error creating catatan siswa:", error)
    return NextResponse.json(
      { success: false, error: "Gagal menyimpan catatan siswa" },
      { status: 500 }
    )
  }
}