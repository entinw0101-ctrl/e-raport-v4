import { generateLaporanNilai } from './raport-utils' // Impor fungsi yang akan diuji
import { mockPrisma } from '../jest.setup' // Impor mockPrisma dari root
import { StatusSiswa, Semester } from '@prisma/client'

// --- FIX: MENGEMBALIKAN FUNGSI ASLI ---
// Impor implementasi aslinya
const { generateLaporanNilai: actualGenerateLaporanNilai } =
  jest.requireActual<typeof import('./raport-utils')>('./raport-utils');

// Terapkan implementasi asli ke fungsi yang di-mock secara global
// Kita perlu melakukan 'cast' agar TypeScript mengizinkan .mockImplementation
(generateLaporanNilai as jest.Mock).mockImplementation(actualGenerateLaporanNilai);
// --- END OF FIX ---


// --- Mock Data Sesuai Schema Prisma ---

const mockSiswaAktif = {
  id: 1,
  nama: 'Siswa Uji Coba',
  nis: 'NIS-TEST-001',
  status: StatusSiswa.Aktif,
  kelas_id: 10, // <-- DIUBAH: Tambahkan field kelas_id
  kelas: {
    tingkatan: {
      id: 1,
    },
  },
}

const mockPeriode = {
  id: 1,
  nama_ajaran: '2023/2024',
  semester: Semester.SATU, // 'SATU' atau 'DUA'
  master_tahun_ajaran: { id: 1 },
}

const mockKurikulum = [
  { id: 'kur-1', mapel_id: 'mapel-1', kitab: { nama_kitab: 'Kitab A' }, mata_pelajaran: { id: 'mapel-1', nama_mapel: 'Mapel Ujian A' } },
  { id: 'kur-2', mapel_id: 'mapel-2', batas_hafalan: 'Juz 1-2', mata_pelajaran: { id: 'mapel-2', nama_mapel: 'Mapel Hafalan B' } },
]

const mockNilaiUjian = [
  { id: 'nu-1', mata_pelajaran: { id: 'mapel-1', nama_mapel: 'Mapel Ujian A' }, nilai_angka: { toNumber: () => 9 }, predikat: 'Baik Sekali' },
]

const mockNilaiHafalan = [
  { id: 'nh-1', mata_pelajaran: { id: 'mapel-2', nama_mapel: 'Mapel Hafalan B' }, target_hafalan: 'Juz 1', predikat: 'TERCAPAI' },
]

const mockKehadiran = [
  { id: 'kh-1', indikator_kehadiran: { nama_indikator: 'Harian' }, sakit: 1, izin: 1, alpha: 0 },
]

const mockCatatanSiswa = {
  id: 'cs-1',
  catatan_akademik: 'Sangat baik',
  catatan_sikap: 'Perlu ditingkatkan',
}

// Mock untuk fungsi calculateClassRanking (yang dipanggil di dalam generateLaporanNilai)
const mockRanking = {
  rank: 1,
  totalActiveStudents: 20,
  average: 9.0,
  isComplete: true,
}

// --- Mulai Tes ---

describe('White-Box Test: lib/raport-utils.ts', () => {

  // Tes ini untuk fungsi 'generateLaporanNilai'

  test('Harus mengembalikan error jika siswa tidak ditemukan', async () => {
    // 1. Setup Mock: prisma.siswa.findUnique mengembalikan null
    mockPrisma.siswa.findUnique.mockResolvedValue(null)

    // 2. Panggil Fungsi
    const result = await generateLaporanNilai('999', '1')

    // 3. Assert
    expect(result.canGenerate).toBe(false)
    expect(result.error).toBe('Siswa tidak ditemukan')
  })

  test('Harus mengembalikan error jika siswa tidak aktif', async () => {
    // 1. Setup Mock
    const mockSiswaTidakAktif = { ...mockSiswaAktif, status: StatusSiswa.Pindah }
    mockPrisma.siswa.findUnique.mockResolvedValue(mockSiswaTidakAktif as any)

    // 2. Panggil Fungsi
    const result = await generateLaporanNilai('1', '1')

    // 3. Assert
    expect(result.canGenerate).toBe(false)
    expect(result.error).toContain('tidak bisa generate laporan')
  })

  test('Harus mengembalikan peringatan (warning) jika data tidak lengkap (misal: kehadiran kosong)', async () => {
    // 1. Setup Mock (Jalur Sukses, TAPI kehadiran kosong)
    
    // DIUBAH: Hapus .mockResolvedValue() yang persisten, ganti dengan .mockResolvedValueOnce()
    // Panggilan 1: dari generateLaporanNilai
    mockPrisma.siswa.findUnique.mockResolvedValueOnce(mockSiswaAktif as any) 
    
    mockPrisma.periodeAjaran.findUnique.mockResolvedValue(mockPeriode as any)
    mockPrisma.kurikulum.findMany.mockResolvedValue(mockKurikulum as any)
    mockPrisma.nilaiUjian.findMany.mockResolvedValue(mockNilaiUjian as any)
    mockPrisma.nilaiHafalan.findMany.mockResolvedValue(mockNilaiHafalan as any)
    mockPrisma.kehadiran.findMany.mockResolvedValue([]) // <-- Kehadiran Kosong
    mockPrisma.catatanSiswa.findUnique.mockResolvedValue(mockCatatanSiswa as any)
    
    // Mock hasil panggilank calculateClassRanking
    // Panggilan 2: dari calculateClassRanking
    mockPrisma.siswa.findUnique.mockResolvedValueOnce(mockSiswaAktif as any) 
    mockPrisma.siswa.findMany.mockResolvedValue([mockSiswaAktif] as any) // Panggilan internal dari calculateClassRanking
    mockPrisma.nilaiUjian.groupBy.mockResolvedValue([{ siswa_id: 1, _avg: { nilai_angka: 9.0 } }] as any) // Panggilan internal dari calculateClassRanking


    // 2. Panggil Fungsi
    const result = await generateLaporanNilai('1', '1')

    // 3. Assert
    expect(result.canGenerate).toBe(true)
    expect(result.reportStatus).toBe('partial') // Status 'partial' karena data tidak lengkap
    expect(result.warnings).toContain('Belum ada data kehadiran')
  })

  test('Harus berhasil generate laporan lengkap (Jalur Sukses)', async () => {
    // 1. Setup Mock (Semua data ada)
    
    // DIUBAH: Hapus .mockResolvedValue() yang persisten, ganti dengan .mockResolvedValueOnce()
    // Panggilan 1: dari generateLaporanNilai
    mockPrisma.siswa.findUnique.mockResolvedValueOnce(mockSiswaAktif as any) 

    mockPrisma.periodeAjaran.findUnique.mockResolvedValue(mockPeriode as any)
    mockPrisma.kurikulum.findMany.mockResolvedValue(mockKurikulum as any)
    mockPrisma.nilaiUjian.findMany.mockResolvedValue(mockNilaiUjian as any)
    mockPrisma.nilaiHafalan.findMany.mockResolvedValue(mockNilaiHafalan as any)
    mockPrisma.kehadiran.findMany.mockResolvedValue(mockKehadiran as any)
    mockPrisma.catatanSiswa.findUnique.mockResolvedValue(mockCatatanSiswa as any)
    
    // Mock hasil panggilank calculateClassRanking
    // Panggilan 2: dari calculateClassRanking
    mockPrisma.siswa.findUnique.mockResolvedValueOnce(mockSiswaAktif as any) 
    mockPrisma.siswa.findMany.mockResolvedValue([mockSiswaAktif] as any) // Panggilan internal dari calculateClassRanking
    mockPrisma.nilaiUjian.groupBy.mockResolvedValue([{ siswa_id: 1, _avg: { nilai_angka: 9.0 } }] as any) // Panggilan internal dari calculateClassRanking

    // 2. Panggil Fungsi
    const result = await generateLaporanNilai('1', '1')

    // 3. Assert
    expect(result.canGenerate).toBe(true)
    expect(result.reportStatus).toBe('ready')
    expect(result.warnings).toBeUndefined() // Tidak ada warning
    expect(result.data).toBeDefined()

    // Verifikasi data yang digenerate
    expect(result.data?.header.nama).toBe('Siswa Uji Coba')
    expect(result.data?.nilaiUjian[0].nilai).toBe(9)
    expect(result.data?.nilaiHafalan[0].predikat).toBe('Tercapai') // Memastikan normalisasi
    expect(result.data?.kehadiran[0].sakit).toBe(1)
    expect(result.data?.catatanAkademik).toBe('Sangat baik')
    expect(result.data?.peringkat).toBe(mockRanking.rank) // Memastikan ranking dipanggil
  })
})