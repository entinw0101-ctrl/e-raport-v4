import type { Config } from 'jest'
import nextJest from 'next/jest.js'

// Memberikan path ke aplikasi Next.js Anda untuk memuat next.config.js dan .env
const createJestConfig = nextJest({
  dir: './',
})

// Konfigurasi kustom Jest
const config: Config = {
  coverageProvider: 'v8',
  
  // Gunakan 'node' environment karena kita menguji API route, bukan komponen React
  testEnvironment: 'jest-environment-node', 

  // Menjalankan file ini sebelum setiap tes (penting untuk mock Prisma)
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  // Mengatur ts-jest sebagai preset
  preset: 'ts-jest',

  // Menangani path alias (misal: "@/lib/prisma")
  moduleNameMapper: {
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/utils/(.*)$': '<rootDir>/utils/$1',
    // Tambahkan alias lain jika diperlukan
  },

  // Mengabaikan folder node_modules dan .next
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],
}

// createJestConfig membungkus konfigurasi Next.js
// sehingga Jest dapat menangani file seperti global.css, dll.
export default createJestConfig(config)