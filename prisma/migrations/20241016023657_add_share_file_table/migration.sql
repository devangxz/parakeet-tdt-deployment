-- CreateEnum
CREATE TYPE "SharedFilePermission" AS ENUM ('EDITOR', 'VIEWER');

-- CreateTable
CREATE TABLE "scb_shared_files" (
    "id" SERIAL NOT NULL,
    "file_id" TEXT NOT NULL,
    "from_user_id" INTEGER NOT NULL,
    "to_user_id" INTEGER NOT NULL,
    "permission" "SharedFilePermission" NOT NULL DEFAULT 'VIEWER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scb_shared_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scb_shared_files_from_user_id_idx" ON "scb_shared_files"("from_user_id");

-- CreateIndex
CREATE INDEX "scb_shared_files_to_user_id_idx" ON "scb_shared_files"("to_user_id");

-- CreateIndex
CREATE INDEX "scb_shared_files_file_id_idx" ON "scb_shared_files"("file_id");

-- AddForeignKey
ALTER TABLE "scb_shared_files" ADD CONSTRAINT "scb_shared_files_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "scb_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scb_shared_files" ADD CONSTRAINT "scb_shared_files_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "scb_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scb_shared_files" ADD CONSTRAINT "scb_shared_files_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "scb_files"("file_id") ON DELETE RESTRICT ON UPDATE CASCADE;
