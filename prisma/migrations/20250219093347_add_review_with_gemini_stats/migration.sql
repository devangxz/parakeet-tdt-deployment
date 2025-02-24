-- CreateTable
CREATE TABLE "scb_review_with_gemini_stats" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "file_id" TEXT NOT NULL,
    "options" TEXT[],
    "instructions" TEXT NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "saved_time" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scb_review_with_gemini_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scb_review_with_gemini_stats_user_id_idx" ON "scb_review_with_gemini_stats"("user_id");

-- CreateIndex
CREATE INDEX "scb_review_with_gemini_stats_file_id_idx" ON "scb_review_with_gemini_stats"("file_id");

-- AddForeignKey
ALTER TABLE "scb_review_with_gemini_stats" ADD CONSTRAINT "scb_review_with_gemini_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scb_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scb_review_with_gemini_stats" ADD CONSTRAINT "scb_review_with_gemini_stats_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "scb_files"("file_id") ON DELETE RESTRICT ON UPDATE CASCADE;
