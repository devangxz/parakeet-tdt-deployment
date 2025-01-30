-- CreateTable
CREATE TABLE "scb_play_stats" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "file_id" TEXT NOT NULL,
    "listen_count" JSONB NOT NULL,
    "edited_segments" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scb_play_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scb_play_stats_user_id_idx" ON "scb_play_stats"("user_id");

-- CreateIndex
CREATE INDEX "scb_play_stats_file_id_idx" ON "scb_play_stats"("file_id");

-- CreateIndex
CREATE UNIQUE INDEX "scb_play_stats_user_id_file_id_key" ON "scb_play_stats"("user_id", "file_id");

-- AddForeignKey
ALTER TABLE "scb_play_stats" ADD CONSTRAINT "scb_play_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scb_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scb_play_stats" ADD CONSTRAINT "scb_play_stats_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "scb_files"("file_id") ON DELETE RESTRICT ON UPDATE CASCADE;
