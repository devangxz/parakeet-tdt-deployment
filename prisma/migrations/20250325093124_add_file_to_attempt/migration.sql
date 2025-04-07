/*
  Warnings:

  - Added the required column `file_id` to the `scb_test_attempts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "scb_test_attempts" ADD COLUMN     "file_id" TEXT NOT NULL;
