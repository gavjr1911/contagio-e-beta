-- AlterTable
ALTER TABLE "schedules" ADD COLUMN     "confirmedById" TEXT;

-- CreateIndex
CREATE INDEX "schedules_confirmedById_idx" ON "schedules"("confirmedById");

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

