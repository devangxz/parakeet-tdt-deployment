-- CreateTable
CREATE TABLE "scb_asr_process_stats" (
    "id" SERIAL NOT NULL,
    "file_id" TEXT NOT NULL,
    "order_id" INTEGER NOT NULL,
    "assembly_ai_start_time" TIMESTAMP(3) NOT NULL,
    "assembly_ai_end_time" TIMESTAMP(3) NOT NULL,
    "assembly_ai_time_taken" INTEGER NOT NULL DEFAULT 0,
    "chunking_start_time" TIMESTAMP(3),
    "chunking_end_time" TIMESTAMP(3),
    "chunking_time_taken" INTEGER DEFAULT 0,
    "gpt4o_transcribe_start_time" TIMESTAMP(3),
    "gpt4o_transcribe_end_time" TIMESTAMP(3),
    "gpt4o_transcribe_time_taken" INTEGER DEFAULT 0,
    "total_asr_time_taken" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scb_asr_process_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scb_asr_process_stats_file_id_idx" ON "scb_asr_process_stats"("file_id");

-- CreateIndex
CREATE INDEX "scb_asr_process_stats_order_id_idx" ON "scb_asr_process_stats"("order_id");

-- AddForeignKey
ALTER TABLE "scb_asr_process_stats" ADD CONSTRAINT "scb_asr_process_stats_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "scb_files"("file_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scb_asr_process_stats" ADD CONSTRAINT "scb_asr_process_stats_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "scb_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
