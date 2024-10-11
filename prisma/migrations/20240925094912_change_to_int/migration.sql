/*
  Warnings:

  - You are about to alter the column `duration` on the `scb_files` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.

*/
-- AlterTable
ALTER TABLE "scb_files" ALTER COLUMN "duration" SET DATA TYPE INTEGER;
