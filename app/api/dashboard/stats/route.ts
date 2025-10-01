import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const now = new Date()
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    // Get total counts for current month
    const [siswaCount, guruCount, kelasCount, nilaiUjianCount] = await Promise.all([
      prisma.siswa.count(),
      prisma.guru.count(),
      prisma.kelas.count(),
      prisma.nilaiUjian.count(),
    ])

    // Get counts for last month (for trend calculation)
    const [siswaLastMonth, guruLastMonth, kelasLastMonth, nilaiUjianLastMonth] = await Promise.all([
      prisma.siswa.count({
        where: {
          dibuat_pada: {
            gte: lastMonth,
            lte: lastMonthEnd
          }
        }
      }),
      prisma.guru.count({
        where: {
          dibuat_pada: {
            gte: lastMonth,
            lte: lastMonthEnd
          }
        }
      }),
      prisma.kelas.count({
        where: {
          dibuat_pada: {
            gte: lastMonth,
            lte: lastMonthEnd
          }
        }
      }),
      prisma.nilaiUjian.count({
        where: {
          dibuat_pada: {
            gte: lastMonth,
            lte: lastMonthEnd
          }
        }
      }),
    ])

    // Get recent activities
    const recentNilai = await prisma.nilaiUjian.findMany({
      take: 5,
      orderBy: { dibuat_pada: "desc" },
      include: {
        siswa: {
          select: { nama: true }
        },
        mata_pelajaran: {
          select: { nama_mapel: true }
        }
      }
    })

    // Get grade distribution (assuming predikat field exists)
    const gradeDistribution = await prisma.nilaiUjian.findMany({
      select: { predikat: true }
    })

    const gradeCounts = gradeDistribution.reduce((acc: any, item) => {
      if (item.predikat) {
        acc[item.predikat] = (acc[item.predikat] || 0) + 1
      }
      return acc
    }, {})

    return NextResponse.json({
      stats: {
        totalSiswa: siswaCount,
        totalGuru: guruCount,
        totalKelas: kelasCount,
        totalNilai: nilaiUjianCount,
      },
      lastMonthStats: {
        totalSiswa: siswaLastMonth,
        totalGuru: guruLastMonth,
        totalKelas: kelasLastMonth,
        totalNilai: nilaiUjianLastMonth,
      },
      recentActivities: recentNilai.map(item => ({
        id: item.id,
        nilai_angka: item.nilai_angka,
        dibuat_pada: item.dibuat_pada,
        siswa: item.siswa,
        mata_pelajaran: item.mata_pelajaran
      })),
      gradeDistribution: gradeCounts,
    })
  } catch (error) {
    console.error("Dashboard stats error:", error)
    return NextResponse.json({ error: "Failed to fetch dashboard stats" }, { status: 500 })
  }
}
