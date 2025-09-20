import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const { tahun_ajaran_lama, tahun_ajaran_baru, tingkatan_promosi } = await request.json()

    if (!tahun_ajaran_lama || !tahun_ajaran_baru) {
      return NextResponse.json(
        {
          success: false,
          error: "Tahun ajaran lama dan baru harus diisi",
        },
        { status: 400 },
      )
    }

    // Start transaction-like operations
    const results = []

    for (const promosi of tingkatan_promosi) {
      const { tingkatan_asal_id, tingkatan_tujuan_id, kelas_mapping } = promosi

      if (tingkatan_tujuan_id === null) {
        // Handle graduation - update siswa status to lulus
        const siswaLulus = await prisma.siswa.updateMany({
          where: {
            master_tahun_ajaran: {
              nama_ajaran: tingkatan_asal_id.toString()
            },
            status: "Aktif"
          },
          data: {
            status: "Lulus"
          }
        })

        results.push({
          type: "graduation",
          tingkatan_asal_id,
          count: siswaLulus.count,
        })
      } else {
        // Handle promotion to next level
        for (const mapping of kelas_mapping) {
          const { kelas_asal_id, kelas_tujuan_id } = mapping

          // Get students from source class
          const siswaPromosi = await prisma.siswa.findMany({
            where: {
              kelas_id: kelas_asal_id,
              status: "Aktif"
            },
            select: { id: true }
          })

          if (siswaPromosi && siswaPromosi.length > 0) {
            // Update students to new class and tingkatan
            const updatedSiswa = await prisma.siswa.updateMany({
              where: {
                id: {
                  in: siswaPromosi.map(s => s.id)
                }
              },
              data: {
                kelas_id: kelas_tujuan_id,
                master_tahun_ajaran_id: tingkatan_tujuan_id
              }
            })

            results.push({
              type: "promotion",
              kelas_asal_id,
              kelas_tujuan_id,
              count: updatedSiswa.count,
            })
          }
        }
      }
    }

    // Log the promotion activity
    await prisma.logPromosi.create({
      data: {
        tahun_ajaran_dari_id: tahun_ajaran_lama,
        tahun_ajaran_ke_id: tahun_ajaran_baru,
        catatan: JSON.stringify(results)
      }
    })

    return NextResponse.json({
      success: true,
      message: "Promosi kelas berhasil dilakukan",
      data: results,
    })
  } catch (error) {
    console.error("Error in class promotion:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Terjadi kesalahan saat promosi kelas",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tahun_ajaran = searchParams.get("tahun_ajaran")

    // Get promotion preview data
    const tingkatanData = await prisma.tingkatan.findMany({
      orderBy: { urutan: "asc" },
      include: {
        kelas: {
          include: {
            _count: {
              select: { siswa: true }
            }
          }
        }
      }
    })

    // Get current active students count by tingkatan and kelas
    const siswaCount = await prisma.siswa.findMany({
      where: {
        status: "Aktif",
        master_tahun_ajaran: tahun_ajaran ? {
          nama_ajaran: tahun_ajaran
        } : undefined
      },
      select: {
        master_tahun_ajaran_id: true,
        kelas_id: true
      }
    })

    // Process data for promotion preview
    const promosiPreview = tingkatanData.map((tingkatan) => {
      const siswaCountTingkatan = siswaCount.filter((s) => s.master_tahun_ajaran_id === tingkatan.id).length

      return {
        ...tingkatan,
        jumlah_siswa: siswaCountTingkatan,
        kelas: tingkatan.kelas?.map((kelas) => ({
          ...kelas,
          jumlah_siswa: siswaCount.filter((s) => s.kelas_id === kelas.id).length,
        })),
      }
    })

    return NextResponse.json({
      success: true,
      data: promosiPreview,
    })
  } catch (error) {
    console.error("Error getting promotion preview:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Terjadi kesalahan saat mengambil data promosi",
      },
      { status: 500 },
    )
  }
}
