-- AlterTable
ALTER TABLE "scb_review_with_gemini_stats" ALTER COLUMN "start_time" DROP NOT NULL,
ALTER COLUMN "end_time" DROP NOT NULL,
ALTER COLUMN "saved_time" DROP NOT NULL,
ALTER COLUMN "created_at" DROP NOT NULL,
ALTER COLUMN "duration" DROP NOT NULL;
