-- CreateTable
CREATE TABLE "ActivityParticipantReport" (
    "id" TEXT NOT NULL,
    "activityDayId" TEXT NOT NULL,
    "activityParticipantId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityParticipantReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ActivityParticipantReport_activityDayId_activityParticipantId_key" ON "ActivityParticipantReport"("activityDayId", "activityParticipantId");

-- CreateIndex
CREATE INDEX "ActivityParticipantReport_activityParticipantId_idx" ON "ActivityParticipantReport"("activityParticipantId");

-- CreateIndex
CREATE INDEX "ActivityParticipantReport_createdById_idx" ON "ActivityParticipantReport"("createdById");

-- AddForeignKey
ALTER TABLE "ActivityParticipantReport" ADD CONSTRAINT "ActivityParticipantReport_activityDayId_fkey" FOREIGN KEY ("activityDayId") REFERENCES "ActivityDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityParticipantReport" ADD CONSTRAINT "ActivityParticipantReport_activityParticipantId_fkey" FOREIGN KEY ("activityParticipantId") REFERENCES "ActivityParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityParticipantReport" ADD CONSTRAINT "ActivityParticipantReport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
