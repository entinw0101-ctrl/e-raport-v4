import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const periodeAjaranId = searchParams.get('periode_ajaran_id')
    const kelasId = searchParams.get('kelas_id')

    if (!periodeAjaranId) {
      return NextResponse.json({
        success: false,
        message: 'periode_ajaran_id diperlukan'
      }, { status: 400 })
    }

    // Query untuk mendapatkan siswa yang memiliki data di semua 4 tabel untuk periode ajaran tertentu
    const whereCondition: any = {
      AND: [
        // Siswa harus memiliki setidaknya satu nilai ujian untuk periode ini
        {
          nilai_ujian: {
            some: {
              periode_ajaran_id: parseInt(periodeAjaranId)
            }
          }
        },
        // Siswa harus memiliki setidaknya satu nilai hafalan untuk periode ini
        {
          nilai_hafalan: {
            some: {
              periode_ajaran_id: parseInt(periodeAjaranId)
            }
          }
        },
        // Siswa harus memiliki setidaknya satu data kehadiran untuk periode ini
        {
          kehadiran: {
            some: {
              periode_ajaran_id: parseInt(periodeAjaranId)
            }
          }
        },
        // Siswa harus memiliki setidaknya satu penilaian sikap untuk periode ini
        {
          penilaian_sikap: {
            some: {
              periode_ajaran_id: parseInt(periodeAjaranId)
            }
          }
        }
      ]
    }

    // Filter berdasarkan kelas jika disediakan dan bukan "all"
    if (kelasId && kelasId !== "all") {
      whereCondition.AND.push({
        kelas_id: parseInt(kelasId)
      })
    }

    const eligibleStudents = await prisma.siswa.findMany({
      where: whereCondition,
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
      orderBy: [
        { kelas: { nama_kelas: 'asc' } },
        { nama: 'asc' }
      ]
    })

    return NextResponse.json({
      success: true,
      data: eligibleStudents,
      message: `Ditemukan ${eligibleStudents.length} siswa siap generate raport`
    })

  } catch (error) {
    console.error('Error fetching eligible students:', error)
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data siswa',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}