# E-RAPOT NUURUSH SHOLAAH

Sistem Rapot Digital untuk Pesantren Nuurush Sholaah - Aplikasi web full-stack untuk mengelola data siswa, guru, nilai, dan generate laporan rapot.

## 🚀 Fitur Utama

- **Manajemen Data Master**: CRUD untuk siswa, guru, kelas, mata pelajaran
- **Sistem Penilaian**: Input nilai ujian (UH1, UH2, UTS, UAS) dan hafalan
- **Dashboard Analytics**: Statistik dan visualisasi data dengan charts
- **Laporan Rapot**: Generate dan print rapot siswa per semester
- **Upload File**: Upload tanda tangan guru dan import/export Excel
- **Autentikasi**: Sistem login dengan NextAuth.js dan Google Provider
- **Responsive Design**: UI yang mobile-friendly dengan Tailwind CSS

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL dengan Neon
- **UI Components**: shadcn/ui, Tailwind CSS
- **Charts**: Recharts
- **File Processing**: ExcelJS untuk export/import
- **Authentication**: Stack Auth
- **Deployment**: Vercel

## 📋 Prasyarat

Sebelum memulai, pastikan Anda memiliki:

- Akun GitHub, Vercel, dan Neon.
- Node.js dan npm/yarn terinstall di mesin lokal Anda.
- Proyek Next.js yang sudah berjalan secara lokal.
- Git terinstall dan repository proyek sudah ada di GitHub.

## 🔧 Panduan Deployment Lengkap: Next.js + Neon + Stack Auth ke Vercel

Panduan ini mencakup semua langkah yang diperlukan untuk mendeploy aplikasi Next.js Anda dari lokal ke production di Vercel, menggunakan database Neon dan autentikasi Stack Auth.

### Langkah 1: Konfigurasi Database di Neon

Kita akan menyiapkan database Postgres serverless di Neon.

#### Login dan Buat Proyek Baru

1. Buka dashboard Neon.
2. Klik "Create a new project".
3. Beri nama proyek Anda (misal: erapot-prod), pilih versi Postgres, dan tentukan region terdekat.
4. Tunggu beberapa saat hingga proyek dan database utama (neondb) selesai dibuat.

#### Cara Menyalin Connection String dari Dashboard Neon (Sangat Penting)

1. Setelah proyek dibuat, Anda akan dibawa ke dashboard proyek.
2. Cari kartu (widget) yang berjudul "Connection Details".
3. Pastikan Branch yang terpilih adalah main dan Role adalah nama user Anda.
4. Anda akan melihat sebuah URL koneksi. Ini adalah DATABASE_URL Anda.
5. Klik ikon salin (copy) di sebelah kanan URL tersebut. URL-nya akan memiliki format seperti ini:

   ```
   postgresql://<user>:<password>@<endpoint>.neon.tech/neondb?sslmode=require
   ```

   **Perhatian**: Jaga kerahasiaan Connection String ini. Siapapun yang memilikinya dapat mengakses database Anda.

### Langkah 2: Konfigurasi Proyek Lokal (.env.local)

Sekarang, kita atur environment variables di proyek lokal untuk terhubung ke database Neon.

#### Buat File .env.local

Jika belum ada, buat file ini di root proyek Anda. Anda bisa menyalin dari .env.example.

```bash
cp .env.example .env.local
```

#### Isi File .env.local

Buka file .env.local dan masukkan Connection String dari Neon dan credentials dari Stack Auth.

```env
# .env.local - HANYA UNTUK PENGEMBANGAN LOKAL

# 1. DATABASE DARI NEON
DATABASE_URL='postgresql://<user>:<password>@<endpoint>.neon.tech/neondb?sslmode=require'

# 2. STACK AUTH
NEXT_PUBLIC_STACK_PROJECT_ID='your_stack_project_id'
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY='your_stack_publishable_client_key'
STACK_SECRET_SERVER_KEY='your_stack_secret_server_key'
```

#### Jalankan Migrasi Database

Perintah ini akan membaca DATABASE_URL di atas dan membuat semua tabel yang dibutuhkan oleh Prisma di database Neon Anda.

```bash
npx prisma db push
```

Jika berhasil, Anda akan melihat tabel User, Account, Session, dll. di dalam database Neon Anda.

### Langkah 3: Pastikan Kode Aplikasi Siap

Pastikan aplikasi Anda sudah terintegrasi dengan Stack Auth. Stack Auth akan menangani autentikasi secara otomatis melalui middleware dan komponen yang disediakan.

### Langkah 4: Deployment ke Vercel

#### Push Kode ke GitHub

Pastikan versi terbaru dari kode Anda sudah ada di GitHub.

```bash
git add .
git commit -m "feat: setup for vercel deployment"
git push origin main
```

#### Import Proyek di Vercel

1. Buka dashboard Vercel.
2. Klik "Import Project" dan pilih repository GitHub Anda.

#### Konfigurasi Environment Variables di Vercel

Di halaman konfigurasi, buka bagian "Environment Variables".

Tambahkan variabel berikut dengan nilai untuk production:

```env
# Environment Variables untuk Vercel (Production)

# 1. DATABASE
DATABASE_URL=postgresql://<user>:<password>@<endpoint>.neon.tech/neondb?sslmode=require

# 2. STACK AUTH
NEXT_PUBLIC_STACK_PROJECT_ID=your_stack_project_id
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=your_stack_publishable_client_key
STACK_SECRET_SERVER_KEY=your_stack_secret_server_key
```

#### Deploy Aplikasi

Klik "Deploy" dan tunggu proses build selesai. Aplikasi Anda akan tersedia di URL Vercel yang diberikan.

### Langkah 5: Konfigurasi Pasca-Deployment

#### Test Aplikasi Production

1. Akses URL Vercel Anda.
2. Coba login menggunakan Stack Auth.
3. Verifikasi bahwa data tersimpan di database Neon.

## 📁 Struktur Project

```
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   ├── dashboard/         # Dashboard page
│   ├── siswa/            # Student management
│   ├── guru/             # Teacher management
│   ├── penilaian/        # Assessment system
│   ├── rapot/            # Report generation
│   └── pengaturan/       # Settings
├── src/
│   ├── components/       # Reusable components
│   └── services/         # API services
├── lib/                  # Utilities
├── prisma/              # Database schema
├── scripts/             # Database scripts
└── public/              # Static assets
```

## 🗄️ Database Schema

Sistem menggunakan PostgreSQL dengan tabel utama:

- `siswa` - Data siswa
- `guru` - Data guru
- `kelas` - Data kelas
- `mata_pelajaran` - Mata pelajaran
- `nilai_ujian` - Nilai ujian siswa
- `nilai_hafalan` - Nilai hafalan
- `kehadiran` - Data kehadiran
- `penilaian_sikap` - Penilaian sikap

## 🔐 Authentication

Sistem menggunakan Stack Auth dengan fitur:

- Secure authentication
- Session management
- Protected routes dengan middleware
- JWT-based authentication

## 📊 API Endpoints

### Master Data

- `GET/POST /api/siswa` - CRUD siswa
- `GET/POST /api/guru` - CRUD guru
- `GET/POST /api/kelas` - CRUD kelas

### Penilaian

- `GET/POST /api/nilai-ujian` - CRUD nilai ujian
- `GET/POST /api/nilai-hafalan` - CRUD nilai hafalan

### Laporan

- `POST /api/rapot/generate` - Generate rapot
- `GET /api/dashboard/stats` - Dashboard statistics

### File Upload

- `POST /api/upload/signature` - Upload tanda tangan
- `POST /api/upload/excel` - Upload Excel files

## 📝 Usage Guide

### 1. Setup Awal

- Login dengan akun admin
- Setup data master (tingkatan, mata pelajaran)
- Input data guru dan siswa

### 2. Input Nilai

- Pilih kelas dan mata pelajaran
- Input nilai ujian (UH1, UH2, UTS, UAS)
- Input nilai hafalan

### 3. Generate Rapot

- Pilih siswa dan periode ajaran
- Generate rapot per semester
- Print atau download PDF

### 4. Upload Tanda Tangan

- Upload foto tanda tangan guru
- Manage file signatures di pengaturan

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run seed         # Seed database
```

### Database Operations

```bash
npx prisma studio    # Open Prisma Studio
npx prisma generate  # Generate Prisma client
npx prisma db push   # Push schema changes
npx prisma db pull   # Pull schema from database
```

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Error**

   - Pastikan DATABASE_URL benar
   - Check Neon connection

2. **Authentication Error**

   - Verify Stack Auth configuration
   - Check Stack Auth dashboard

3. **Build Error**
   - Run `npm run build` locally
   - Check TypeScript errors

## 📋 Deployment Checklist

- [ ] Akun GitHub, Vercel, dan Neon sudah dibuat
- [ ] Proyek Neon sudah dibuat dan connection string disalin
- [ ] File .env.local dikonfigurasi dengan benar
- [ ] Migrasi database berhasil dijalankan
- [ ] File NextAuth.js sudah benar
- [ ] Kode sudah di-push ke GitHub
- [ ] Proyek diimpor ke Vercel
- [ ] Environment variables diatur di Vercel
- [ ] Deployment berhasil
- [ ] Google Cloud Console diperbarui dengan URL production
- [ ] Aplikasi berhasil ditest di production

## 📞 Support

Untuk bantuan teknis atau pertanyaan:

- Email: support@nuurushsholaah.com
- GitHub Issues: [Create Issue](repository-url/issues)

## 📄 License

Copyright © 2024 Pesantren Nuurush Sholaah. All rights reserved.

---

**Dibuat dengan ❤️ untuk Pesantren Nuurush Sholaah**
