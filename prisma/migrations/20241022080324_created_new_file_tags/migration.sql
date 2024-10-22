/*
  Warnings:

  - The values [REV_EDIT,REV_DELIVERED] on the enum `FileTag` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "FileTag_new" AS ENUM ('AUTO', 'QC_EDIT', 'QC_DELIVERED', 'CUSTOMER_EDIT', 'CUSTOMER_DELIVERED', 'OM_EDIT', 'CF_REV_SUBMITTED', 'CF_FINALIZER_SUBMITTED', 'CF_CUSTOMER_DELIVERED', 'LLM');
ALTER TABLE "scb_file_versions" ALTER COLUMN "tag" DROP DEFAULT;
ALTER TABLE "scb_file_versions" ALTER COLUMN "tag" TYPE "FileTag_new" USING ("tag"::text::"FileTag_new");
ALTER TYPE "FileTag" RENAME TO "FileTag_old";
ALTER TYPE "FileTag_new" RENAME TO "FileTag";
DROP TYPE "FileTag_old";
ALTER TABLE "scb_file_versions" ALTER COLUMN "tag" SET DEFAULT 'AUTO';
COMMIT;
