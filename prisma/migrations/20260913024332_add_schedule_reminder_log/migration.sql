-- CreateTable
CREATE TABLE "schedule_reminder_logs" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "daysBefore" INTEGER NOT NULL,
    "eventDate" DATE NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schedule_reminder_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "schedule_reminder_logs_eventDate_idx" ON "schedule_reminder_logs"("eventDate");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_reminder_logs_scheduleId_daysBefore_eventDate_key" ON "schedule_reminder_logs"("scheduleId", "daysBefore", "eventDate");

-- AddForeignKey
ALTER TABLE "schedule_reminder_logs" ADD CONSTRAINT "schedule_reminder_logs_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

