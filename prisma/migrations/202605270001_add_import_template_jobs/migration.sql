-- CreateEnum
CREATE TYPE "ImportJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'PARTIAL_FAILED', 'FAILED');

-- CreateEnum
CREATE TYPE "ImportBatchStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "import_template_job" (
    "id" TEXT NOT NULL,
    "kelas_id" INTEGER NOT NULL,
    "periode_ajaran_id" INTEGER NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "status" "ImportJobStatus" NOT NULL DEFAULT 'PENDING',
    "total_siswa" INTEGER NOT NULL,
    "processed_siswa" INTEGER NOT NULL DEFAULT 0,
    "total_batches" INTEGER NOT NULL,
    "selesai_batches" INTEGER NOT NULL DEFAULT 0,
    "gagal_batches" INTEGER NOT NULL DEFAULT 0,
    "hasil" JSONB,
    "pesan_error" TEXT,
    "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diperbarui_pada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_template_job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_template_batch" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "nomor_batch" INTEGER NOT NULL,
    "status" "ImportBatchStatus" NOT NULL DEFAULT 'PENDING',
    "total_siswa" INTEGER NOT NULL,
    "percobaan" INTEGER NOT NULL DEFAULT 0,
    "payload" JSONB NOT NULL,
    "hasil" JSONB,
    "pesan_error" TEXT,
    "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diperbarui_pada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_template_batch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "import_template_job_status_idx" ON "import_template_job"("status");
CREATE INDEX "import_template_job_kelas_id_idx" ON "import_template_job"("kelas_id");
CREATE INDEX "import_template_job_periode_ajaran_id_idx" ON "import_template_job"("periode_ajaran_id");
CREATE UNIQUE INDEX "import_template_batch_job_id_nomor_batch_key" ON "import_template_batch"("job_id", "nomor_batch");
CREATE INDEX "import_template_batch_job_id_status_idx" ON "import_template_batch"("job_id", "status");

-- AddForeignKey
ALTER TABLE "import_template_job" ADD CONSTRAINT "import_template_job_kelas_id_fkey" FOREIGN KEY ("kelas_id") REFERENCES "kelas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "import_template_job" ADD CONSTRAINT "import_template_job_periode_ajaran_id_fkey" FOREIGN KEY ("periode_ajaran_id") REFERENCES "periode_ajaran"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "import_template_batch" ADD CONSTRAINT "import_template_batch_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "import_template_job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
