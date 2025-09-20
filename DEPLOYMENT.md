# Deployment Guide - E-RAPOT NUURUSH SHOLAAH (Neon & Stack Auth Edition)

Panduan lengkap untuk deploy aplikasi E-RAPOT ke production menggunakan **Vercel**, database **Neon Postgres**, dan autentikasi **Stack Auth**.

## 🚀 Quick Deploy ke Vercel

### 1\. Persiapan Repository

Jika Anda belum memiliki proyek secara lokal, clone dan siapkan terlebih dahulu.

```bash
# Clone dan setup project
git clone <repository-url>
cd e-rapot-nuurush-sholaah
npm install
```

### 2\. Setup Neon Database

Kita akan menggunakan Neon sebagai provider database Postgres serverless.

1.  **Buat Project Neon**

      * Login ke [neon.tech](https://neon.tech).
      * Klik **"New Project"**.
      * Beri nama project Anda, pilih versi Postgres, dan tentukan region. Klik **"Create Project"**.

2.  **Dapatkan Connection String**

      * Setelah project dibuat, di dashboard Neon Anda akan melihat widget **"Connection Details"**.
      * Pastikan branch yang terpilih adalah `main`.
      * Salin (copy) **Connection String** yang ditampilkan. Formatnya akan terlihat seperti ini: `postgresql://user:password@endpoint.neon.tech/dbname?sslmode=require`.

3.  **Setup Environment Variables Lokal**

      * Salin file `.env.example` menjadi `.env.local`. File ini digunakan untuk pengembangan di mesin lokal Anda.

    <!-- end list -->

    ```bash
    cp .env.example .env.local
    ```

      * Edit file `.env.local` dan masukkan connection string dari Neon. Hapus variabel-variabel Supabase yang lama.

    <!-- end list -->

    ```env
    # .env.local

    # 1. DATABASE (NEON)
    # Ganti dengan connection string dari dashboard Neon Anda
    DATABASE_URL="postgresql://user:password@endpoint.neon.tech/dbname?sslmode=require"

    # 2. STACK AUTH
    NEXT_PUBLIC_STACK_PROJECT_ID='your_stack_project_id'
    NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY='your_stack_publishable_client_key'
    STACK_SECRET_SERVER_KEY='your_stack_secret_server_key'
    ```

4.  **Run Database Migration**

      * Dengan `DATABASE_URL` yang sudah mengarah ke Neon, jalankan migrasi Prisma untuk membuat skema tabel.

    <!-- end list -->

    ```bash
    npx prisma generate
    npx prisma db push
    npm run db:seed
    ```

### 3\. Deploy ke Vercel

1.  **Push ke GitHub**

      * Pastikan semua perubahan sudah disimpan dan di-push ke repository GitHub Anda.

    <!-- end list -->

    ```bash
    git add .
    git commit -m "feat: integrate Neon DB and NextAuth.js"
    git push origin main
    ```

2.  **Import ke Vercel**

      * Login ke [vercel.com](https://vercel.com).
      * Klik **"Add New... \> Project"**.
      * Pilih repository GitHub Anda dan klik **"Import"**.

3.  **Configure Environment Variables di Vercel**

      * Pada halaman konfigurasi project, buka bagian **"Environment Variables"**.
      * Tambahkan semua variabel yang ada di `.env.local` tadi. **PENTING:** Gunakan nilai untuk production.

    <!-- end list -->

    ```env
    # Variabel Lingkungan di Vercel

    # 1. DATABASE
    DATABASE_URL                  # Salin dari Neon (nilai yang sama dengan lokal)

    # 2. STACK AUTH
    NEXT_PUBLIC_STACK_PROJECT_ID          # Project ID dari Stack Auth
    NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY  # Publishable client key dari Stack Auth
    STACK_SECRET_SERVER_KEY               # Secret server key dari Stack Auth

    # 3. LEGACY SUPABASE (untuk kompatibilitas - hapus setelah migrasi ke Stack Auth)
    NEXT_PUBLIC_SUPABASE_URL              # Set ke: 'https://dummy.supabase.co'
    NEXT_PUBLIC_SUPABASE_ANON_KEY         # Set ke: 'dummy_key'
    SUPABASE_SERVICE_ROLE_KEY             # Set ke: 'dummy_key'
    ```

4.  **Deploy**

      * Klik tombol **"Deploy"**.
      * Vercel akan memulai proses build dan deployment. Tunggu hingga selesai.
      * Setelah berhasil, aplikasi Anda akan tersedia di URL yang diberikan Vercel.

### 4\. Post-Deployment Setup

Setelah aplikasi di-deploy, lakukan pengujian untuk memastikan semuanya berfungsi dengan baik.

1.  **Test Production App**

      * Akses aplikasi Anda di URL production.
      * Coba fungsionalitas login menggunakan Stack Auth.
      * Verifikasi bahwa data tersimpan di database Neon Anda.

## 🔧 Advanced Configuration

### Custom Domain

1.  **Add Domain di Vercel**

      * Buka Project Settings \> Domains.
      * Tambahkan custom domain Anda dan ikuti instruksi untuk konfigurasi DNS.

2.  **Update Environment & OAuth Settings**

      * Jika sudah menggunakan custom domain, perbarui variabel `NEXTAUTH_URL` di Vercel ke domain baru Anda (misal: `https://www.rapor-nuurushsholaah.com`).
      * Jangan lupa untuk menambahkan redirect URI baru yang menggunakan custom domain di Google Cloud Console.

## 🔍 Monitoring & Maintenance

### 1\. Vercel Analytics

  * Aktifkan di Project Settings \> Analytics untuk memonitor performa dan penggunaan.

### 2\. Error Monitoring

  * Periksa log di dashboard Vercel pada tab **"Logs"** untuk Realtime-logs atau Serverless Functions.

### 3\. Database Monitoring

  * Gunakan dashboard **Neon** untuk memonitor penggunaan database, query, dan kesehatan project secara umum.

## 🚨 Troubleshooting

### Common Deployment Issues

1.  **Build Errors**

      * Pastikan semua dependencies terinstall dan tidak ada error TypeScript atau linting.

    <!-- end list -->

    ```bash
    # Test build secara lokal sebelum push
    npm run build
    npm run lint
    ```

2.  **Database Connection Issues**

      * Pastikan format `DATABASE_URL` di Vercel sudah benar dan tidak ada karakter yang salah salin.
      * Cek status project di dashboard Neon.
      * Beberapa paket (seperti `pg`) mungkin memerlukan parameter tambahan pada connection string, seperti `?pg-bouncer=true` jika Anda menggunakan pooling.

3.  **Authentication Issues (Stack Auth)**

      * Pastikan semua Stack Auth environment variables sudah diatur dengan benar di Vercel.
      * Periksa Stack Auth dashboard untuk status proyek.
      * Verifikasi bahwa project ID dan keys sesuai dengan yang ada di dashboard Stack Auth.

## 📋 Deployment Checklist

  - [x] Repository setup dan dependencies installed
  - [x] Neon project dibuat dan dikonfigurasi
  - [x] `DATABASE_URL` telah didapatkan dari Neon
  - [x] Skema database berhasil di-push ke Neon menggunakan Prisma
  - [x] Environment variables untuk Neon dan Stack Auth dikonfigurasi di Vercel
  - [x] GitHub repository terhubung ke Vercel
  - [x] Deployment ke production berhasil
  - [x] Custom domain dikonfigurasi (opsional)
  - [x] Sertifikat SSL aktif (otomatis oleh Vercel)
  - [x] Aplikasi telah diuji di lingkungan production
  - [x] Strategi monitoring dan backup diimplementasikan

-----

**Happy Deploying\! 🚀**
