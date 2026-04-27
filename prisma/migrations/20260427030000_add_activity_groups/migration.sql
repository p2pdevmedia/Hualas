-- CreateTable
CREATE TABLE "ActivityGroup" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityGroupMember" (
    "id" TEXT NOT NULL,
    "activityGroupId" TEXT NOT NULL,
    "activityParticipantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityGroupMember_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "ActivityDay" ADD COLUMN     "activityGroupId" TEXT;

-- CreateIndex
CREATE INDEX "ActivityGroup_activityId_idx" ON "ActivityGroup"("activityId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityGroupMember_activityParticipantId_key" ON "ActivityGroupMember"("activityParticipantId");

-- CreateIndex
CREATE INDEX "ActivityGroupMember_activityGroupId_idx" ON "ActivityGroupMember"("activityGroupId");

-- CreateIndex
CREATE INDEX "ActivityDay_activityGroupId_idx" ON "ActivityDay"("activityGroupId");

-- AddForeignKey
ALTER TABLE "ActivityGroup" ADD CONSTRAINT "ActivityGroup_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityGroupMember" ADD CONSTRAINT "ActivityGroupMember_activityGroupId_fkey" FOREIGN KEY ("activityGroupId") REFERENCES "ActivityGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityGroupMember" ADD CONSTRAINT "ActivityGroupMember_activityParticipantId_fkey" FOREIGN KEY ("activityParticipantId") REFERENCES "ActivityParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityDay" ADD CONSTRAINT "ActivityDay_activityGroupId_fkey" FOREIGN KEY ("activityGroupId") REFERENCES "ActivityGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
