-- DropIndex
DROP INDEX "scb_invoices_item_number_idx";

-- AlterTable
ALTER TABLE "scb_verifiers" ADD COLUMN     "general_finalizer_enabled" BOOLEAN DEFAULT false;
