/*
  Warnings:

  - Added the required column `s3_bucket` to the `scb_misc_jobs_attachments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "scb_misc_jobs_attachments" ADD COLUMN     "s3_bucket" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "scb_misc_jobs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "attachment_count" INTEGER NOT NULL,
    "file_id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "timeout_hour" INTEGER NOT NULL,
    "tr_rate" DOUBLE PRECISION NOT NULL,
    "review_cost" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "scb_misc_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scb_misc_jobs_user_id_idx" ON "scb_misc_jobs"("user_id");

-- CreateIndex
CREATE INDEX "scb_misc_jobs_file_id_idx" ON "scb_misc_jobs"("file_id");

-- CreateIndex
CREATE UNIQUE INDEX "scb_misc_jobs_user_id_file_id_key" ON "scb_misc_jobs"("user_id", "file_id");
