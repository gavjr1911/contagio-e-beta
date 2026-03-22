-- CreateTable
CREATE TABLE "ministry_auto_assign_configs" (
    "id" TEXT NOT NULL,
    "ministryId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "autoAssignUntil" TIMESTAMP(3),
    "avoidConsecutive" BOOLEAN NOT NULL DEFAULT true,
    "maxEventsPerMonth" INTEGER,
    "rotationWeight" INTEGER NOT NULL DEFAULT 40,
    "availabilityWeight" INTEGER NOT NULL DEFAULT 40,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ministry_auto_assign_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment_logs" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "ministryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vacancyId" TEXT,
    "score" INTEGER NOT NULL,
    "scoreDetails" JSONB,
    "reason" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assignment_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ministry_auto_assign_configs_ministryId_key" ON "ministry_auto_assign_configs"("ministryId");

-- CreateIndex
CREATE INDEX "assignment_logs_eventId_idx" ON "assignment_logs"("eventId");

-- CreateIndex
CREATE INDEX "assignment_logs_ministryId_idx" ON "assignment_logs"("ministryId");

-- CreateIndex
CREATE INDEX "assignment_logs_userId_idx" ON "assignment_logs"("userId");

-- CreateIndex
CREATE INDEX "assignment_logs_assignedAt_idx" ON "assignment_logs"("assignedAt");

-- AddForeignKey
ALTER TABLE "ministry_auto_assign_configs" ADD CONSTRAINT "ministry_auto_assign_configs_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "ministries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_logs" ADD CONSTRAINT "assignment_logs_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_logs" ADD CONSTRAINT "assignment_logs_ministryId_fkey" FOREIGN KEY ("ministryId") REFERENCES "ministries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_logs" ADD CONSTRAINT "assignment_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
