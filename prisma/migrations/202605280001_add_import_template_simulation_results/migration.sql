ALTER TABLE "import_template_job"
ADD COLUMN "is_simulasi" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "import_template_simulation_result" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "kategori" VARCHAR(50) NOT NULL,
    "kunci" VARCHAR(255) NOT NULL,
    "payload" JSONB NOT NULL,
    "dibuat_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diperbarui_pada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_template_simulation_result_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "import_template_simulation_result_job_id_kategori_kunci_key"
ON "import_template_simulation_result"("job_id", "kategori", "kunci");

CREATE INDEX "import_template_simulation_result_job_id_kategori_idx"
ON "import_template_simulation_result"("job_id", "kategori");

ALTER TABLE "import_template_simulation_result"
ADD CONSTRAINT "import_template_simulation_result_job_id_fkey"
FOREIGN KEY ("job_id") REFERENCES "import_template_job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
