-- CreateTable
CREATE TABLE "scb_process_with_llm_stats" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "file_id" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "saved_time" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scb_process_with_llm_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scb_process_with_llm_stats_user_id_idx" ON "scb_process_with_llm_stats"("user_id");

-- CreateIndex
CREATE INDEX "scb_process_with_llm_stats_file_id_idx" ON "scb_process_with_llm_stats"("file_id");

-- AddForeignKey
ALTER TABLE "scb_process_with_llm_stats" ADD CONSTRAINT "scb_process_with_llm_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scb_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scb_process_with_llm_stats" ADD CONSTRAINT "scb_process_with_llm_stats_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "scb_files"("file_id") ON DELETE RESTRICT ON UPDATE CASCADE;
