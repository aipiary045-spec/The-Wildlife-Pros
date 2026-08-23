-- AlterTable
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "includedTrips" INTEGER;

-- AlterTable
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "includedTrips" INTEGER;
