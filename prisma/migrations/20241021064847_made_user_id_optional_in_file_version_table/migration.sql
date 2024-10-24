-- DropForeignKey
ALTER TABLE "scb_file_versions" DROP CONSTRAINT "scb_file_versions_user_id_fkey";

-- AlterTable
ALTER TABLE "scb_file_versions" ALTER COLUMN "user_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "scb_file_versions" ADD CONSTRAINT "scb_file_versions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scb_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
