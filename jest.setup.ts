import { jest } from '@jest/globals'
import { PrismaClient } from '@prisma/client'
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended'

// --- 4. MOCK FILE SYSTEM (fs) [PERBAIKAN] ---
// HARUS DIDEFINISIKAN SEBELUM PRISMA/LIBRARY LAIN
const mockReadFileSync = jest.fn(() => Buffer.from('mock-file-buffer'));
jest.mock('fs', () => {
  const originalFs = jest.requireActual('fs') as typeof import('fs');
  return {
    ...originalFs, // Impor semua fungsi asli (existsSync, constants, bind, dll)
    readFileSync: mockReadFileSync, // Timpa HANYA readFileSync
    existsSync: jest.fn(() => true), // Dibutuhkan oleh Prisma
  };
});
export { mockReadFileSync }; // Ekspor ini agar file tes bisa memeriksanya

// --- 1. MOCK PRISMA ---
const mockPrisma = mockDeep<PrismaClient>()
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrisma,
}))
export { mockPrisma } // Ekspor mock untuk tes

// --- 2. MOCK LIBRARY INPUT (Excel) ---
jest.mock('exceljs')

// --- 3. MOCK LIBRARY OUTPUT (Dokumen) ---
const mockDoc = {
  setData: jest.fn(),
  render: jest.fn(),
  getZip: jest.fn(() => ({
    generate: jest.fn(() => Buffer.from('mock-docx-buffer')),
  })),
}
jest.mock('docxtemplater', () => {
  return jest.fn(() => mockDoc)
})
jest.mock('pizzip', () => {
  return jest.fn(() => ({}))
})
jest.mock('docxtemplater-image-module-free', () => {
  return jest.fn().mockImplementation(() => {
    return { set: jest.fn(), render: jest.fn() };
  });
});

// --- 5. MOCK LIBRARY LAINNYA ---
jest.mock('image-size', () => ({
  __esModule: true,
  default: jest.fn(() => ({ width: 150, height: 75 })),
}))
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    arrayBuffer: () => Promise.resolve(Buffer.from('mock-fetch-buffer')),
  } as unknown as Response)
)
// Mock 'generateLaporanNilai' secara global
jest.mock('@/lib/raport-utils', () => ({
  ...(jest.requireActual('@/lib/raport-utils') as any), // Impor fungsi asli
  generateLaporanNilai: jest.fn(), // Timpa hanya fungsi ini
}))


// --- 6. RESET SEMUA MOCK ---
beforeEach(() => {
  mockReset(mockPrisma)
  ;(global.fetch as jest.Mock).mockClear()
  mockReadFileSync.mockClear(); 
  ;(require('docxtemplater') as jest.Mock).mockClear()
  ;(require('pizzip') as jest.Mock).mockClear()
  mockDoc.setData.mockClear()
  mockDoc.render.mockClear()
  mockDoc.getZip().generate.mockClear()
  // Reset mock generateLaporanNilai juga
  ;(require('@/lib/raport-utils').generateLaporanNilai as jest.Mock).mockClear()
})