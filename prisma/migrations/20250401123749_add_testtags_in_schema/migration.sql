-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "FileTag" ADD VALUE 'TEST_MASTER';
ALTER TYPE "FileTag" ADD VALUE 'TEST_MODIFIED';
ALTER TYPE "FileTag" ADD VALUE 'TEST_EDIT';
ALTER TYPE "FileTag" ADD VALUE 'TEST_SUBMITTED';
