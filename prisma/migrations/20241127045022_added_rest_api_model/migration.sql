-- CreateTable
CREATE TABLE "scb_api_keys" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "api_key" TEXT NOT NULL,
    "webhook" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scb_api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scb_api_keys_user_id_key" ON "scb_api_keys"("user_id");

-- CreateIndex
CREATE INDEX "scb_api_keys_user_id_idx" ON "scb_api_keys"("user_id");

-- CreateIndex
CREATE INDEX "scb_api_keys_api_key_idx" ON "scb_api_keys"("api_key");

-- AddForeignKey
ALTER TABLE "scb_api_keys" ADD CONSTRAINT "scb_api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scb_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
