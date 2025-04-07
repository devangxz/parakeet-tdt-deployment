-- CreateEnum
CREATE TYPE "TestStatus" AS ENUM ('ACCEPTED', 'COMPLETED', 'CANCELLED', 'SUBMITTED_FOR_APPROVAL');

-- AlterTable
ALTER TABLE "scb_test_attempts" ADD COLUMN     "status" "TestStatus" NOT NULL DEFAULT 'ACCEPTED';
