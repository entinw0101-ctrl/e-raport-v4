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