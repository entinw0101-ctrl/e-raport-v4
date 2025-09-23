import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ siswa_id: string }> }
) {
  try {
    const { siswa_id: siswaId } = await params
    const { searchParams } = new URL(request.url)
    const periodeAjaranId = searchParams.get('periode_ajaran_id')

    if (!periodeAjaranId) {
      return NextResponse.json({
        success: false,
        message: 'periode_ajaran_id diperlukan'
      }, { status: 400 })
    }

    // Get student with all related data
    const studentData = await prisma.siswa.findUnique({
      where: { id: parseInt(siswaId) },
      include: {
        kelas: {
          include: {
            wali_kelas: true
          }
        },
        kamar: true,
        nilai_ujian: {
          where: { periode_ajaran_id: parseInt(periodeAjaranId) },
          include: {
            mata_pelajaran: true
          },
          orderBy: { mata_pelajaran: { nama_mapel: 'asc' } }
        },
        nilai_hafalan: {
          where: { periode_ajaran_id: parseInt(periodeAjaranId) },
          include: {
            mata_pelajaran: true
          },
          orderBy: { mata_pelajaran: { nama_mapel: 'asc' } }
        },
        kehadiran: {
          where: { periode_ajaran_id: parseInt(periodeAjaranId) },
          include: {
            indikator_kehadiran: true
          },
          orderBy: { indikator_kehadiran: { nama_indikator: 'asc' } }
        },
        penilaian_sikap: {
          where: { periode_ajaran_id: parseInt(periodeAjaranId) },
          include: {
            indikator_sikap: true
          },
          orderBy: { indikator_sikap: { id: 'asc' } }
        }
      }
    })

    if (!studentData) {
      return NextResponse.json({
        success: false,
        message: 'Siswa tidak ditemukan'
      }, { status: 404 })
    }

    // Get periode ajaran info
    const periodeAjaran = await prisma.periodeAjaran.findUnique({
      where: { id: parseInt(periodeAjaranId) }
    })

    if (!periodeAjaran) {
      return NextResponse.json({
        success: false,
        message: 'Periode ajaran tidak ditemukan'
      }, { status: 404 })
    }

    // Format the response
    const formattedData = {
      siswa: {
        id: studentData.id.toString(),
        nama: studentData.nama || '',
        nis: studentData.nis,
        tempat_lahir: studentData.tempat_lahir || '',
        tanggal_lahir: studentData.tanggal_lahir?.toISOString().split('T')[0] || '',
        jenis_kelamin: studentData.jenis_kelamin === 'LAKI_LAKI' ? 'Laki-laki' : 'Perempuan',
        agama: studentData.agama || '',
        alamat: studentData.alamat || '',
        kelas: {
          nama_kelas: studentData.kelas?.nama_kelas || '',
          walikelas: {
            nama: studentData.kelas?.wali_kelas?.nama || '',
            nip: studentData.kelas?.wali_kelas?.nip || ''
          }
        },
        kamar: {
          nama_kamar: studentData.kamar?.nama_kamar || ''
        }
      },
      nilaiUjian: studentData.nilai_ujian.map(n => ({
        id: n.id.toString(),
        nilai_angka: Number(n.nilai_angka),
        predikat: n.predikat || '',
        mata_pelajaran: {
          nama_mapel: n.mata_pelajaran.nama_mapel
        }
      })),
      nilaiHafalan: await Promise.all(studentData.nilai_hafalan.map(async (n) => {
        // Get kurikulum data separately
        const kurikulum = await prisma.kurikulum.findFirst({
          where: { mapel_id: n.mapel_id },
          include: { kitab: true }
        })

        return {
          id: n.id.toString(),
          predikat: n.predikat,
          mata_pelajaran: {
            nama_mapel: n.mata_pelajaran.nama_mapel
          },
          kurikulum: {
            kitab: {
              nama_kitab: kurikulum?.kitab?.nama_kitab || ''
            },
            batas_hafalan: kurikulum?.batas_hafalan || ''
          }
        }
      })),
      kehadiran: studentData.kehadiran.map(k => ({
        id: k.id.toString(),
        sakit: k.sakit,
        izin: k.izin,
        alpha: k.alpha,
        indikator_kehadiran: {
          nama_indikator: k.indikator_kehadiran.nama_indikator
        }
      })),
      penilaianSikap: studentData.penilaian_sikap.map(s => ({
        id: s.id.toString(),
        nilai: s.nilai,
        indikator_sikap: {
          jenis_sikap: s.indikator_sikap.jenis_sikap === 'Spiritual' ? 'Spiritual' : 'Sosial',
          indikator: s.indikator_sikap.indikator || ''
        }
      })),
      periodeAjaran: {
        nama_ajaran: periodeAjaran.nama_ajaran,
        semester: periodeAjaran.semester
      }
    }

    return NextResponse.json({
      success: true,
      data: formattedData
    })

  } catch (error) {
    console.error('Error fetching student data:', error)
    return NextResponse.json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data siswa',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}