-- CreateTable
CREATE TABLE "scb_youtube_files" (
    "id" SERIAL NOT NULL,
    "file_id" TEXT NOT NULL,
    "youtube_url" TEXT NOT NULL,
    "is_imported" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scb_youtube_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scb_youtube_files_file_id_key" ON "scb_youtube_files"("file_id");

-- CreateIndex
CREATE INDEX "scb_youtube_files_file_id_idx" ON "scb_youtube_files"("file_id");
