-- Add predikat column to penilaian_sikap table
ALTER TABLE "penilaian_sikap" ADD COLUMN "predikat" VARCHAR(50);

-- Update existing records to have predikat based on nilai
UPDATE "penilaian_sikap"
SET "predikat" = CASE
  WHEN "nilai" = 100 THEN 'Sempurna'
  WHEN "nilai" >= 90 THEN 'Sangat Baik'
  WHEN "nilai" >= 80 THEN 'Baik'
  WHEN "nilai" >= 70 THEN 'Cukup'
  ELSE 'Kurang'
END;

-- Make predikat column NOT NULL after populating data
ALTER TABLE "penilaian_sikap" ALTER COLUMN "predikat" SET NOT NULL;