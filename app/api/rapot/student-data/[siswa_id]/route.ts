import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateLaporanNilai } from "@/lib/raport-utils"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ siswa_id: string }> }
) {
  try {
    const resolvedParams = await params
    const siswaId = resolvedParams.siswa_id
    const { searchParams } = new URL(request.url)
    const periodeAjaranId = searchParams.get("periode_ajaran_id")

    if (!siswaId) {
      return NextResponse.json(
        { success: false, error: "ID siswa wajib diisi" },
        { status: 400 }
      )
    }

    if (!periodeAjaranId) {
      return NextResponse.json(
        { success: false, error: "ID periode ajaran wajib diisi" },
        { status: 400 }
      )
    }

    // Get complete student data for the report page
    const siswa = await prisma.siswa.findUnique({
      where: { id: parseInt(siswaId) },
      include: {
        kelas: {
          include: {
            wali_kelas: true
          }
        },
        kamar: true
      }
    })

    if (!siswa) {
      return NextResponse.json(
        { success: false, error: "Siswa tidak ditemukan" },
        { status: 404 }
      )
    }

    // Get periode ajaran
    const periodeAjaran = await prisma.periodeAjaran.findUnique({
      where: { id: parseInt(periodeAjaranId) }
    })

    if (!periodeAjaran) {
      return NextResponse.json(
        { success: false, error: "Periode ajaran tidak ditemukan" },
        { status: 404 }
      )
    }

    // Get all related data
    const [nilaiUjian, nilaiHafalan, kehadiran, penilaianSikap] = await Promise.all([
      prisma.nilaiUjian.findMany({
        where: {
          siswa_id: parseInt(siswaId),
          periode_ajaran_id: parseInt(periodeAjaranId)
        },
        include: {
          mata_pelajaran: true
        },
        orderBy: {
          mata_pelajaran: {
            nama_mapel: 'asc'
          }
        }
      }),
      prisma.nilaiHafalan.findMany({
        where: {
          siswa_id: parseInt(siswaId),
          periode_ajaran_id: parseInt(periodeAjaranId)
        },
        include: {
          mata_pelajaran: {
            include: {
              kurikulum: {
                where: {
                  tingkatan_id: siswa.kelas?.tingkatan_id || undefined // Filter by student's tingkatan
                },
                include: {
                  kitab: true
                }
              }
            }
          }
        },
        orderBy: {
          mata_pelajaran: {
            nama_mapel: 'asc'
          }
        }
      }),
      prisma.kehadiran.findMany({
        where: {
          siswa_id: parseInt(siswaId),
          periode_ajaran_id: parseInt(periodeAjaranId)
        },
        include: {
          indikator_kehadiran: true
        },
        orderBy: {
          indikator_kehadiran: {
            nama_indikator: 'asc'
          }
        }
      }),
      prisma.penilaianSikap.findMany({
        where: {
          siswa_id: parseInt(siswaId),
          periode_ajaran_id: parseInt(periodeAjaranId)
        },
        include: {
          indikator_sikap: true
        },
        orderBy: {
          indikator_sikap: {
            indikator: 'asc'
          }
        }
      })
    ])

    // Get report status
    const result = await generateLaporanNilai(siswaId, periodeAjaranId, { isAdmin: true })

    // Return complete student data
    const studentData = {
      siswa: {
        id: siswa.id.toString(),
        nama: siswa.nama,
        nis: siswa.nis,
        tempat_lahir: siswa.tempat_lahir || '',
        tanggal_lahir: siswa.tanggal_lahir?.toISOString() || '',
        jenis_kelamin: siswa.jenis_kelamin || '',
        agama: siswa.agama || '',
        alamat: siswa.alamat || '',
        kelas: {
          nama_kelas: siswa.kelas?.nama_kelas || '',
          walikelas: siswa.kelas?.wali_kelas ? {
            nama: siswa.kelas.wali_kelas.nama,
            nip: siswa.kelas.wali_kelas.nip || ''
          } : { nama: '', nip: '' }
        },
        kamar: {
          nama_kamar: siswa.kamar?.nama_kamar || ''
        }
      },
      nilaiUjian: nilaiUjian.map(n => ({
        id: n.id.toString(),
        nilai_angka: n.nilai_angka.toNumber(),
        predikat: n.predikat || '',
        mata_pelajaran: {
          nama_mapel: n.mata_pelajaran.nama_mapel
        }
      })),
      nilaiHafalan: nilaiHafalan.map((h: any) => ({
        id: h.id.toString(),
        predikat: h.predikat || '',
        mata_pelajaran: {
          nama_mapel: h.mata_pelajaran.nama_mapel
        },
        kurikulum: h.mata_pelajaran.kurikulum?.[0] ? {
          kitab: {
            nama_kitab: h.mata_pelajaran.kurikulum[0].kitab?.nama_kitab || ''
          },
          batas_hafalan: h.mata_pelajaran.kurikulum[0].batas_hafalan || ''
        } : null
      })),
      kehadiran: kehadiran.map(k => ({
        id: k.id.toString(),
        sakit: k.sakit || 0,
        izin: k.izin || 0,
        alpha: k.alpha || 0,
        indikator_kehadiran: {
          nama_indikator: k.indikator_kehadiran.nama_indikator
        }
      })),
      penilaianSikap: penilaianSikap.map(s => ({
        id: s.id.toString(),
        nilai: s.nilai || 0,
        indikator_sikap: {
          jenis_sikap: s.indikator_sikap.jenis_sikap || '',
          indikator: s.indikator_sikap.indikator
        }
      })),
      periodeAjaran: {
        nama_ajaran: periodeAjaran.nama_ajaran,
        semester: periodeAjaran.semester
      }
    }

    return NextResponse.json({
      success: true,
      data: studentData,
      report_status: result.reportStatus || 'not_ready',
      can_generate: result.canGenerate,
      warnings: result.warnings
    })

  } catch (error) {
    console.error("Error getting student report data:", error)
    return NextResponse.json(
      { success: false, error: "Gagal mengambil data rapor siswa" },
      { status: 500 }
    )
  }
}