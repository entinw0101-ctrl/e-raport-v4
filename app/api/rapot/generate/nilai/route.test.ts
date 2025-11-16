import { POST } from './route'
import { NextRequest } from 'next/server'
// DIUBAH: Hapus 'originalFs'
import { mockPrisma, mockReadFileSync } from '../../../../../jest.setup'
import Docxtemplater from 'docxtemplater'
// DIUBAH: Hapus 'import fs'
import { StatusSiswa, Semester, JenisKelamin } from '@prisma/client'
import { generateLaporanNilai } from '@/lib/raport-utils'
import path from 'path' // Impor path untuk assertion

// DIUBAH: Hapus blok jest.mock('fs', ...)

// DIUBAH: Hapus jest.mock('@/lib/raport-utils', ...)
// Ini sekarang di-mock secara global di jest.setup.ts

// Buat alias untuk mock
const mockGenerateLaporanNilai = generateLaporanNilai as jest.Mock

// Helper
function createMockApiRequest(body: any) {
  const request = {
    json: async () => body,
  } as NextRequest
  return request
}

// Mock data
const mockTemplate = { id: 1, jenis_template: 'NILAI', is_active: true, file_path: '/templates/nilai.docx' }
const mockSiswa = {
  id: 1,
  nama: 'Siswa Nilai',
  kelas: {
    wali_kelas: {
      nama: 'Wali Kelas A',
      nip: '12345',
      tanda_tangan: '/ttd/wali.png'
    }
  }
}
const mockReportData = {
  header: { nama: 'Siswa Nilai', nis: 'NIS-001', kotaAsal: 'Sumedang', semester: 'GANJIL', tahunAjaran: '2023/2024' },
  nilaiUjian: [],
  nilaiHafalan: [],
  kehadiran: [],
  totalNilaiUjian: 0,
  rataRataUjian: 0,
  // ... data lain dari generateLaporanNilai
}


describe('API POST /api/generate/nilai (White-Box Test)', () => {

  beforeEach(() => {
    // Reset mock khusus untuk file ini
    mockGenerateLaporanNilai.mockClear()
    // DIUBAH: Reset mock prisma juga
    mockPrisma.siswa.findUnique.mockClear()
    mockPrisma.templateDokumen.findFirst.mockClear()
  })

  test('Harus mengembalikan error 400 jika generateLaporanNilai gagal', async () => {
    // 1. Setup Mock
    mockGenerateLaporanNilai.mockResolvedValue({
      canGenerate: false,
      error: 'Data nilai tidak lengkap'
    })

    // 2. Buat Request
    const request = createMockApiRequest({ siswaId: '1', periodeAjaranId: '1' })
    const response = await POST(request)
    const body = await response.json()

    // 3. Assert
    expect(response.status).toBe(400)
    expect(mockGenerateLaporanNilai).toHaveBeenCalledWith('1', '1', { isAdmin: true })
    expect(body.error).toBe('Data nilai tidak lengkap')
  })

  test('Harus mengembalikan error 404 jika template nilai tidak ditemukan', async () => {
    // 1. Setup Mock
    mockGenerateLaporanNilai.mockResolvedValue({
      canGenerate: true,
      data: mockReportData
    })
    mockPrisma.siswa.findUnique.mockResolvedValue(mockSiswa as any)
    mockPrisma.templateDokumen.findFirst.mockResolvedValue(null) // Template tidak ada

    // 2. Buat Request
    const request = createMockApiRequest({ siswaId: '1', periodeAjaranId: '1' })
    const response = await POST(request)
    const body = await response.json()

    // 3. Assert
    expect(response.status).toBe(404)
    expect(body.error).toContain('Template nilai tidak ditemukan')
  })

  test('Harus berhasil generate dokumen (Jalur Sukses)', async () => {
    // 1. Setup Mock
    mockGenerateLaporanNilai.mockResolvedValue({
      canGenerate: true,
      data: mockReportData
    })
    mockPrisma.siswa.findUnique.mockResolvedValue(mockSiswa as any)
    mockPrisma.templateDokumen.findFirst.mockResolvedValue(mockTemplate as any)
    
    // 2. Buat Request
    const request = createMockApiRequest({ siswaId: '1', periodeAjaranId: '1' })
    const response = await POST(request)

    // 3. Assert
    expect(response.status).toBe(200)

    // Cek apakah fungsi inti dipanggil
    expect(mockGenerateLaporanNilai).toHaveBeenCalledWith('1', '1', { isAdmin: true })

    // Cek apakah fs dipanggil (1x template, 1x ttd)
    // DIUBAH: Assert pada 'mockReadFileSync'
    expect(mockReadFileSync).toHaveBeenCalledTimes(2)

    // DIUBAH: Perbaiki assertion path agar OS-agnostic
    const expectedTemplatePath = path.join(process.cwd(), 'public', mockTemplate.file_path.replace(/^\//, ""));
    const expectedTtdPath = path.join(process.cwd(), 'public', mockSiswa.kelas.wali_kelas.tanda_tangan.replace(/^\//, ''));

    expect(mockReadFileSync).toHaveBeenCalledWith(expectedTemplatePath)
    expect(mockReadFileSync).toHaveBeenCalledWith(expectedTtdPath)
    
    // Cek apakah docxtemplater dipanggil
    // DIUBAH: Tambahkan 'as unknown' untuk memperbaiki error TypeScript
    const mockDocInstance = (Docxtemplater as unknown as jest.Mock).mock.results[0].value
    
    // --- FIX: HAPUS .setData ---
    // Baris ini dihapus karena docxtemplater v3 menggunakan .render(data)
    // expect(mockDocInstance.setData).toHaveBeenCalled()
    
    // Baris ini sudah benar
    expect(mockDocInstance.render).toHaveBeenCalled()
    
    // Cek headers
    expect(response.headers.get('Content-Disposition')).toContain('Nilai_Siswa_Nilai')
  })
})