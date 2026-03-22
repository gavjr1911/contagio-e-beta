-- CreateEnum
CREATE TYPE "RecurrencePattern" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY');

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "isRecurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parentEventId" TEXT,
ADD COLUMN     "recurrenceEndDate" DATE,
ADD COLUMN     "recurrencePattern" "RecurrencePattern";

-- CreateIndex
CREATE INDEX "events_parentEventId_idx" ON "events"("parentEventId");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_parentEventId_fkey" FOREIGN KEY ("parentEventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
