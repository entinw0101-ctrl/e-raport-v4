import { POST } from './route' // Import dari file di direktori yang sama
import { NextRequest } from 'next/server'
// DIUBAH: Hapus 'originalFs'
import { mockPrisma, mockReadFileSync } from '../../../../../jest.setup' // Path relatif dari 'app/api/upload/excel/combined-template' ke root
import ExcelJS from 'exceljs'

// DIUBAH: Hapus blok jest.mock('fs', ...)

// Tipe helper untuk mock
const mockExcelJS = ExcelJS as jest.Mocked<typeof ExcelJS>

// Fungsi helper untuk membuat mock NextRequest dengan FormData
function createMockRequest(
  file: File | null,
  kelasId: string,
  periodeAjaranId: string,
  shouldImport: string,
) {
  const formData = new FormData()
  if (file) {
    formData.append('file', file)
  }
  formData.append('kelas_id', kelasId)
  formData.append('periode_ajaran_id', periodeAjaranId)
  formData.append('import', shouldImport)

  // next-mocks-http tidak sepenuhnya kompatibel dengan NextRequest 13+
  // Cara termudah adalah membuat mock manual seperti ini
  const request = new NextRequest('http://localhost/api/upload', {
    method: 'POST',
    body: formData,
    // headers diperlukan untuk formData
    headers: { 'Content-Type': 'multipart/form-data' },
  })

  // Kita perlu me-mock metode formData() secara manual
  jest.spyOn(request, 'formData').mockResolvedValue(formData)

  return request
}

// Mock data untuk Excel
const mockSheetValues = {
  'Nilai Ujian': [
    [], // Header
    [], // Header
    [null, 'NIS-001', 'Siswa A', 'Mapel Ujian A', 9], // <= Sesuai aturan bisnis 0-10
  ],
  'Nilai Hafalan': [
    [], // Header
    [], // Header
    [null, 'NIS-001', 'Siswa A', 'Mapel Hafalan B', 'Juz 30', 'Juz 30', 'Tercapai'],
  ],
  'Kehadiran': [
    [], // Header
    [], // Header
    [null, 'NIS-001', 'Siswa A', 'Harian', 1, 1, 0, null], // <-- Diperbaiki agar 8 kolom
  ],
  'Penilaian Sikap': [
    [], // Header
    [], // Header
    [null, 'NIS-001', 'Siswa A', 'Spiritual', 'Berdoa', 95], // Sesuai aturan bisnis 0-100
  ],
  'Catatan Siswa': [
    [], // Header
    [], // Header
    [null, 'NIS-001', 'Siswa A', 'Sangat baik', 'Perlu ditingkatkan'],
  ],
}

// Mock data untuk Prisma Lookup
const mockSiswa = [{ id: 'siswa-id-1', nis: 'NIS-001', kelas: { tingkatan: { id: 1 } } }]
const mockMapel = [
  { id: 'mapel-id-1', nama_mapel: 'Mapel Ujian A', jenis: 'Ujian' },
  { id: 'mapel-id-2', nama_mapel: 'Mapel Hafalan B', jenis: 'Hafalan' },
]
const mockIndikatorKehadiran = [{ id: 'ikh-id-1', nama_indikator: 'Harian' }]
const mockIndikatorSikap = [{ id: 'iks-id-1', indikator: 'Berdoa' }]

describe('API POST /api/upload/excel/combined-template (White-Box Test)', () => {
  beforeEach(() => {
    // Reset semua mock dari 'exceljs' dan 'prisma'
    jest.clearAllMocks()

    // Setup mock 'exceljs'
    const mockWorkbook = {
      xlsx: { load: jest.fn().mockResolvedValue(undefined) },
      worksheets: [
        { name: 'Nilai Ujian' },
        { name: 'Nilai Hafalan' },
        { name: 'Kehadiran' },
        { name: 'Penilaian Sikap' },
        { name: 'Catatan Siswa' },
      ],
      getWorksheet: jest.fn((sheetName: string) => {
        const values = (mockSheetValues as any)[sheetName]
        if (values) {
          return { getSheetValues: () => values }
        }
        return undefined
      }),
    }
    ;(mockExcelJS.Workbook as jest.Mock).mockImplementation(() => mockWorkbook)
  })

  test('Harus mengembalikan error 400 jika tidak ada file', async () => {
    const request = createMockRequest(null, 'k1', 'p1', 'false')
    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('File tidak ditemukan')
  })

  test('Harus mengembalikan error 400 jika file bukan Excel', async () => {
    const file = new File(['dummy'], 'test.txt', { type: 'text/plain' })
    const request = createMockRequest(file, 'k1', 'p1', 'false')
    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('File harus berformat Excel (.xlsx atau .xls)')
  })

  test('Harus mengembalikan error jika sheet wajib tidak ada', async () => {
    // Mock 'exceljs' untuk mengembalikan sheet yang tidak lengkap
    const mockWorkbook = {
      xlsx: { load: jest.fn().mockResolvedValue(undefined) },
      worksheets: [{ name: 'HANYA NILAI UJIAN' }], // Sheet tidak lengkap
      getWorksheet: jest.fn(),
    }
    ;(mockExcelJS.Workbook as jest.Mock).mockImplementation(() => mockWorkbook)

    const file = new File(['dummy'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const request = createMockRequest(file, 'k1', 'p1', 'false')
    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.validation).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sheet: 'Nilai Hafalan', status: 'error' }),
        expect.objectContaining({ sheet: 'Kehadiran', status: 'error' }),
      ]),
    )
  })

  test('Harus berhasil validasi (tanpa import)', async () => {
    const file = new File(['dummy'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const request = createMockRequest(file, 'k1', 'p1', 'false') // import=false
    
    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.message).toBe('Semua data berhasil divalidasi')
    expect(body.canProceed).toBe(true)
    expect(body.imported).toBe(false)
    
    // Pastikan tidak ada panggilan ke database
    expect(mockPrisma.siswa.findMany).not.toHaveBeenCalled()
    expect(mockPrisma.nilaiUjian.upsert).not.toHaveBeenCalled()
  })

  test('Harus berhasil validasi DAN import data (Jalur Sukses)', async () => {
    // --- 1. Setup Mock Prisma (Lookup) ---
    // Gunakan .mockResolvedValue() pada mockPrisma
    mockPrisma.siswa.findMany.mockResolvedValue(mockSiswa as any)
    mockPrisma.mataPelajaran.findMany.mockResolvedValue(mockMapel as any)
    mockPrisma.indikatorKehadiran.findMany.mockResolvedValue(mockIndikatorKehadiran as any)
    mockPrisma.indikatorSikap.findMany.mockResolvedValue(mockIndikatorSikap as any)
    // Mock untuk cek kurikulum
    mockPrisma.kurikulum.findFirst.mockResolvedValue({ id: 'kur-id-1' } as any)
    
    // Mock hasil upsert (opsional, tapi bagus untuk memastikan)
    mockPrisma.nilaiUjian.upsert.mockResolvedValue({} as any)
    mockPrisma.nilaiHafalan.upsert.mockResolvedValue({} as any)
    mockPrisma.kehadiran.upsert.mockResolvedValue({} as any)
    mockPrisma.penilaianSikap.upsert.mockResolvedValue({} as any)
    mockPrisma.catatanSiswa.upsert.mockResolvedValue({} as any)

    // --- 2. Buat Request ---
    const file = new File(['dummy'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    // DIUBAH: Memanggil createMockRequest, bukan createMockApiRequest
    const request = createMockRequest(file, 'k1', '1', 'true') // import=true, periode_ajaran_id=1

    // --- 3. Panggil Fungsi POST ---
    const response = await POST(request)
    const body = await response.json()

    // --- 4. Assert ---
    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.message).toBe('Data berhasil diimport')
    expect(body.imported).toBe(true)

    // Cek apakah fungsi lookup dipanggil
    expect(mockPrisma.siswa.findMany).toHaveBeenCalledWith({
      where: { nis: { in: ['NIS-001'] }, status: 'Aktif' },
      include: { kelas: { include: { tingkatan: true } } },
    })

    // Cek apakah fungsi upsert dipanggil (ini adalah inti dari white-box test)
    expect(mockPrisma.nilaiUjian.upsert).toHaveBeenCalledTimes(1)
    expect(mockPrisma.nilaiUjian.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          siswa_id_mapel_id_periode_ajaran_id: {
            siswa_id: 'siswa-id-1',
            mapel_id: 'mapel-id-1',
            periode_ajaran_id: 1, // Pastikan ini angka
          },
        },
        create: {
          siswa_id: 'siswa-id-1',
          mapel_id: 'mapel-id-1',
          periode_ajaran_id: 1,
          nilai_angka: 9, // Sesuai aturan bisnis 0-10
          predikat: 'Baik Sekali', // Sesuai aturan bisnis 0-10
        },
      }),
    )
    
    expect(mockPrisma.nilaiHafalan.upsert).toHaveBeenCalledTimes(1)
    expect(mockPrisma.kehadiran.upsert).toHaveBeenCalledTimes(1)
    expect(mockPrisma.penilaianSikap.upsert).toHaveBeenCalledTimes(1)
    expect(mockPrisma.catatanSiswa.upsert).toHaveBeenCalledTimes(1)
  })
})