import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const { siswaId, periodeAjaranId, semester } = await request.json()

    // Check for existing rapot
    const existingRapot = await prisma.ringkasanRapot.findUnique({
      where: {
        siswa_id_periode_ajaran_id: {
          siswa_id: siswaId,
          periode_ajaran_id: periodeAjaranId
        }
      }
    })

    if (existingRapot) {
      const lastUpdated = new Date(existingRapot.diperbarui_pada)
      const now = new Date()
      const hoursDiff = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60)

      if (hoursDiff < 24) {
        // Cache for 24 hours
        return NextResponse.json({
          rapot: existingRapot.catatan_akademik, // Using catatan_akademik as data_rapot equivalent
          cached: true,
          lastUpdated: existingRapot.diperbarui_pada,
        })
      }
    }

    // Get student data
    const siswa = await prisma.siswa.findUnique({
      where: { id: siswaId },
      include: {
        kelas: {
          include: {
            tingkatan: true
          }
        }
      }
    })

    if (!siswa) {
      return NextResponse.json({ error: "Siswa not found" }, { status: 404 })
    }

    // Get all required data in parallel
    const [nilaiUjian, nilaiHafalan, kehadiran, penilaianSikap] = await Promise.all([
      prisma.nilaiUjian.findMany({
        where: {
          siswa_id: siswaId,
          periode_ajaran_id: periodeAjaranId
        },
        include: {
          mata_pelajaran: true
        }
      }),
      prisma.nilaiHafalan.findMany({
        where: {
          siswa_id: siswaId,
          periode_ajaran_id: periodeAjaranId
        },
        include: {
          mata_pelajaran: true
        }
      }),
      prisma.kehadiran.findMany({
        where: {
          siswa_id: siswaId,
          periode_ajaran_id: periodeAjaranId
        }
      }),
      prisma.penilaianSikap.findMany({
        where: {
          siswa_id: siswaId,
          periode_ajaran_id: periodeAjaranId
        }
      })
    ])

    // Calculate attendance totals
    const totalSakit = kehadiran.filter((k) => k.sakit > 0).length
    const totalIzin = kehadiran.filter((k) => k.izin > 0).length
    const totalAlpha = kehadiran.filter((k) => k.alpha > 0).length
    const totalHadir = kehadiran.length - totalSakit - totalIzin - totalAlpha

    const rapotData = {
      siswa,
      nilaiUjian,
      nilaiHafalan,
      kehadiran: {
        hadir: totalHadir,
        sakit: totalSakit,
        izin: totalIzin,
        alpa: totalAlpha,
      },
      penilaianSikap,
      semester,
      periodeAjaran: periodeAjaranId,
    }

    // Upsert rapot data
    await prisma.ringkasanRapot.upsert({
      where: {
        siswa_id_periode_ajaran_id: {
          siswa_id: siswaId,
          periode_ajaran_id: periodeAjaranId
        }
      },
      update: {
        catatan_akademik: JSON.stringify(rapotData),
        diperbarui_pada: new Date()
      },
      create: {
        siswa_id: siswaId,
        periode_ajaran_id: periodeAjaranId,
        catatan_akademik: JSON.stringify(rapotData)
      }
    })

    return NextResponse.json({ rapot: rapotData, cached: false })
  } catch (error) {
    console.error("Generate rapot error:", error)
    return NextResponse.json({ error: "Failed to generate rapot" }, { status: 500 })
  }
}
