import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Helper functions (same as legacy code)
const getPredicate = (nilai: number | null): string => {
  if (nilai === null || nilai === undefined) return '-'
  const n = parseFloat(nilai.toString())
  if (isNaN(n)) return '-'
  if (n === 100) return 'Sempurna'
  if (n >= 90) return 'Sangat Baik'
  if (n >= 80) return 'Baik'
  if (n >= 70) return 'Cukup'
  return 'Kurang'
}

const formatTanggal = (tanggal: Date | string | null): string => {
  if (!tanggal) return '-'
  const date = new Date(tanggal)
  const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
  return `${date.getDate()} ${bulan[date.getMonth()]} ${date.getFullYear()}`
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

  // find the siswa_kelas_history record that matches this siswa and the resolved master_tahun_ajaran_id + semester
  let history = null
  if (masterTaId) {
    history = await prisma.riwayatKelasSiswa.findFirst({
      where: {
        siswa_id: numericSiswaId,
        master_tahun_ajaran_id: masterTaId,
        // Note: semester field might not exist in RiwayatKelasSiswa, adjust accordingly
      }
    })
    if (!history) {
      console.warn('RiwayatKelasSiswa not found for siswa %s with master_ta %s - falling back to other lookup', numericSiswaId, masterTaId)
    }
  }

  // For now, we'll use a placeholder for kepalaPesantren since it's not in the schema
  const kepalaPesantren = null // TODO: Add KepalaPesantren model if needed

  const contextKelasId = history ? history.kelas_id : siswa.kelas_id
  // prefer the periode id passed in; keep contextTahunAjaranId as the original param for template header
  const contextTahunAjaranId = numericTahunAjaranId

  const commonWhere = {
    siswa_id: numericSiswaId,
    periode_ajaran_id: contextTahunAjaranId
  }

  const [nilaiUjians, nilaiHafalans, sikaps, kehadirans, kurikulums] = await Promise.all([
    prisma.nilaiUjian.findMany({
      where: commonWhere,
      include: { mata_pelajaran: true },
      orderBy: { mata_pelajaran: { nama_mapel: 'asc' } }
    }),
    prisma.nilaiHafalan.findMany({
      where: commonWhere,
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
    // Kurikulum for the kelas/tingkatan
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

  // Include history record so callers can read catatan wali kelas etc.
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

// Convert Masehi year to Hijriah year using moment-hijri
export function convertToHijriah(masehiYear: number): number {
  const moment = require('moment-hijri')
  // Use July 1st as reference date for academic year start
  return moment(`${masehiYear}-07-01`, 'YYYY-MM-DD').iYear()
}

// Generate complete nilai rapor data
export async function generateLaporanNilai(
  siswaId: string,
  periodeAjaranId: string
): Promise<{
  canGenerate: boolean
  error?: string
  warnings?: string[]
  data?: any
}> {
  const prisma = (await import("@/lib/prisma")).prisma

  try {
    // 1. Validate student and get basic info
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

    // 2. Check if student is active
    if (siswa.status !== "Aktif") {
      return {
        canGenerate: false,
        error: `Siswa dengan status "${siswa.status}" tidak bisa generate laporan semester berjalan`
      }
    }

    // 3. Get periode ajaran info
    const periodeAjaran = await prisma.periodeAjaran.findUnique({
      where: { id: parseInt(periodeAjaranId) },
      include: {
        master_tahun_ajaran: true
      }
    })

    if (!periodeAjaran) {
      return { canGenerate: false, error: "Periode ajaran tidak ditemukan" }
    }

    // 4. Validate minimum data requirement (must have exam scores)
    const nilaiUjian = await prisma.nilaiUjian.findMany({
      where: {
        siswa_id: parseInt(siswaId),
        periode_ajaran_id: parseInt(periodeAjaranId)
      },
      include: {
        mata_pelajaran: {
          include: {
            kurikulum: {
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
    })

    if (nilaiUjian.length === 0) {
      return {
        canGenerate: false,
        error: "Siswa aktif harus memiliki minimal 1 nilai ujian untuk generate laporan"
      }
    }

    // 5. Get optional data with warnings
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

    const nilaiHafalan = await prisma.nilaiHafalan.findMany({
      where: {
        siswa_id: parseInt(siswaId),
        periode_ajaran_id: parseInt(periodeAjaranId)
      },
      include: {
        mata_pelajaran: {
          include: {
            kurikulum: {
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

    // 6. Calculate averages and rankings
    const totalNilaiUjian = nilaiUjian.reduce((sum, n) => sum + n.nilai_angka.toNumber(), 0)
    const rataRataUjian = nilaiUjian.length > 0 ? totalNilaiUjian / nilaiUjian.length : 0

    // Calculate rata-rata predikat ujian
    const rataRataPredikatUjian = calculateAveragePredikat(nilaiUjian)

    const rankingData = await calculateClassRanking(siswaId, periodeAjaranId)

    // 7. Calculate hafalan status
    const hafalanStatus = calculateHafalanStatus(nilaiHafalan)

    // 8. Calculate attendance summary
    const attendanceSummary = calculateAttendanceSummary(kehadiran)
    const totalKetidakhadiran = calculateTotalKetidakhadiran(kehadiran)

    // 8. Prepare header data with GANJIL/GENAP semester text
    const semester_text = periodeAjaran.semester === "SATU" ? "GANJIL" : "GENAP"

    const tahunAjaranParts = periodeAjaran.nama_ajaran.split('/')
    let tahunAjaranHijriah = 'N/A'
    if (tahunAjaranParts.length === 2) {
      const startYearMasehi = parseInt(tahunAjaranParts[0], 10)
      const endYearMasehi = parseInt(tahunAjaranParts[1], 10)

      // Use moment-hijri for precise conversion with academic year dates
      const moment = require('moment-hijri')
      const startHijri = moment(`${startYearMasehi}-07-01`, 'YYYY-MM-DD').iYear() // July 1st
      const endHijri = moment(`${endYearMasehi}-06-30`, 'YYYY-MM-DD').iYear()   // June 30th

      if (startHijri === endHijri) {
        tahunAjaranHijriah = `${startHijri} H.`
      } else {
        tahunAjaranHijriah = `${startHijri}/${endHijri} H.`
      }
    }

    // 9. Build complete report data
    const reportData = {
      header: {
        nama: siswa.nama,
        nis: siswa.nis,
        kotaAsal: siswa.kota_asal || "-",
        semester: semester_text, // GANJIL or GENAP
        tahunAjaran: periodeAjaran.nama_ajaran,
        tahunAjaranHijriah: tahunAjaranHijriah
      },
      nilaiUjian: nilaiUjian.map(n => ({
        mataPelajaran: n.mata_pelajaran.nama_mapel,
        kitab: n.mata_pelajaran.kurikulum?.[0]?.kitab?.nama_kitab || "-",
        nilai: n.nilai_angka.toNumber(),
        predikat: n.predikat || getPredicate(n.nilai_angka.toNumber())
      })),
      totalNilaiUjian: Math.round(totalNilaiUjian * 100) / 100,
      rataRataUjian: Math.round(rataRataUjian * 100) / 100,
      rataRataPredikatUjian: rataRataPredikatUjian,
      peringkat: rankingData ? rankingData.rank : null,
      totalSiswa: rankingData ? rankingData.totalActiveStudents : 0,
      nilaiHafalan: nilaiHafalan.map(h => ({
        mataPelajaran: h.mata_pelajaran.nama_mapel,
        kitab: h.mata_pelajaran.kurikulum?.[0]?.kitab?.nama_kitab || "-",
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
      data: reportData
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
} | null> {
  const prisma = (await import("@/lib/prisma")).prisma

  try {
    // Get target student info
    const targetSiswa = await prisma.siswa.findUnique({
      where: { id: parseInt(siswaId) },
      select: { kelas_id: true }
    })

    if (!targetSiswa?.kelas_id) return null

    // Get all active students in the same class who have exam scores
    const rankingData = await prisma.nilaiUjian.groupBy({
      by: ['siswa_id'],
      where: {
        periode_ajaran_id: parseInt(periodeAjaranId),
        siswa: {
          kelas_id: targetSiswa.kelas_id,
          status: "Aktif"  // Only active students
        }
      },
      _avg: { nilai_angka: true }
    })

    if (rankingData.length === 0) return null

    // Filter out students with null averages and sort by average descending
    const sortedByAverage = rankingData
      .filter(item => item._avg.nilai_angka !== null)
      .map(item => ({
        siswa_id: item.siswa_id,
        average: item._avg.nilai_angka!.toNumber()
      }))
      .sort((a, b) => b.average - a.average)

    // Find target student's rank
    const targetIndex = sortedByAverage.findIndex(item => item.siswa_id === parseInt(siswaId))
    if (targetIndex === -1) return null

    const targetStudent = sortedByAverage[targetIndex]

    return {
      rank: targetIndex + 1,
      totalActiveStudents: sortedByAverage.length,
      average: targetStudent.average
    }

  } catch (error) {
    console.error("Error calculating class ranking:", error)
    return null
  }
}

// Calculate average predikat from exam scores
export function calculateAveragePredikat(nilaiUjian: any[]): string {
  if (nilaiUjian.length === 0) return "-"

  // Convert predicates to numerical values for averaging
  const predikatValues: { [key: string]: number } = {
    "Sempurna": 100,
    "Sangat Baik": 90,
    "Baik": 80,
    "Cukup": 70,
    "Kurang": 60
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

  // Convert back to predicate
  return getPredicate(averageScore)
}

// Calculate overall hafalan status
export function calculateHafalanStatus(nilaiHafalan: any[]): string {
  if (nilaiHafalan.length === 0) return "Belum ada data"

  const tercapaiCount = nilaiHafalan.filter(h => h.predikat === "Tercapai").length
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

  // Handle uppercase versions from database
  if (predikat === "TERCAPAI") return "Tercapai"
  if (predikat === "TIDAK_TERCAPAI") return "Tidak Tercapai"

  // Return as-is if already properly formatted
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

  // Assuming each indicator represents 1 day of attendance
  // This is a simplification - in reality, you'd need to know total school days
  const totalHariSekolah = kehadiran.length * 5 // Rough estimate: 5 days per week per indicator
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