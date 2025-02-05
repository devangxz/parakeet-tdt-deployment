-- AlterTable
ALTER TABLE "scb_user_rates" ADD COLUMN     "cf_review_high_difficulty_rate" DOUBLE PRECISION NOT NULL DEFAULT 10,
ADD COLUMN     "cf_review_low_difficulty_rate" DOUBLE PRECISION NOT NULL DEFAULT 6,
ADD COLUMN     "cf_review_medium_difficulty_rate" DOUBLE PRECISION NOT NULL DEFAULT 8;
