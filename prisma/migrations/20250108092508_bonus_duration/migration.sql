-- CreateEnum
CREATE TYPE "BonusStage" AS ENUM ('QC', 'FINALIZE');

-- AlterTable
ALTER TABLE "scb_bonus" ADD COLUMN     "duration" INTEGER,
ADD COLUMN     "stage" "BonusStage";
