-- CreateTable
CREATE TABLE "scb_qc_validation_stats" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "file_id" TEXT NOT NULL,
    "transcriber_id" INTEGER NOT NULL,
    "played_percentage" INTEGER NOT NULL,
    "wer_percentage" INTEGER NOT NULL,
    "blank_percentage" INTEGER NOT NULL,
    "edit_listen_correlation_percentage" INTEGER NOT NULL,
    "speaker_change_percentage" INTEGER NOT NULL,
    "speaker_macro_f1_score" DOUBLE PRECISION NOT NULL,
    "is_validation_passed" BOOLEAN NOT NULL,
    "is_accepted_by_om" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scb_qc_validation_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scb_qc_validation_stats_order_id_idx" ON "scb_qc_validation_stats"("order_id");

-- CreateIndex
CREATE INDEX "scb_qc_validation_stats_file_id_idx" ON "scb_qc_validation_stats"("file_id");

-- CreateIndex
CREATE INDEX "scb_qc_validation_stats_transcriber_id_idx" ON "scb_qc_validation_stats"("transcriber_id");

-- AddForeignKey
ALTER TABLE "scb_qc_validation_stats" ADD CONSTRAINT "scb_qc_validation_stats_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "scb_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scb_qc_validation_stats" ADD CONSTRAINT "scb_qc_validation_stats_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "scb_files"("file_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scb_qc_validation_stats" ADD CONSTRAINT "scb_qc_validation_stats_transcriber_id_fkey" FOREIGN KEY ("transcriber_id") REFERENCES "scb_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
