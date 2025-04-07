-- AlterTable
ALTER TABLE "scb_test_attempts" ADD COLUMN     "cancelled_at" TIMESTAMP(3),
ADD COLUMN     "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "completed_at" DROP NOT NULL;
