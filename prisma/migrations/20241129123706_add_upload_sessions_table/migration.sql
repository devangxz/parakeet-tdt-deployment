-- CreateTable
CREATE TABLE "scb_upload_sessions" (
    "id" SERIAL NOT NULL,
    "upload_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "source_info" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scb_upload_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scb_upload_sessions_upload_id_key" ON "scb_upload_sessions"("upload_id");

-- CreateIndex
CREATE INDEX "scb_upload_sessions_user_id_idx" ON "scb_upload_sessions"("user_id");

-- AddForeignKey
ALTER TABLE "scb_upload_sessions" ADD CONSTRAINT "scb_upload_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scb_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
