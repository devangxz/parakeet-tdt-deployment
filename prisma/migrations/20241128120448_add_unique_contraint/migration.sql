/*
  Warnings:

  - A unique constraint covering the columns `[api_key]` on the table `scb_api_keys` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "scb_api_keys_api_key_key" ON "scb_api_keys"("api_key");
