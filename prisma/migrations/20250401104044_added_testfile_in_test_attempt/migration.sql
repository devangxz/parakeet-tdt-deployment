-- AlterTable
ALTER TABLE "scb_test_attempts" ADD COLUMN     "testFileId" INTEGER;

-- CreateTable
CREATE TABLE "scb_test_files" (
    "id" SERIAL NOT NULL,
    "filename" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "instructions" TEXT,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scb_test_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scb_test_files_file_id_idx" ON "scb_test_files"("file_id");

-- CreateIndex
CREATE INDEX "scb_test_files_created_by_idx" ON "scb_test_files"("created_by");

-- AddForeignKey
ALTER TABLE "scb_test_attempts" ADD CONSTRAINT "scb_test_attempts_testFileId_fkey" FOREIGN KEY ("testFileId") REFERENCES "scb_test_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
