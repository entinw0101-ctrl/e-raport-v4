-- Script untuk membuat database schema E-RAPOT
-- Jalankan setelah setup Supabase project

-- Enable Row Level Security untuk semua tabel
-- (akan diatur per tabel sesuai kebutuhan)

-- Buat enum types
CREATE TYPE "Status" AS ENUM ('aktif', 'nonaktif');
CREATE TYPE "Semester" AS ENUM ('1', '2');
CREATE TYPE "JenisKelamin" AS ENUM ('Laki-laki', 'Perempuan');
CREATE TYPE "StatusGuru" AS ENUM ('aktif', 'nonaktif');
CREATE TYPE "StatusSiswa" AS ENUM ('Aktif', 'Lulus', 'Keluar', 'Pindah');
CREATE TYPE "JenisMapel" AS ENUM ('Ujian', 'Hafalan');
CREATE TYPE "PredikatHafalan" AS ENUM ('Tercapai', 'Tidak Tercapai');
CREATE TYPE "JenisSikap" AS ENUM ('Spiritual', 'Sosial');
CREATE TYPE "JenisKelaminTarget" AS ENUM ('Laki-laki', 'Perempuan', 'Semua');
CREATE TYPE "StatusPejabat" AS ENUM ('aktif', 'nonaktif');

-- Catatan: Tabel akan dibuat otomatis oleh Prisma migrate
-- Script ini hanya untuk referensi enum types yang diperlukan
