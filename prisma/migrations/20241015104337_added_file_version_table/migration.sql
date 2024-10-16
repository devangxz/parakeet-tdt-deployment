-- CreateEnum
CREATE TYPE "FileTag" AS ENUM ('AUTO', 'QC_EDIT', 'QC_DELIVERED', 'CUSTOMER_EDIT', 'CUSTOMER_DELIVERED', 'OM_EDIT');

-- CreateTable
CREATE TABLE "scb_file_versions" (
    "id" SERIAL NOT NULL,
    "file_id" TEXT NOT NULL,
    "commit_hash" TEXT NOT NULL,
    "s3_version_id" TEXT,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tag" "FileTag" NOT NULL DEFAULT 'AUTO',

    CONSTRAINT "scb_file_versions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "scb_file_versions" ADD CONSTRAINT "scb_file_versions_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "scb_files"("file_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scb_file_versions" ADD CONSTRAINT "scb_file_versions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scb_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
