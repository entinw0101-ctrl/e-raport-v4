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

// Fungsi helper untuk mock ExcelJS
function setupMockExcel(mockData: any) {
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
      const values = (mockData as any)[sheetName]
      if (values) {
        return { getSheetValues: () => values }
      }
      return undefined
    }),
  }
  ;(mockExcelJS.Workbook as jest.Mock).mockImplementation(() => mockWorkbook)
}

// Fungsi helper untuk mock Prisma
function setupMockPrisma() {
  mockPrisma.siswa.findMany.mockResolvedValue(mockSiswa as any)
  mockPrisma.mataPelajaran.findMany.mockResolvedValue(mockMapel as any)
  mockPrisma.indikatorKehadiran.findMany.mockResolvedValue(mockIndikatorKehadiran as any)
  mockPrisma.indikatorSikap.findMany.mockResolvedValue(mockIndikatorSikap as any)
  mockPrisma.kurikulum.findFirst.mockResolvedValue({ id: 'kur-id-1' } as any)
  mockPrisma.nilaiUjian.upsert.mockResolvedValue({} as any)
  mockPrisma.nilaiHafalan.upsert.mockResolvedValue({} as any)
  mockPrisma.kehadiran.upsert.mockResolvedValue({} as any)
  mockPrisma.penilaianSikap.upsert.mockResolvedValue({} as any)
  mockPrisma.catatanSiswa.upsert.mockResolvedValue({} as any)
}

describe('API POST /api/upload/excel/combined-template (White-Box Test)', () => {
  beforeEach(() => {
    // Reset semua mock dari 'exceljs' dan 'prisma'
    jest.clearAllMocks()
    // Setup mock default
    setupMockExcel(mockSheetValues)
    setupMockPrisma()
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

    expect(response.status).toBe(200) // API route mengembalikan 200, tapi body berisi error validasi
    expect(body.success).toBe(true) // 'success' di sini berarti API-nya sukses, bukan validasinya
    expect(body.canProceed).toBe(false) // <-- PERBAIKAN: Memastikan canProceed false
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
    // 1. Setup Mock Prisma (sudah di beforeEach)
    // 2. Buat Request
    const file = new File(['dummy'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const request = createMockRequest(file, 'k1', '1', 'true') // import=true, periode_ajaran_id=1

    // 3. Panggil Fungsi POST
    const response = await POST(request)
    const body = await response.json()

    // 4. Assert
    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.message).toBe('Data berhasil diimport')
    expect(body.imported).toBe(true)

    // Cek apakah fungsi lookup dipanggil
    expect(mockPrisma.siswa.findMany).toHaveBeenCalledWith({
      where: { nis: { in: ['NIS-001'] }, status: 'Aktif' },
      include: { kelas: { include: { tingkatan: true } } },
    })

    // Cek apakah fungsi upsert dipanggil
    expect(mockPrisma.nilaiUjian.upsert).toHaveBeenCalledTimes(1)
    expect(mockPrisma.nilaiUjian.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          siswa_id_mapel_id_periode_ajaran_id: {
            siswa_id: 'siswa-id-1',
            mapel_id: 'mapel-id-1',
            periode_ajaran_id: 1, 
          },
        },
        create: {
          siswa_id: 'siswa-id-1',
          mapel_id: 'mapel-id-1',
          periode_ajaran_id: 1,
          nilai_angka: 9,
          predikat: 'Baik Sekali', 
        },
      }),
    )
    
    expect(mockPrisma.nilaiHafalan.upsert).toHaveBeenCalledTimes(1)
    expect(mockPrisma.kehadiran.upsert).toHaveBeenCalledTimes(1)
    expect(mockPrisma.penilaianSikap.upsert).toHaveBeenCalledTimes(1)
    expect(mockPrisma.catatanSiswa.upsert).toHaveBeenCalledTimes(1)
  })

  // --- TES BARU UNTUK DEFECT (VERSI PERBAIKAN) ---

  test('[FIXED] TC-File-Kosong: Harus menolak import jika file Excel tidak berisi data (kosong)', async () => {
    // 1. Setup Mock (Excel kosong, hanya header)
    const emptyMockData = {
      'Nilai Ujian': [[], []], // Tidak ada data rows
      'Nilai Hafalan': [[], []],
      'Kehadiran': [[], []],
      'Penilaian Sikap': [[], []],
      'Catatan Siswa': [[], []],
    }
    setupMockExcel(emptyMockData)
    
    // 2. Buat Request
    const file = new File(['dummy'], 'empty.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const request = createMockRequest(file, 'k1', '1', 'true') // import=true

    // 3. Panggil Fungsi POST
    const response = await POST(request)
    const body = await response.json()

    // 4. Assert (Memastikan PERILAKU YANG BENAR)
    expect(response.status).toBe(200)
    // --- PERBAIKAN TES ---
    expect(body.message).toContain("File Excel tidak berisi data")
    expect(body.canProceed).toBe(false)
    expect(body.imported).toBe(false)
    // --- AKHIR PERBAIKAN TES ---
    expect(mockPrisma.nilaiUjian.upsert).not.toHaveBeenCalled()
  })

  test('[FIXED] TC-014: Harus menolak import jika data tidak valid (nilai > 10)', async () => {
    // 1. Setup Mock (Data nilai ujian tidak valid)
    const invalidData = {
      ...mockSheetValues,
      'Nilai Ujian': [
        [], [],
        [null, 'NIS-001', 'Siswa A', 'Mapel Ujian A', 120] // Nilai tidak valid (120 > 10)
      ],
    }
    setupMockExcel(invalidData)
    // Prisma mock sudah di setup di beforeEach

    // 2. Buat Request
    const file = new File(['dummy'], 'invalid.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const request = createMockRequest(file, 'k1', '1', 'true') // import=true

    // 3. Panggil Fungsi POST
    const response = await POST(request)
    const body = await response.json()

    // 4. Assert (Memastikan PERILAKU YANG BENAR)
    expect(response.status).toBe(200)
    // --- PERBAIKAN TES ---
    expect(body.message).toContain("Terdapat error dalam validasi data")
    expect(body.canProceed).toBe(false)
    expect(body.imported).toBe(false)
    // Memastikan error terdeteksi di sheet yang benar
    const validationError = body.validation.find((v: any) => v.sheet === 'Nilai Ujian')
    expect(validationError.status).toBe('error')
    expect(validationError.details[0]).toContain("tidak valid. Harus angka antara 0-10")
    // --- AKHIR PERBAIKAN TES ---
    expect(mockPrisma.nilaiUjian.upsert).not.toHaveBeenCalled()
  })

  test('[FIXED] TC-015: Harus menolak import jika struktur kolom tidak sesuai (kolom kurang)', async () => {
    // 1. Setup Mock (Struktur kolom Nilai Ujian salah)
    const brokenTemplate = {
      ...mockSheetValues,
      'Nilai Ujian': [
        [], [],
        [null, 'NIS-001', 'Siswa A'] // Hanya 3 kolom, seharusnya 5
      ],
    }
    setupMockExcel(brokenTemplate)
    // Prisma mock sudah di setup di beforeEach

    // 2. Buat Request
    const file = new File(['dummy'], 'broken.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const request = createMockRequest(file, 'k1', '1', 'true') // import=true

    // 3. Panggil Fungsi POST
    const response = await POST(request)
    const body = await response.json()

    // 4. Assert (Memastikan PERILAKU YANG BENAR)
    expect(response.status).toBe(200)
    // --- PERBAIKAN TES ---
    expect(body.message).toContain("Terdapat error dalam validasi data")
    expect(body.canProceed).toBe(false)
    expect(body.imported).toBe(false)
    // Memastikan error terdeteksi di sheet yang benar
    const validationError = body.validation.find((v: any) => v.sheet === 'Nilai Ujian')
    expect(validationError.status).toBe('error')
    expect(validationError.details[0]).toContain("Struktur kolom tidak sesuai template")
    // --- AKHIR PERBAIKAN TES ---
    expect(mockPrisma.nilaiUjian.upsert).not.toHaveBeenCalled()
  })
})