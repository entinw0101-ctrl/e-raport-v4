import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Helper functions (same as legacy code)
const getPredicate = (nilai: number | null): string => {
  if (nilai === null || nilai === undefined) return '-'
  const n = parseFloat(nilai.toString())
  if (isNaN(n)) return '-'
  if (n === 10) return 'Sempurna'
  if (n >= 9) return 'Sangat Baik'
  if (n >= 8) return 'Baik'
  if (n >= 7) return 'Cukup'
  return 'Kurang'
}

const formatTanggal = (tanggal: Date | string | null): string => {
  if (!tanggal) return '-'
  try {
    const date = new Date(tanggal)
    // Check if date is valid
    if (isNaN(date.getTime())) return '-'

    const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
    return `${date.getDate()} ${bulan[date.getMonth()]} ${date.getFullYear()}`
  } catch (error) {
    console.warn('Invalid date format:', tanggal)
    return '-'
  }
}

// Helper function to safely calculate averages
const calculateAverage = (items: any[], key: string): string => {
  if (!items || items.length === 0) return '0.00'
  const numericItems = items
    .map(item => parseFloat(item[key]))
    .filter(value => !isNaN(value))
  if (numericItems.length === 0) return '0.00'
  const sum = numericItems.reduce((acc, value) => acc + value, 0)
  return (sum / numericItems.length).toFixed(2)
}

export interface FullRaportData {
  siswa: any
  tahunAjaran: any
  kepalaPesantren: any
  nilaiUjians: any[]
  nilaiHafalans: any[]
  sikaps: any[]
  kehadirans: any[]
  kurikulums: any[]
  history: any
}

// Refactored getFullRaportData function using Prisma
export async function getFullRaportData(siswaId: string, semester: string, tahunAjaranId: string): Promise<FullRaportData> {
  const numericSiswaId = parseInt(siswaId, 10)
  const numericTahunAjaranId = parseInt(tahunAjaranId, 10)

  const siswa = await prisma.siswa.findUnique({
    where: { id: numericSiswaId },
    include: {
      kamar: true,
      kelas: {
        include: {
          wali_kelas: true
        }
      }
    }
  })
  if (!siswa) throw new Error('Siswa tidak ditemukan')

  // Resolve periode/master TA and semester from provided tahunAjaranId
  const periodeRec = await prisma.periodeAjaran.findUnique({
    where: { id: numericTahunAjaranId },
    include: { master_tahun_ajaran: true }
  })
  const derivedSemester = periodeRec ? periodeRec.semester : semester
  const masterTaId = periodeRec ? (periodeRec.master_tahun_ajaran_id || (periodeRec.master_tahun_ajaran && periodeRec.master_tahun_ajaran.id)) : null

  let history = null
  if (masterTaId) {
    history = await prisma.riwayatKelasSiswa.findFirst({
      where: {
        siswa_id: numericSiswaId,
        master_tahun_ajaran_id: masterTaId,
      }
    })
    if (!history) {
      console.warn('RiwayatKelasSiswa not found for siswa %s with master_ta %s - falling back to other lookup', numericSiswaId, masterTaId)
    }
  }

  const kepalaPesantren = null

  const contextKelasId = history ? history.kelas_id : siswa.kelas_id
  const contextTahunAjaranId = numericTahunAjaranId

  const commonWhere = {
    siswa_id: numericSiswaId,
    periode_ajaran_id: contextTahunAjaranId
  }

  const [nilaiUjians, nilaiHafalans, sikaps, kehadirans, kurikulums] = await Promise.all([
    prisma.nilaiUjian.findMany({
      where: {
        ...commonWhere,
        mata_pelajaran: {
          jenis: "Ujian"
        }
      },
      include: { mata_pelajaran: true },
      orderBy: { mata_pelajaran: { nama_mapel: 'asc' } }
    }),
    // [PERBAIKAN] Query nilaiHafalan disederhanakan agar tidak error jika kurikulum tidak ada
    prisma.nilaiHafalan.findMany({
      where: {
        ...commonWhere,
        mata_pelajaran: {
          jenis: "Hafalan",
        }
      },
      include: { mata_pelajaran: true },
      orderBy: { mata_pelajaran: { nama_mapel: 'asc' } }
    }),
    prisma.penilaianSikap.findMany({
      where: commonWhere,
      include: { indikator_sikap: true },
      orderBy: { id: 'asc' }
    }),
    prisma.kehadiran.findMany({
      where: commonWhere,
      include: { indikator_kehadiran: true },
      orderBy: { indikator_kehadiran: { nama_indikator: 'asc' } }
    }),
    (async () => {
      const kelasRec = contextKelasId ? await prisma.kelas.findUnique({
        where: { id: contextKelasId },
        include: { tingkatan: true }
      }) : null
      const tingkatanId = kelasRec?.tingkatan_id
      const where: any = {}
      if (tingkatanId) where.tingkatan_id = tingkatanId
      return prisma.kurikulum.findMany({
        where,
        include: { kitab: true, mata_pelajaran: true }
      })
    })()
  ])

  return {
    siswa,
    tahunAjaran: await prisma.periodeAjaran.findUnique({ where: { id: contextTahunAjaranId } }),
    kepalaPesantren,
    nilaiUjians,
    nilaiHafalans,
    sikaps,
    kehadirans,
    kurikulums,
    history
  }
}

export { getPredicate, formatTanggal, calculateAverage }

export function convertToHijriah(masehiYear: number): number {
  const moment = require('moment-hijri')
  return moment(`${masehiYear}-07-01`, 'YYYY-MM-DD').iYear()
}

// Generate complete nilai rapor data
export async function generateLaporanNilai(
  siswaId: string,
  periodeAjaranId: string,
  options: {
    isAdmin?: boolean
  } = {}
): Promise<{
  canGenerate: boolean
  error?: string
  warnings?: string[]
  data?: any
  reportStatus?: 'ready' | 'partial' | 'not_ready'
}> {
  const prisma = (await import("@/lib/prisma")).prisma

  try {
    const siswa = await prisma.siswa.findUnique({
      where: { id: parseInt(siswaId) },
      include: {
        kelas: {
          include: {
            tingkatan: true
          }
        }
      }
    })

    if (!siswa) {
      return { canGenerate: false, error: "Siswa tidak ditemukan" }
    }

    if (siswa.status !== "Aktif") {
      return {
        canGenerate: false,
        error: `Siswa dengan status "${siswa.status}" tidak bisa generate laporan semester berjalan`
      }
    }

    const periodeAjaran = await prisma.periodeAjaran.findUnique({
      where: { id: parseInt(periodeAjaranId) },
      include: {
        master_tahun_ajaran: true
      }
    })

    if (!periodeAjaran) {
      return { canGenerate: false, error: "Periode ajaran tidak ditemukan" }
    }
    
    // [PERBAIKAN] Query untuk nilaiUjian disederhanakan
    const nilaiUjian = await prisma.nilaiUjian.findMany({
      where: {
        siswa_id: parseInt(siswaId),
        periode_ajaran_id: parseInt(periodeAjaranId),
        mata_pelajaran: {
          jenis: "Ujian",
        },
      },
      include: {
        mata_pelajaran: true,
      },
      orderBy: {
        mata_pelajaran: {
          nama_mapel: "asc",
        },
      },
    });

    const warnings: string[] = []

    const kehadiran = await prisma.kehadiran.findMany({
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
    })

    if (kehadiran.length === 0) {
      warnings.push("Belum ada data kehadiran")
    }
    
    // [PERBAIKAN] Query untuk nilaiHafalan disederhanakan
    const nilaiHafalan = await prisma.nilaiHafalan.findMany({
      where: {
        siswa_id: parseInt(siswaId),
        periode_ajaran_id: parseInt(periodeAjaranId),
        mata_pelajaran: {
          jenis: "Hafalan",
        },
      },
      include: {
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
    })

    if (nilaiHafalan.length === 0) {
      warnings.push("Belum ada data nilai hafalan")
    }

    const catatanSiswa = await prisma.catatanSiswa.findUnique({
      where: {
        siswa_id_periode_ajaran_id: {
          siswa_id: parseInt(siswaId),
          periode_ajaran_id: parseInt(periodeAjaranId)
        }
      }
    })

    if (!catatanSiswa?.catatan_akademik) {
      warnings.push("Belum ada catatan akademik")
    }

    let reportStatus: 'ready' | 'partial' | 'not_ready' = 'not_ready'
    if (nilaiUjian.length > 0) {
      const hasKehadiran = kehadiran.length > 0
      const hasHafalan = nilaiHafalan.length > 0
      const hasCatatan = !!catatanSiswa?.catatan_akademik

      if (hasKehadiran && hasHafalan && hasCatatan) {
        reportStatus = 'ready'
      } else {
        reportStatus = 'partial'
      }
    }

    if (!options.isAdmin && nilaiUjian.length === 0) {
      return {
        canGenerate: false,
        error: "Siswa aktif harus memiliki minimal 1 nilai ujian untuk generate laporan",
        reportStatus
      }
    }

    if (options.isAdmin && nilaiUjian.length === 0) {
      warnings.push("Belum ada nilai ujian - rapor akan kosong")
      reportStatus = 'not_ready'
    }

    const totalNilaiUjian = nilaiUjian.reduce((sum, n) => sum + n.nilai_angka.toNumber(), 0)
    const rataRataUjian = nilaiUjian.length > 0 ? totalNilaiUjian / nilaiUjian.length : 0
    const rataRataPredikatUjian = calculateAveragePredikat(nilaiUjian)
    const rankingData = await calculateClassRanking(siswaId, periodeAjaranId)
    const hafalanStatus = calculateHafalanStatus(nilaiHafalan)
    const attendanceSummary = calculateAttendanceSummary(kehadiran)
    const totalKetidakhadiran = calculateTotalKetidakhadiran(kehadiran)
    const semester_text = periodeAjaran.semester === "SATU" ? "GANJIL" : "GENAP"
    const tahunAjaranParts = periodeAjaran.nama_ajaran.split('/')
    let tahunAjaranHijriah = 'N/A'

    if (tahunAjaranParts.length === 2) {
      const startYearMasehi = parseInt(tahunAjaranParts[0], 10)
      const endYearMasehi = parseInt(tahunAjaranParts[1], 10)
      const moment = require('moment-hijri')
      const startHijri = moment(`${startYearMasehi}-07-01`, 'YYYY-MM-DD').iYear()
      const endHijri = moment(`${endYearMasehi}-06-30`, 'YYYY-MM-DD').iYear()
      
      if (startHijri === endHijri) {
        tahunAjaranHijriah = `${startHijri} H.`
      } else {
        tahunAjaranHijriah = `${startHijri}/${endHijri} H.`
      }
    }
    
    const reportData = {
      header: {
        nama: siswa.nama,
        nis: siswa.nis,
        kotaAsal: siswa.kota_asal || "-",
        semester: semester_text,
        tahunAjaran: periodeAjaran.nama_ajaran,
        tahunAjaranHijriah: tahunAjaranHijriah
      },
      nilaiUjian: nilaiUjian.map(n => ({
        mataPelajaran: n.mata_pelajaran.nama_mapel,
        kitab: "-", // Kolom kitab tidak relevan untuk nilai ujian
        nilai: n.nilai_angka.toNumber(),
        predikat: n.predikat || getPredicate(n.nilai_angka.toNumber())
      })),
      totalNilaiUjian: Math.round(totalNilaiUjian * 100) / 100,
      rataRataUjian: Math.round(rataRataUjian * 100) / 100,
      rataRataPredikatUjian: rataRataPredikatUjian,
      peringkat: rankingData
        ? (rankingData.isComplete ? rankingData.rank : `Sementara (${rankingData.rank})`)
        : (nilaiUjian.length > 0 ? "-" : null),
      totalSiswa: rankingData ? rankingData.totalActiveStudents : 0,
      // [PERBAIKAN] Mapping nilaiHafalan diubah agar membaca `target_hafalan`
      nilaiHafalan: nilaiHafalan.map(h => ({
        mataPelajaran: h.mata_pelajaran.nama_mapel,
        kitab: h.target_hafalan || "Tidak ada data kitab",
        batasHafalan: h.target_hafalan || "-",
        targetHafalan: h.target_hafalan || "-",
        predikat: normalizeHafalanPredikat(h.predikat)
      })),
      statusHafalan: hafalanStatus,
      kehadiran: kehadiran.map(k => ({
        indikatorKehadiran: k.indikator_kehadiran.nama_indikator,
        sakit: k.sakit,
        izin: k.izin,
        alpha: k.alpha
      })),
      totalSakit: attendanceSummary.totalSakit,
      totalIzin: attendanceSummary.totalIzin,
      totalAlpha: attendanceSummary.totalAlpha,
      totalKehadiran: attendanceSummary.totalKehadiran,
      persentaseKehadiran: attendanceSummary.persentaseKehadiran,
      total: totalKetidakhadiran,
      catatanAkademik: catatanSiswa?.catatan_akademik || "Belum ada catatan akademik"
    }

    return {
      canGenerate: true,
      warnings: warnings.length > 0 ? warnings : undefined,
      data: reportData,
      reportStatus
    }

  } catch (error) {
    console.error("Error generating laporan nilai:", error)
    return {
      canGenerate: false,
      error: "Terjadi kesalahan saat generate laporan"
    }
  }
}

// Calculate class ranking for active students only
export async function calculateClassRanking(
  siswaId: string,
  periodeAjaranId: string
): Promise<{
  rank: number
  totalActiveStudents: number
  average: number
  isComplete: boolean
} | null> {
  const prisma = (await import("@/lib/prisma")).prisma

  try {
    const targetSiswa = await prisma.siswa.findUnique({
      where: { id: parseInt(siswaId) },
      select: { kelas_id: true }
    })

    if (!targetSiswa?.kelas_id) return null

    const allActiveStudents = await prisma.siswa.findMany({
      where: {
        kelas_id: targetSiswa.kelas_id,
        status: "Aktif"
      },
      select: { id: true }
    })

    if (allActiveStudents.length === 0) return null

    const examScores = await prisma.nilaiUjian.groupBy({
      by: ['siswa_id'],
      where: {
        periode_ajaran_id: parseInt(periodeAjaranId),
        siswa: {
          kelas_id: targetSiswa.kelas_id,
          status: "Aktif"
        }
      },
      _avg: { nilai_angka: true }
    })

    const rankingData = allActiveStudents.map(student => {
      const examData = examScores.find(score => score.siswa_id === student.id)
      return {
        siswa_id: student.id,
        average: examData?._avg.nilai_angka?.toNumber() || 0
      }
    })

    const sortedByAverage = rankingData
      .sort((a, b) => b.average - a.average)

    const targetIndex = sortedByAverage.findIndex(item => item.siswa_id === parseInt(siswaId))
    if (targetIndex === -1) return null

    const targetStudent = sortedByAverage[targetIndex]
    const studentsWithScores = examScores.length
    const isComplete = studentsWithScores === allActiveStudents.length

    return {
      rank: targetIndex + 1,
      totalActiveStudents: allActiveStudents.length,
      average: targetStudent.average,
      isComplete
    }

  } catch (error) {
    console.error("Error calculating class ranking:", error)
    return null
  }
}

// Calculate average predikat from exam scores
export function calculateAveragePredikat(nilaiUjian: any[]): string {
  if (nilaiUjian.length === 0) return "-"

  const predikatValues: { [key: string]: number } = {
    "Sempurna": 10,
    "Sangat Baik": 9,
    "Baik": 8,
    "Cukup": 7,
    "Kurang": 6
  }

  let totalScore = 0
  let validCount = 0

  for (const nilai of nilaiUjian) {
    const predikat = nilai.predikat || getPredicate(nilai.nilai_angka?.toNumber() || 0)
    const score = predikatValues[predikat]

    if (score !== undefined) {
      totalScore += score
      validCount++
    }
  }

  if (validCount === 0) return "-"

  const averageScore = totalScore / validCount
  return getPredicate(averageScore)
}

// Calculate overall hafalan status
export function calculateHafalanStatus(nilaiHafalan: any[]): string {
  if (nilaiHafalan.length === 0) return "Belum ada data"

  // [PENJELASAN] 'predikat' pada nilaiHafalan adalah enum ('TERCAPAI'/'TIDAK_TERCAPAI')
  const tercapaiCount = nilaiHafalan.filter(h => h.predikat === "TERCAPAI").length
  const totalCount = nilaiHafalan.length

  if (tercapaiCount === totalCount) return "Tercapai"
  if (tercapaiCount === 0) return "Tidak Tercapai"
  return `Sebagian (${tercapaiCount}/${totalCount} tercapai)`
}

// Calculate total ketidakhadiran (total absences)
export function calculateTotalKetidakhadiran(kehadiran: any[]): number {
  if (kehadiran.length === 0) return 0

  return kehadiran.reduce((total, k) => {
    return total + (k.sakit || 0) + (k.izin || 0) + (k.alpha || 0)
  }, 0)
}

// Normalize hafalan predikat to proper capitalization
export function normalizeHafalanPredikat(predikat: string): string {
  if (!predikat) return "-"

  if (predikat === "TERCAPAI") return "Tercapai"
  if (predikat === "TIDAK_TERCAPAI") return "Tidak Tercapai"

  return predikat
}

// Calculate attendance summary
export function calculateAttendanceSummary(kehadiran: any[]): {
  totalSakit: number
  totalIzin: number
  totalAlpha: number
  totalKehadiran: number
  persentaseKehadiran: string
} {
  if (kehadiran.length === 0) {
    return {
      totalSakit: 0,
      totalIzin: 0,
      totalAlpha: 0,
      totalKehadiran: 0,
      persentaseKehadiran: "0.00%"
    }
  }

  const totalSakit = kehadiran.reduce((sum, k) => sum + k.sakit, 0)
  const totalIzin = kehadiran.reduce((sum, k) => sum + k.izin, 0)
  const totalAlpha = kehadiran.reduce((sum, k) => sum + k.alpha, 0)
  const totalTidakHadir = totalSakit + totalIzin + totalAlpha

  const totalHariSekolah = kehadiran.length * 5
  const totalHadir = Math.max(0, totalHariSekolah - totalTidakHadir)
  const persentaseKehadiran = totalHariSekolah > 0
    ? ((totalHadir / totalHariSekolah) * 100).toFixed(2) + "%"
    : "0.00%"

  return {
    totalSakit,
    totalIzin,
    totalAlpha,
    totalKehadiran: totalHadir,
    persentaseKehadiran
  }
}
