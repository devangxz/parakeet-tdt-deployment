-- AlterTable
ALTER TABLE "scb_user_rates" ADD COLUMN     "qc_high_difficulty_rate" DOUBLE PRECISION NOT NULL DEFAULT 10,
ADD COLUMN     "qc_low_difficulty_rate" DOUBLE PRECISION NOT NULL DEFAULT 6,
ADD COLUMN     "qc_medium_difficulty_rate" DOUBLE PRECISION NOT NULL DEFAULT 8;
