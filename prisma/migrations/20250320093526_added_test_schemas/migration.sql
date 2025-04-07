-- CreateEnum
CREATE TYPE "TestAttemptStatus" AS ENUM ('ACCEPTED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "scb_test_files" (
    "id" SERIAL NOT NULL,
    "filename" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "instructions" TEXT,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scb_test_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scb_test_invitations" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "invited_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scb_test_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scb_test_attempts" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "test_file_id" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "status" "TestAttemptStatus" NOT NULL DEFAULT 'ACCEPTED',
    "started_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL,
    "cancelled_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scb_test_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scb_test_files_file_id_idx" ON "scb_test_files"("file_id");

-- CreateIndex
CREATE INDEX "scb_test_files_created_by_idx" ON "scb_test_files"("created_by");

-- CreateIndex
CREATE INDEX "scb_test_invitations_user_id_idx" ON "scb_test_invitations"("user_id");

-- CreateIndex
CREATE INDEX "scb_test_invitations_invited_by_idx" ON "scb_test_invitations"("invited_by");

-- CreateIndex
CREATE UNIQUE INDEX "scb_test_invitations_user_id_key" ON "scb_test_invitations"("user_id");

-- CreateIndex
CREATE INDEX "scb_test_attempts_user_id_idx" ON "scb_test_attempts"("user_id");

-- CreateIndex
CREATE INDEX "scb_test_attempts_test_file_id_idx" ON "scb_test_attempts"("test_file_id");

-- AddForeignKey
ALTER TABLE "scb_test_invitations" ADD CONSTRAINT "scb_test_invitations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scb_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scb_test_attempts" ADD CONSTRAINT "scb_test_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scb_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scb_test_attempts" ADD CONSTRAINT "scb_test_attempts_test_file_id_fkey" FOREIGN KEY ("test_file_id") REFERENCES "scb_test_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
