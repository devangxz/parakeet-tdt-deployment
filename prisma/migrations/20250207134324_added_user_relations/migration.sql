-- AddForeignKey
ALTER TABLE "scb_cancellations" ADD CONSTRAINT "scb_cancellations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "scb_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
