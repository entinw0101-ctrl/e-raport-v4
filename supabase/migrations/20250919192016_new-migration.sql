-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."Status" AS ENUM ('aktif', 'nonaktif');

-- CreateEnum
CREATE TYPE "public"."Semester" AS ENUM ('1', '2');

-- CreateEnum
CREATE TYPE "public"."JenisKelamin" AS ENUM ('Laki-laki', 'Perempuan');

-- CreateEnum
CREATE TYPE "public"."StatusGuru" AS ENUM ('aktif', 'nonaktif');

-- CreateEnum
CREATE TYPE "public"."StatusSiswa" AS ENUM ('Aktif', 'Lulus', 'Keluar', 'Pindah');

-- CreateEnum
CREATE TYPE "public"."JenisMapel" AS ENUM ('Ujian', 'Hafalan');

-- CreateEnum
CREATE TYPE "public"."PredikatHafalan" AS ENUM ('Tercapai', 'Tidak Tercapai');

-- CreateEnum
CREATE TYPE "public"."JenisSikap" AS ENUM ('Spiritual', 'Sosial');

-- CreateEnum
CREATE TYPE "public"."JenisKelaminTarget" AS ENUM ('Laki-laki', 'Perempuan', 'Semua');

-- CreateEnum
CREATE TYPE "public"."StatusPejabat" AS ENUM ('aktif', 'nonaktif');

-- CreateTable
CREATE TABLE "public"."master_tahun_ajaran" (
    "id" SERIAL NOT NULL,
    "nama_ajaran" VARCHAR(255) NOT NULL,
    "status" "public"."Status" NOT NULL DEFAULT 'nonaktif',
    "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diperbarui_pada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_tahun_ajaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."periode_ajaran" (
    "id" SERIAL NOT NULL,
    "nama_ajaran" VARCHAR(255) NOT NULL,
    "semester" "public"."Semester" NOT NULL,
    "master_tahun_ajaran_id" INTEGER,
    "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diperbarui_pada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "periode_ajaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tingkatan" (
    "id" SERIAL NOT NULL,
    "nama_tingkatan" VARCHAR(255) NOT NULL,
    "urutan" INTEGER,
    "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diperbarui_pada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tingkatan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."guru" (
    "id" SERIAL NOT NULL,
    "nama" VARCHAR(255),
    "nip" VARCHAR(255),
    "jenis_kelamin" "public"."JenisKelamin",
    "tempat_lahir" VARCHAR(255),
    "tanggal_lahir" TIMESTAMP(3),
    "telepon" VARCHAR(255),
    "alamat" TEXT,
    "status" "public"."StatusGuru",
    "tanda_tangan" VARCHAR(255),
    "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diperbarui_pada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guru_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."kamar" (
    "id" SERIAL NOT NULL,
    "nama_kamar" VARCHAR(255),
    "kapasitas" INTEGER,
    "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diperbarui_pada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kamar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."kelas" (
    "id" SERIAL NOT NULL,
    "nama_kelas" VARCHAR(255),
    "kapasitas" INTEGER,
    "wali_kelas_id" INTEGER,
    "next_kelas_id" INTEGER,
    "tingkatan_id" INTEGER,
    "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diperbarui_pada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kelas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."siswa" (
    "id" SERIAL NOT NULL,
    "nama" VARCHAR(255),
    "nis" VARCHAR(255) NOT NULL,
    "tempat_lahir" VARCHAR(255),
    "tanggal_lahir" TIMESTAMP(3),
    "jenis_kelamin" "public"."JenisKelamin",
    "agama" VARCHAR(255),
    "alamat" TEXT,
    "kelas_id" INTEGER,
    "kamar_id" INTEGER,
    "kota_asal" VARCHAR(255),
    "nama_ayah" VARCHAR(255),
    "pekerjaan_ayah" VARCHAR(255),
    "alamat_ayah" TEXT,
    "nama_ibu" VARCHAR(255),
    "pekerjaan_ibu" VARCHAR(255),
    "alamat_ibu" TEXT,
    "nama_wali" VARCHAR(255),
    "pekerjaan_wali" VARCHAR(255),
    "alamat_wali" TEXT,
    "master_tahun_ajaran_id" INTEGER,
    "status" "public"."StatusSiswa" NOT NULL DEFAULT 'Aktif',
    "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diperbarui_pada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "siswa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."mata_pelajaran" (
    "id" SERIAL NOT NULL,
    "nama_mapel" VARCHAR(100) NOT NULL,
    "jenis" "public"."JenisMapel" NOT NULL,
    "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diperbarui_pada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mata_pelajaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."kitab" (
    "id" SERIAL NOT NULL,
    "nama_kitab" VARCHAR(255),
    "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diperbarui_pada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kitab_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."kurikulum" (
    "id" SERIAL NOT NULL,
    "mapel_id" INTEGER,
    "kitab_id" INTEGER,
    "batas_hafalan" VARCHAR(255),
    "tingkatan_id" INTEGER NOT NULL,
    "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diperbarui_pada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kurikulum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."nilai_ujian" (
    "id" SERIAL NOT NULL,
    "siswa_id" INTEGER NOT NULL,
    "mapel_id" INTEGER NOT NULL,
    "periode_ajaran_id" INTEGER NOT NULL,
    "nilai_angka" DECIMAL(5,2) NOT NULL,
    "predikat" VARCHAR(50),
    "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diperbarui_pada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nilai_ujian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."nilai_hafalan" (
    "id" SERIAL NOT NULL,
    "siswa_id" INTEGER NOT NULL,
    "mapel_id" INTEGER NOT NULL,
    "periode_ajaran_id" INTEGER NOT NULL,
    "target_hafalan" TEXT,
    "predikat" "public"."PredikatHafalan" NOT NULL,
    "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diperbarui_pada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nilai_hafalan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."kehadiran" (
    "id" SERIAL NOT NULL,
    "siswa_id" INTEGER NOT NULL,
    "periode_ajaran_id" INTEGER NOT NULL,
    "sakit" INTEGER NOT NULL DEFAULT 0,
    "izin" INTEGER NOT NULL DEFAULT 0,
    "alpha" INTEGER NOT NULL DEFAULT 0,
    "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diperbarui_pada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kehadiran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."indikator_sikap" (
    "id" SERIAL NOT NULL,
    "jenis_sikap" "public"."JenisSikap",
    "indikator" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diperbarui_pada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "indikator_sikap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."penilaian_sikap" (
    "id" SERIAL NOT NULL,
    "siswa_id" INTEGER NOT NULL,
    "indikator_id" INTEGER NOT NULL,
    "periode_ajaran_id" INTEGER NOT NULL,
    "nilai" SMALLINT NOT NULL,
    "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diperbarui_pada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "penilaian_sikap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ringkasan_rapot" (
    "id" SERIAL NOT NULL,
    "siswa_id" INTEGER NOT NULL,
    "periode_ajaran_id" INTEGER NOT NULL,
    "total_sakit" INTEGER,
    "total_izin" INTEGER,
    "total_alpha" INTEGER,
    "catatan_akademik" TEXT,
    "rata_rata_spiritual" DECIMAL(3,2),
    "rata_rata_sosial" DECIMAL(3,2),
    "predikat_akhir_sikap" VARCHAR(50),
    "catatan_sikap" TEXT,
    "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diperbarui_pada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ringkasan_rapot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."penanggung_jawab_rapot" (
    "id" SERIAL NOT NULL,
    "jabatan" VARCHAR(100) NOT NULL,
    "nama_pejabat" VARCHAR(255) NOT NULL,
    "nip" VARCHAR(50),
    "tanda_tangan" VARCHAR(255),
    "jenis_kelamin_target" "public"."JenisKelaminTarget" NOT NULL,
    "status" "public"."StatusPejabat" NOT NULL DEFAULT 'aktif',
    "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diperbarui_pada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "penanggung_jawab_rapot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."riwayat_kelas_siswa" (
    "id" SERIAL NOT NULL,
    "siswa_id" INTEGER,
    "kelas_id" INTEGER,
    "master_tahun_ajaran_id" INTEGER,
    "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "riwayat_kelas_siswa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."kelas_periode" (
    "id" SERIAL NOT NULL,
    "kelas_id" INTEGER NOT NULL,
    "periode_ajaran_id" INTEGER NOT NULL,
    "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diperbarui_pada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kelas_periode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."log_promosi" (
    "id" SERIAL NOT NULL,
    "tahun_ajaran_dari_id" INTEGER,
    "tahun_ajaran_ke_id" INTEGER,
    "kelas_dari_id" INTEGER,
    "kelas_ke_id" INTEGER,
    "dieksekusi_oleh" INTEGER,
    "catatan" TEXT,
    "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "log_promosi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."surat_keluar" (
    "id" SERIAL NOT NULL,
    "nomor_surat" VARCHAR(255) NOT NULL,
    "siswa_id" INTEGER,
    "tanggal_surat" TIMESTAMP(3),
    "perihal" TEXT,
    "isi_surat" TEXT,
    "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diperbarui_pada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "surat_keluar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "master_tahun_ajaran_nama_ajaran_key" ON "public"."master_tahun_ajaran"("nama_ajaran");

-- CreateIndex
CREATE INDEX "master_tahun_ajaran_status_idx" ON "public"."master_tahun_ajaran"("status");

-- CreateIndex
CREATE INDEX "master_tahun_ajaran_nama_ajaran_idx" ON "public"."master_tahun_ajaran"("nama_ajaran");

-- CreateIndex
CREATE INDEX "periode_ajaran_semester_idx" ON "public"."periode_ajaran"("semester");

-- CreateIndex
CREATE INDEX "periode_ajaran_master_tahun_ajaran_id_idx" ON "public"."periode_ajaran"("master_tahun_ajaran_id");

-- CreateIndex
CREATE UNIQUE INDEX "periode_ajaran_nama_ajaran_semester_key" ON "public"."periode_ajaran"("nama_ajaran", "semester");

-- CreateIndex
CREATE INDEX "tingkatan_urutan_idx" ON "public"."tingkatan"("urutan");

-- CreateIndex
CREATE INDEX "guru_status_idx" ON "public"."guru"("status");

-- CreateIndex
CREATE INDEX "guru_nip_idx" ON "public"."guru"("nip");

-- CreateIndex
CREATE INDEX "guru_jenis_kelamin_idx" ON "public"."guru"("jenis_kelamin");

-- CreateIndex
CREATE INDEX "kamar_nama_kamar_idx" ON "public"."kamar"("nama_kamar");

-- CreateIndex
CREATE INDEX "kelas_nama_kelas_idx" ON "public"."kelas"("nama_kelas");

-- CreateIndex
CREATE INDEX "kelas_wali_kelas_id_idx" ON "public"."kelas"("wali_kelas_id");

-- CreateIndex
CREATE INDEX "kelas_tingkatan_id_idx" ON "public"."kelas"("tingkatan_id");

-- CreateIndex
CREATE UNIQUE INDEX "siswa_nis_key" ON "public"."siswa"("nis");

-- CreateIndex
CREATE INDEX "siswa_nis_idx" ON "public"."siswa"("nis");

-- CreateIndex
CREATE INDEX "siswa_nama_idx" ON "public"."siswa"("nama");

-- CreateIndex
CREATE INDEX "siswa_jenis_kelamin_idx" ON "public"."siswa"("jenis_kelamin");

-- CreateIndex
CREATE INDEX "siswa_status_idx" ON "public"."siswa"("status");

-- CreateIndex
CREATE INDEX "siswa_kelas_id_idx" ON "public"."siswa"("kelas_id");

-- CreateIndex
CREATE INDEX "mata_pelajaran_jenis_idx" ON "public"."mata_pelajaran"("jenis");

-- CreateIndex
CREATE INDEX "mata_pelajaran_nama_mapel_idx" ON "public"."mata_pelajaran"("nama_mapel");

-- CreateIndex
CREATE INDEX "kitab_nama_kitab_idx" ON "public"."kitab"("nama_kitab");

-- CreateIndex
CREATE INDEX "kurikulum_mapel_id_idx" ON "public"."kurikulum"("mapel_id");

-- CreateIndex
CREATE INDEX "kurikulum_tingkatan_id_idx" ON "public"."kurikulum"("tingkatan_id");

-- CreateIndex
CREATE INDEX "nilai_ujian_siswa_id_idx" ON "public"."nilai_ujian"("siswa_id");

-- CreateIndex
CREATE INDEX "nilai_ujian_mapel_id_idx" ON "public"."nilai_ujian"("mapel_id");

-- CreateIndex
CREATE INDEX "nilai_ujian_periode_ajaran_id_idx" ON "public"."nilai_ujian"("periode_ajaran_id");

-- CreateIndex
CREATE INDEX "nilai_ujian_siswa_id_periode_ajaran_id_idx" ON "public"."nilai_ujian"("siswa_id", "periode_ajaran_id");

-- CreateIndex
CREATE UNIQUE INDEX "nilai_ujian_siswa_id_mapel_id_periode_ajaran_id_key" ON "public"."nilai_ujian"("siswa_id", "mapel_id", "periode_ajaran_id");

-- CreateIndex
CREATE INDEX "nilai_hafalan_siswa_id_idx" ON "public"."nilai_hafalan"("siswa_id");

-- CreateIndex
CREATE INDEX "nilai_hafalan_mapel_id_idx" ON "public"."nilai_hafalan"("mapel_id");

-- CreateIndex
CREATE INDEX "nilai_hafalan_periode_ajaran_id_idx" ON "public"."nilai_hafalan"("periode_ajaran_id");

-- CreateIndex
CREATE INDEX "nilai_hafalan_siswa_id_periode_ajaran_id_idx" ON "public"."nilai_hafalan"("siswa_id", "periode_ajaran_id");

-- CreateIndex
CREATE UNIQUE INDEX "nilai_hafalan_siswa_id_mapel_id_periode_ajaran_id_key" ON "public"."nilai_hafalan"("siswa_id", "mapel_id", "periode_ajaran_id");

-- CreateIndex
CREATE INDEX "kehadiran_siswa_id_idx" ON "public"."kehadiran"("siswa_id");

-- CreateIndex
CREATE INDEX "kehadiran_periode_ajaran_id_idx" ON "public"."kehadiran"("periode_ajaran_id");

-- CreateIndex
CREATE INDEX "kehadiran_siswa_id_periode_ajaran_id_idx" ON "public"."kehadiran"("siswa_id", "periode_ajaran_id");

-- CreateIndex
CREATE UNIQUE INDEX "kehadiran_siswa_id_periode_ajaran_id_key" ON "public"."kehadiran"("siswa_id", "periode_ajaran_id");

-- CreateIndex
CREATE INDEX "indikator_sikap_jenis_sikap_idx" ON "public"."indikator_sikap"("jenis_sikap");

-- CreateIndex
CREATE INDEX "indikator_sikap_is_active_idx" ON "public"."indikator_sikap"("is_active");

-- CreateIndex
CREATE INDEX "penilaian_sikap_siswa_id_idx" ON "public"."penilaian_sikap"("siswa_id");

-- CreateIndex
CREATE INDEX "penilaian_sikap_indikator_id_idx" ON "public"."penilaian_sikap"("indikator_id");

-- CreateIndex
CREATE INDEX "penilaian_sikap_periode_ajaran_id_idx" ON "public"."penilaian_sikap"("periode_ajaran_id");

-- CreateIndex
CREATE INDEX "penilaian_sikap_siswa_id_periode_ajaran_id_idx" ON "public"."penilaian_sikap"("siswa_id", "periode_ajaran_id");

-- CreateIndex
CREATE UNIQUE INDEX "penilaian_sikap_siswa_id_indikator_id_periode_ajaran_id_key" ON "public"."penilaian_sikap"("siswa_id", "indikator_id", "periode_ajaran_id");

-- CreateIndex
CREATE INDEX "ringkasan_rapot_siswa_id_idx" ON "public"."ringkasan_rapot"("siswa_id");

-- CreateIndex
CREATE INDEX "ringkasan_rapot_periode_ajaran_id_idx" ON "public"."ringkasan_rapot"("periode_ajaran_id");

-- CreateIndex
CREATE INDEX "ringkasan_rapot_siswa_id_periode_ajaran_id_idx" ON "public"."ringkasan_rapot"("siswa_id", "periode_ajaran_id");

-- CreateIndex
CREATE UNIQUE INDEX "ringkasan_rapot_siswa_id_periode_ajaran_id_key" ON "public"."ringkasan_rapot"("siswa_id", "periode_ajaran_id");

-- CreateIndex
CREATE INDEX "penanggung_jawab_rapot_jabatan_idx" ON "public"."penanggung_jawab_rapot"("jabatan");

-- CreateIndex
CREATE INDEX "penanggung_jawab_rapot_jenis_kelamin_target_idx" ON "public"."penanggung_jawab_rapot"("jenis_kelamin_target");

-- CreateIndex
CREATE INDEX "penanggung_jawab_rapot_status_idx" ON "public"."penanggung_jawab_rapot"("status");

-- CreateIndex
CREATE INDEX "riwayat_kelas_siswa_siswa_id_idx" ON "public"."riwayat_kelas_siswa"("siswa_id");

-- CreateIndex
CREATE INDEX "riwayat_kelas_siswa_kelas_id_idx" ON "public"."riwayat_kelas_siswa"("kelas_id");

-- CreateIndex
CREATE INDEX "riwayat_kelas_siswa_master_tahun_ajaran_id_idx" ON "public"."riwayat_kelas_siswa"("master_tahun_ajaran_id");

-- CreateIndex
CREATE INDEX "kelas_periode_kelas_id_idx" ON "public"."kelas_periode"("kelas_id");

-- CreateIndex
CREATE INDEX "kelas_periode_periode_ajaran_id_idx" ON "public"."kelas_periode"("periode_ajaran_id");

-- CreateIndex
CREATE UNIQUE INDEX "kelas_periode_kelas_id_periode_ajaran_id_key" ON "public"."kelas_periode"("kelas_id", "periode_ajaran_id");

-- CreateIndex
CREATE INDEX "log_promosi_tahun_ajaran_dari_id_idx" ON "public"."log_promosi"("tahun_ajaran_dari_id");

-- CreateIndex
CREATE INDEX "log_promosi_tahun_ajaran_ke_id_idx" ON "public"."log_promosi"("tahun_ajaran_ke_id");

-- CreateIndex
CREATE UNIQUE INDEX "surat_keluar_nomor_surat_key" ON "public"."surat_keluar"("nomor_surat");

-- CreateIndex
CREATE INDEX "surat_keluar_nomor_surat_idx" ON "public"."surat_keluar"("nomor_surat");

-- CreateIndex
CREATE INDEX "surat_keluar_siswa_id_idx" ON "public"."surat_keluar"("siswa_id");

-- CreateIndex
CREATE INDEX "surat_keluar_tanggal_surat_idx" ON "public"."surat_keluar"("tanggal_surat");

-- AddForeignKey
ALTER TABLE "public"."periode_ajaran" ADD CONSTRAINT "periode_ajaran_master_tahun_ajaran_id_fkey" FOREIGN KEY ("master_tahun_ajaran_id") REFERENCES "public"."master_tahun_ajaran"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."kelas" ADD CONSTRAINT "kelas_wali_kelas_id_fkey" FOREIGN KEY ("wali_kelas_id") REFERENCES "public"."guru"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."kelas" ADD CONSTRAINT "kelas_next_kelas_id_fkey" FOREIGN KEY ("next_kelas_id") REFERENCES "public"."kelas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."kelas" ADD CONSTRAINT "kelas_tingkatan_id_fkey" FOREIGN KEY ("tingkatan_id") REFERENCES "public"."tingkatan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."siswa" ADD CONSTRAINT "siswa_kelas_id_fkey" FOREIGN KEY ("kelas_id") REFERENCES "public"."kelas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."siswa" ADD CONSTRAINT "siswa_kamar_id_fkey" FOREIGN KEY ("kamar_id") REFERENCES "public"."kamar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."siswa" ADD CONSTRAINT "siswa_master_tahun_ajaran_id_fkey" FOREIGN KEY ("master_tahun_ajaran_id") REFERENCES "public"."master_tahun_ajaran"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."kurikulum" ADD CONSTRAINT "kurikulum_mapel_id_fkey" FOREIGN KEY ("mapel_id") REFERENCES "public"."mata_pelajaran"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."kurikulum" ADD CONSTRAINT "kurikulum_kitab_id_fkey" FOREIGN KEY ("kitab_id") REFERENCES "public"."kitab"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."kurikulum" ADD CONSTRAINT "kurikulum_tingkatan_id_fkey" FOREIGN KEY ("tingkatan_id") REFERENCES "public"."tingkatan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."nilai_ujian" ADD CONSTRAINT "nilai_ujian_siswa_id_fkey" FOREIGN KEY ("siswa_id") REFERENCES "public"."siswa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."nilai_ujian" ADD CONSTRAINT "nilai_ujian_mapel_id_fkey" FOREIGN KEY ("mapel_id") REFERENCES "public"."mata_pelajaran"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."nilai_ujian" ADD CONSTRAINT "nilai_ujian_periode_ajaran_id_fkey" FOREIGN KEY ("periode_ajaran_id") REFERENCES "public"."periode_ajaran"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."nilai_hafalan" ADD CONSTRAINT "nilai_hafalan_siswa_id_fkey" FOREIGN KEY ("siswa_id") REFERENCES "public"."siswa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."nilai_hafalan" ADD CONSTRAINT "nilai_hafalan_mapel_id_fkey" FOREIGN KEY ("mapel_id") REFERENCES "public"."mata_pelajaran"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."nilai_hafalan" ADD CONSTRAINT "nilai_hafalan_periode_ajaran_id_fkey" FOREIGN KEY ("periode_ajaran_id") REFERENCES "public"."periode_ajaran"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."kehadiran" ADD CONSTRAINT "kehadiran_siswa_id_fkey" FOREIGN KEY ("siswa_id") REFERENCES "public"."siswa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."kehadiran" ADD CONSTRAINT "kehadiran_periode_ajaran_id_fkey" FOREIGN KEY ("periode_ajaran_id") REFERENCES "public"."periode_ajaran"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."penilaian_sikap" ADD CONSTRAINT "penilaian_sikap_siswa_id_fkey" FOREIGN KEY ("siswa_id") REFERENCES "public"."siswa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."penilaian_sikap" ADD CONSTRAINT "penilaian_sikap_indikator_id_fkey" FOREIGN KEY ("indikator_id") REFERENCES "public"."indikator_sikap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."penilaian_sikap" ADD CONSTRAINT "penilaian_sikap_periode_ajaran_id_fkey" FOREIGN KEY ("periode_ajaran_id") REFERENCES "public"."periode_ajaran"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ringkasan_rapot" ADD CONSTRAINT "ringkasan_rapot_siswa_id_fkey" FOREIGN KEY ("siswa_id") REFERENCES "public"."siswa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ringkasan_rapot" ADD CONSTRAINT "ringkasan_rapot_periode_ajaran_id_fkey" FOREIGN KEY ("periode_ajaran_id") REFERENCES "public"."periode_ajaran"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."riwayat_kelas_siswa" ADD CONSTRAINT "riwayat_kelas_siswa_siswa_id_fkey" FOREIGN KEY ("siswa_id") REFERENCES "public"."siswa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."riwayat_kelas_siswa" ADD CONSTRAINT "riwayat_kelas_siswa_kelas_id_fkey" FOREIGN KEY ("kelas_id") REFERENCES "public"."kelas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."riwayat_kelas_siswa" ADD CONSTRAINT "riwayat_kelas_siswa_master_tahun_ajaran_id_fkey" FOREIGN KEY ("master_tahun_ajaran_id") REFERENCES "public"."master_tahun_ajaran"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."kelas_periode" ADD CONSTRAINT "kelas_periode_kelas_id_fkey" FOREIGN KEY ("kelas_id") REFERENCES "public"."kelas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."kelas_periode" ADD CONSTRAINT "kelas_periode_periode_ajaran_id_fkey" FOREIGN KEY ("periode_ajaran_id") REFERENCES "public"."periode_ajaran"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."log_promosi" ADD CONSTRAINT "log_promosi_tahun_ajaran_dari_id_fkey" FOREIGN KEY ("tahun_ajaran_dari_id") REFERENCES "public"."periode_ajaran"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."log_promosi" ADD CONSTRAINT "log_promosi_tahun_ajaran_ke_id_fkey" FOREIGN KEY ("tahun_ajaran_ke_id") REFERENCES "public"."periode_ajaran"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."log_promosi" ADD CONSTRAINT "log_promosi_kelas_dari_id_fkey" FOREIGN KEY ("kelas_dari_id") REFERENCES "public"."kelas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."log_promosi" ADD CONSTRAINT "log_promosi_kelas_ke_id_fkey" FOREIGN KEY ("kelas_ke_id") REFERENCES "public"."kelas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."surat_keluar" ADD CONSTRAINT "surat_keluar_siswa_id_fkey" FOREIGN KEY ("siswa_id") REFERENCES "public"."siswa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

