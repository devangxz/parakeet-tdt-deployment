-- CreateEnum
CREATE TYPE "CancellationStatus" AS ENUM ('QC', 'REVIEW', 'FINALIZE');

-- AlterTable
ALTER TABLE "scb_cancellations" ADD COLUMN     "status" "CancellationStatus" NOT NULL DEFAULT 'QC';
