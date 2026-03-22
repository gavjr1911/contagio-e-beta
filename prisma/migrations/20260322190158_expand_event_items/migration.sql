/*
  Warnings:

  - Added the required column `updatedAt` to the `event_items` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EventItemType" ADD VALUE 'WELCOME';
ALTER TYPE "EventItemType" ADD VALUE 'PRAYER';
ALTER TYPE "EventItemType" ADD VALUE 'READING';
ALTER TYPE "EventItemType" ADD VALUE 'OFFERING';
ALTER TYPE "EventItemType" ADD VALUE 'VIDEO';
ALTER TYPE "EventItemType" ADD VALUE 'SPECIAL';
ALTER TYPE "EventItemType" ADD VALUE 'TRANSITION';

-- AlterTable
ALTER TABLE "event_items" ADD COLUMN     "bibleReference" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "mediaUrl" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
