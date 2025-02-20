-- AlterEnum
ALTER TYPE "OrderType" ADD VALUE 'FORMATTING';

-- AlterTable
ALTER TABLE "scb_user_rates" ADD COLUMN     "default_order_button_label" TEXT DEFAULT 'Format',
ADD COLUMN     "output_format" TEXT DEFAULT 'docx',
ADD COLUMN     "skip_transcription" BOOLEAN NOT NULL DEFAULT false;
