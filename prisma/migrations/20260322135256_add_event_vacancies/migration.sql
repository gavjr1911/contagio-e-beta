/*
  Warnings:

  - You are about to drop the column `type` on the `ministries` table. All the data in the column will be lost.
  - You are about to drop the column `position` on the `ministry_members` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "ministries_type_idx";

-- AlterTable
ALTER TABLE "ministries" DROP COLUMN "type";

-- AlterTable
ALTER TABLE "ministry_members" DROP COLUMN "position";

-- AlterTable
ALTER TABLE "schedules" ADD COLUMN     "vacancyId" TEXT;

-- DropEnum
DROP TYPE "MinistryType";

-- CreateTable
CREATE TABLE "ministry_positions" (
    "id" TEXT NOT NULL,
    "ministryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ministry_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_positions" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_vacancies" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "ministryId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_vacancies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "encrypted" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ministry_positions_ministryId_idx" ON "ministry_positions"("ministryId");

-- CreateIndex
CREATE UNIQUE INDEX "ministry_positions_ministryId_name_key" ON "ministry_positions"("ministryId", "name");

-- CreateIndex
CREATE INDEX "member_positions_memberId_idx" ON "member_positions"("memberId");

-- CreateIndex
CREATE INDEX "member_positions_positionId_idx" ON "member_positions"("positionId");

-- CreateIndex
CREATE UNIQUE INDEX "member_positions_memberId_positionId_key" ON "member_positions"("memberId", "positionId");

-- CreateIndex
CREATE INDEX "event_vacancies_eventId_idx" ON "event_vacancies"("eventId");

-- CreateIndex
CREATE INDEX "event_vacancies_ministryId_idx" ON "event_vacancies"("ministryId");

-- CreateIndex
CREATE INDEX "event_vacancies_positionId_idx" ON "event_vacancies"("positionId");

-- CreateIndex
CREATE UNIQUE INDEX "event_vacancies_eventId_ministryId_positionId_key" ON "event_vacancies"("eventId", "ministryId", "positionId");

-- CreateIndex
CREATE UNIQUE INDEX "app_settings_key_key" ON "app_settings"("key");

-- CreateIndex
CREATE INDEX "schedules_vacancyId_idx" ON "schedules"("vacancyId");

-- AddForeignKey
ALTER TABLE "ministry_positions" ADD CONSTRAINT "ministry_positions_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "ministries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_positions" ADD CONSTRAINT "member_positions_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "ministry_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_positions" ADD CONSTRAINT "member_positions_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "ministry_positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_vacancies" ADD CONSTRAINT "event_vacancies_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_vacancies" ADD CONSTRAINT "event_vacancies_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "ministries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_vacancies" ADD CONSTRAINT "event_vacancies_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "ministry_positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "event_vacancies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
