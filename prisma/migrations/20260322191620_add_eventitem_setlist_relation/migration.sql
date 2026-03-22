-- AlterTable
ALTER TABLE "setlists" ADD COLUMN     "eventItemId" TEXT;

-- CreateIndex
CREATE INDEX "setlists_eventItemId_idx" ON "setlists"("eventItemId");

-- AddForeignKey
ALTER TABLE "setlists" ADD CONSTRAINT "setlists_eventItemId_fkey" FOREIGN KEY ("eventItemId") REFERENCES "event_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
