/*
  Warnings:

  - You are about to drop the column `testFileId` on the `scb_test_attempts` table. All the data in the column will be lost.
  - You are about to drop the `scb_test_files` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "scb_test_attempts" DROP CONSTRAINT "scb_test_attempts_testFileId_fkey";

-- AlterTable
ALTER TABLE "scb_test_attempts" DROP COLUMN "testFileId";

-- DropTable
DROP TABLE "scb_test_files";
