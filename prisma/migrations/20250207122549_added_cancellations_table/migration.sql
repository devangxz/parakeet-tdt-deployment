-- CreateTable
CREATE TABLE "scb_cancellations" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "file_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "comment" TEXT,

    CONSTRAINT "scb_cancellations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scb_cancellations_userId_idx" ON "scb_cancellations"("userId");

-- CreateIndex
CREATE INDEX "scb_cancellations_file_id_idx" ON "scb_cancellations"("file_id");
