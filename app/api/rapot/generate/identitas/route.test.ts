import { POST } from './route'
import { NextRequest } from 'next/server'
// DIUBAH: Hapus 'originalFs'
import { mockPrisma, mockReadFileSync } from '../../../../../jest.setup'
import Docxtemplater from 'docxtemplater'
import { StatusSiswa, Semester } from '@prisma/client'
import path from 'path' // Impor path untuk assertion

// DIUBAH: Hapus blok jest.mock('fs', ...)

// Fungsi helper untuk membuat mock NextRequest
// ... (sisa file tidak berubah) ...
function createMockApiRequest(body: any) {
  const request = {
    json: async () => body,
  } as NextRequest
  return request
}

// Mock data yang konsisten
const mockTemplate = { id: 1, jenis_template: 'IDENTITAS', is_active: true, file_path: '/templates/identitas.docx' }
const mockSiswa = { id: 1, nama: 'Siswa Identitas', nis: 'NIS-ID-001' }
const mockGuru = { id: 1, nama: 'Kepala Pesantren' }
const mockPeriode = { id: 1, nama_ajaran: '2023/2024' }

describe('API POST /api/generate/identitas (White-Box Test)', () => {

  beforeEach(() => {
    // Reset semua mock sebelum setiap tes
    mockPrisma.templateDokumen.findFirst.mockClear()
    mockPrisma.siswa.findUnique.mockClear()
    mockPrisma.guru.findFirst.mockClear()
    mockPrisma.periodeAjaran.findUnique.mockClear()
  })

  test('Harus mengembalikan error 404 jika template tidak ditemukan', async () => {
    // 1. Setup Mock
    mockPrisma.templateDokumen.findFirst.mockResolvedValue(null)
    mockPrisma.siswa.findUnique.mockResolvedValue(mockSiswa as any)
    mockPrisma.guru.findFirst.mockResolvedValue(mockGuru as any)

    // 2. Buat Request
    const request = createMockApiRequest({ siswaId: '1', periodeAjaranId: '1' })
    const response = await POST(request)
    const body = await response.json()

    // 3. Assert
    expect(response.status).toBe(404)
    expect(body.error).toContain('Template identitas tidak ditemukan')
  })

  test('Harus berhasil generate dokumen (Jalur Sukses)', async () => {
    // 1. Setup Mock
    mockPrisma.templateDokumen.findFirst.mockResolvedValue(mockTemplate as any)
    mockPrisma.siswa.findUnique.mockResolvedValue(mockSiswa as any)
    mockPrisma.guru.findFirst.mockResolvedValue(mockGuru as any)
    mockPrisma.periodeAjaran.findUnique.mockResolvedValue(mockPeriode as any)
    
    // 2. Buat Request
    const request = createMockApiRequest({ siswaId: '1', periodeAjaranId: '1' })
    const response = await POST(request)

    // 3. Assert
    expect(response.status).toBe(200)
    
    // Cek apakah file system (fs) dipanggil untuk membaca template
    // DIUBAH: Assert pada 'mockReadFileSync'
    expect(mockReadFileSync).toHaveBeenCalledTimes(1)
    
    // DIUBAH: Perbaiki assertion path agar OS-agnostic
    const expectedPath = path.join(process.cwd(), 'public', mockTemplate.file_path.replace(/^\//, ""));
    expect(mockReadFileSync).toHaveBeenCalledWith(expectedPath, 'binary')
    
    // Cek apakah docxtemplater dipanggil
    // DIUBAH: Tambahkan 'as unknown' untuk memperbaiki error TypeScript
    const mockDocInstance = (Docxtemplater as unknown as jest.Mock).mock.results[0].value
    expect(mockDocInstance.setData).toHaveBeenCalled()
    expect(mockDocInstance.render).toHaveBeenCalled()
    
    // Cek headers
    expect(response.headers.get('Content-Disposition')).toContain('Identitas_Siswa_Identitas')
  })
})