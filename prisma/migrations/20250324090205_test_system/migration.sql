/*
  Warnings:

  - You are about to drop the column `cancelled_at` on the `scb_test_attempts` table. All the data in the column will be lost.
  - You are about to drop the column `started_at` on the `scb_test_attempts` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `scb_test_attempts` table. All the data in the column will be lost.
  - You are about to drop the column `test_file_id` on the `scb_test_attempts` table. All the data in the column will be lost.
  - You are about to drop the `scb_test_files` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
ALTER TYPE "JobType" ADD VALUE 'TEST';

-- DropForeignKey
ALTER TABLE "scb_test_attempts" DROP CONSTRAINT "scb_test_attempts_test_file_id_fkey";

-- DropIndex
DROP INDEX "scb_test_attempts_test_file_id_idx";

-- AlterTable
ALTER TABLE "scb_files" ADD COLUMN     "is_test_file" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "scb_orders" ADD COLUMN     "is_test_order" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "scb_test_attempts" DROP COLUMN "cancelled_at",
DROP COLUMN "started_at",
DROP COLUMN "status",
DROP COLUMN "test_file_id",
ADD COLUMN     "score" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "passed" SET DEFAULT false;

-- DropTable
DROP TABLE "scb_test_files";

-- DropEnum
DROP TYPE "TestAttemptStatus";
