-- CreateIndex
CREATE INDEX "scb_test_attempts_file_id_idx" ON "scb_test_attempts"("file_id");

-- AddForeignKey
ALTER TABLE "scb_test_attempts" ADD CONSTRAINT "scb_test_attempts_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "scb_files"("file_id") ON DELETE RESTRICT ON UPDATE CASCADE;
