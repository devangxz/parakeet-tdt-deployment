-- AlterTable
ALTER TABLE "scb_verifiers" ADD COLUMN     "acr_review_enabled" BOOLEAN DEFAULT false,
ADD COLUMN     "enabled_customers" TEXT DEFAULT 'REMOTELEGAL';
