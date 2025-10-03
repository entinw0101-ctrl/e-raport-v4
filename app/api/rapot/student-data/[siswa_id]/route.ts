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
            wali_kelas: true,
            tingkatan: true, // <-- TAMBAHKAN BARIS INI
          },
        },
        kamar: true,
      },
    });

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

    // Get student tingkatan_id for filtering
    const studentTingkatanId = siswa.kelas?.tingkatan_id

    // Get all related data
    const [nilaiUjian, nilaiHafalan, kehadiran, penilaianSikap, catatanSiswa] = await Promise.all([
      // NilaiUjian: Filter hanya berdasarkan jenis, TIDAK perlu filter kurikulum
      prisma.nilaiUjian.findMany({
        where: {
          siswa_id: parseInt(siswaId),
          periode_ajaran_id: parseInt(periodeAjaranId),
          mata_pelajaran: {
            jenis: "Ujian"
          }
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
      // NilaiHafalan: Filter berdasarkan jenis DAN tingkatan melalui kurikulum
      prisma.nilaiHafalan.findMany({
        where: {
          siswa_id: parseInt(siswaId),
          periode_ajaran_id: parseInt(periodeAjaranId),
          mata_pelajaran: {
            jenis: "Hafalan",
          },
        },
        include: {
          // Kita hanya butuh nama mapel, tidak perlu kurikulum lagi
          mata_pelajaran: {
            select: {
              nama_mapel: true,
            },
          },
        },
        orderBy: {
          mata_pelajaran: {
            nama_mapel: "asc",
          },
        },
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
      }),
      prisma.catatanSiswa.findUnique({
        where: {
          siswa_id_periode_ajaran_id: {
            siswa_id: parseInt(siswaId),
            periode_ajaran_id: parseInt(periodeAjaranId)
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
      nilaiHafalan: nilaiHafalan.map((h) => ({
        id: h.id.toString(),
        predikat: h.predikat || "",
        mata_pelajaran: {
          nama_mapel: h.mata_pelajaran.nama_mapel,
        },
        // Langsung ambil data dari kolom yang benar
        // dan sesuaikan strukturnya agar cocok dengan frontend
        kurikulum: {
          kitab: {
            // Kita gunakan target_hafalan sebagai nama kitab
            nama_kitab: h.target_hafalan || "",
          },
          // batas_hafalan bisa diisi dengan data yang sama jika diperlukan
          batas_hafalan: h.target_hafalan || "",
        },
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
      catatanSiswa: catatanSiswa ? {
        id: catatanSiswa.id.toString(),
        catatan_akademik: catatanSiswa.catatan_akademik || '',
        catatan_sikap: catatanSiswa.catatan_sikap || ''
      } : null,
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