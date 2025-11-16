import { POST } from './route'
import { NextRequest } from 'next/server'
// DIUBAH: Hapus 'originalFs'
import { mockPrisma, mockReadFileSync } from '../../../../../jest.setup'
import Docxtemplater from 'docxtemplater'
// DIUBAH: Hapus 'import fs'
import { StatusSiswa, Semester, JenisKelamin, StatusPejabat } from '@prisma/client'
import path from 'path' // Impor path untuk assertion

// DIUBAH: Hapus blok jest.mock('fs', ...)

// Helper
function createMockApiRequest(body: any) {
  const request = {
    json: async () => body,
  } as NextRequest
  return request
}

// Mock data
const mockSiswa = {
  id: 1,
  nama: 'Siswa Sikap',
  nis: 'NIS-SIKAP-001',
  status: StatusSiswa.Aktif,
  jenis_kelamin: JenisKelamin.LAKI_LAKI,
  kelas: { nama_kelas: 'Kelas A' },
  kamar: { nama_kamar: 'Kamar 1' }
}
const mockPeriode = { id: 1, nama_ajaran: '2023/2024', semester: Semester.SATU }
const mockPenilaian = [
  { id: 1, nilai: 90, indikator_sikap: { jenis_sikap: 'Spiritual', indikator: 'Berdoa' } },
  { id: 2, nilai: 80, indikator_sikap: { jenis_sikap: 'Sosial', indikator: 'Jujur' } },
]
const mockCatatan = { id: 1, catatan_sikap: 'Sudah baik' }
// DIUBAH: Ganti nama mock agar konsisten
const mockPenanggungJawab = { id: 1, jabatan: 'Kepala', nama_pejabat: 'Nama Kepala', nip: '123', tanda_tangan: '/ttd/kepala.png' }
// DIUBAH: Tambahkan mock template (ini hilang dari file Anda sebelumnya)
const mockTemplate = { id: 1, file_path: '/templates/sikap.docx' } 

describe('API POST /api/generate/sikap (White-Box Test)', () => {

  // DIUBAH: Tambahkan mockPrisma.templateDokumen.findFirst.mockClear()
  beforeEach(() => {
    mockPrisma.siswa.findUnique.mockClear()
    mockPrisma.periodeAjaran.findUnique.mockClear()
    mockPrisma.penilaianSikap.findMany.mockClear()
    mockPrisma.catatanSiswa.findUnique.mockClear()
    mockPrisma.penanggungJawabRapot.findFirst.mockClear()
    // mockPrisma.templateDokumen.findFirst.mockClear() // Dihapus karena sikap/route.ts Anda menggunakan path statis
  })

  test('Harus mengembalikan error 500 jika Penanggung Jawab tidak ditemukan', async () => {
    // 1. Setup Mock
    mockPrisma.siswa.findUnique.mockResolvedValue(mockSiswa as any)
    mockPrisma.periodeAjaran.findUnique.mockResolvedValue(mockPeriode as any)
    mockPrisma.penilaianSikap.findMany.mockResolvedValue(mockPenilaian as any)
    mockPrisma.catatanSiswa.findUnique.mockResolvedValue(mockCatatan as any)
    // Penanggung Jawab tidak ditemukan
    mockPrisma.penanggungJawabRapot.findFirst.mockResolvedValue(null)
    // mockPrisma.templateDokumen.findFirst.mockResolvedValue(mockTemplate as any) // Tambahkan ini

    // 2. Buat Request
    const request = createMockApiRequest({ siswaId: '1', periodeAjaranId: '1' })
    const response = await POST(request)
    const body = await response.json()

    // 3. Assert
    expect(response.status).toBe(500)
    expect(body.error).toContain('Gagal generate laporan sikap')
  })

  test('Harus berhasil generate dokumen (Jalur Sukses)', async () => {
    // 1. Setup Mock
    mockPrisma.siswa.findUnique.mockResolvedValue(mockSiswa as any)
    mockPrisma.periodeAjaran.findUnique.mockResolvedValue(mockPeriode as any)
    mockPrisma.penilaianSikap.findMany.mockResolvedValue(mockPenilaian as any)
    mockPrisma.catatanSiswa.findUnique.mockResolvedValue(mockCatatan as any)
    // DIUBAH: Tambahkan mock untuk Penanggung Jawab
    mockPrisma.penanggungJawabRapot.findFirst.mockResolvedValue(mockPenanggungJawab as any)
    // DIUBAH: template sikap/route.ts Anda di-hardcode, jadi kita tidak perlu mock DB-nya
    // mockPrisma.templateDokumen.findFirst.mockResolvedValue(mockTemplate as any) 
    
    // 2. Buat Request
    const request = createMockApiRequest({ siswaId: '1', periodeAjaranId: '1' })
    const response = await POST(request)

    // 3. Assert
    expect(response.status).toBe(200)

    // Cek apakah fs dipanggil (1x template, 1x ttd)
    // DIUBAH: Assert pada 'mockReadFileSync'
    expect(mockReadFileSync).toHaveBeenCalledTimes(2)

    // DIUBAH: Perbaiki assertion path agar OS-agnostic
    const expectedTemplatePath = path.join(process.cwd(), 'public/uploads/templates/template_sikap_1758891177667.docx')
    const expectedTtdPath = path.join(process.cwd(), 'public', mockPenanggungJawab.tanda_tangan.replace(/^\//, ''))

    expect(mockReadFileSync).toHaveBeenCalledWith(expectedTemplatePath, 'binary')
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
    expect(response.headers.get('Content-Disposition')).toContain('Sikap_Siswa_Sikap')
  })
})