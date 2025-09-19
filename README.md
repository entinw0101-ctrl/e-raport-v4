# E-RAPOT NUURUSH SHOLAAH

Sistem Rapot Digital untuk Pesantren Nuurush Sholaah - Aplikasi web full-stack untuk mengelola data siswa, guru, nilai, dan generate laporan rapot.

## 🚀 Fitur Utama

- **Manajemen Data Master**: CRUD untuk siswa, guru, kelas, mata pelajaran
- **Sistem Penilaian**: Input nilai ujian (UH1, UH2, UTS, UAS) dan hafalan
- **Dashboard Analytics**: Statistik dan visualisasi data dengan charts
- **Laporan Rapot**: Generate dan print rapot siswa per semester
- **Upload File**: Upload tanda tangan guru dan import/export Excel
- **Autentikasi**: Sistem login dengan Supabase Auth
- **Responsive Design**: UI yang mobile-friendly dengan Tailwind CSS

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL dengan Supabase
- **UI Components**: shadcn/ui, Tailwind CSS
- **Charts**: Recharts
- **File Processing**: ExcelJS untuk export/import
- **Authentication**: Supabase Auth
- **Deployment**: Vercel

## 📋 Prerequisites

- Node.js 18+ 
- npm atau yarn
- Akun Supabase
- Akun Vercel (untuk deployment)

## 🔧 Installation

1. **Clone repository**
\`\`\`bash
git clone <repository-url>
cd e-rapot-nuurush-sholaah
\`\`\`

2. **Install dependencies**
\`\`\`bash
npm install
\`\`\`

3. **Setup environment variables**
\`\`\`bash
cp .env.example .env.local
\`\`\`

Isi file `.env.local` dengan konfigurasi Supabase:
\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DATABASE_URL=your_postgresql_connection_string
\`\`\`

4. **Setup database**
\`\`\`bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# Seed initial data
npm run seed
\`\`\`

5. **Run development server**
\`\`\`bash
npm run dev
\`\`\`

Aplikasi akan berjalan di `http://localhost:3000`

## 📁 Struktur Project

\`\`\`
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
\`\`\`

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

Sistem menggunakan Supabase Auth dengan fitur:
- Email/Password authentication
- Session management
- Protected routes dengan middleware
- Row Level Security (RLS)

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

## 🚀 Deployment

### Deploy ke Vercel

1. **Push ke GitHub**
\`\`\`bash
git add .
git commit -m "Initial commit"
git push origin main
\`\`\`

2. **Connect ke Vercel**
- Login ke [vercel.com](https://vercel.com)
- Import project dari GitHub
- Set environment variables di Vercel dashboard

3. **Configure Supabase**
- Tambahkan domain Vercel ke Supabase Auth settings
- Update redirect URLs

### Environment Variables untuk Production

\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000
\`\`\`

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

\`\`\`bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run seed         # Seed database
\`\`\`

### Database Operations

\`\`\`bash
npx prisma studio    # Open Prisma Studio
npx prisma generate  # Generate Prisma client
npx prisma db push   # Push schema changes
npx prisma db pull   # Pull schema from database
\`\`\`

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Pastikan DATABASE_URL benar
   - Check Supabase connection

2. **Authentication Error**
   - Verify Supabase keys
   - Check redirect URLs

3. **Build Error**
   - Run `npm run build` locally
   - Check TypeScript errors

## 📞 Support

Untuk bantuan teknis atau pertanyaan:
- Email: support@nuurushsholaah.com
- GitHub Issues: [Create Issue](repository-url/issues)

## 📄 License

Copyright © 2024 Pesantren Nuurush Sholaah. All rights reserved.

---

**Dibuat dengan ❤️ untuk Pesantren Nuurush Sholaah**
\`\`\`

```json file="" isHidden
