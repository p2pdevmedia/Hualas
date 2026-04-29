-- CreateTable
CREATE TABLE "PickupNotice" (
    "id" TEXT NOT NULL,
    "activityDayId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "alternatePersonUserId" TEXT,
    "alternatePersonName" TEXT,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PickupNotice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PickupNoticeAcknowledgment" (
    "id" TEXT NOT NULL,
    "pickupNoticeId" TEXT NOT NULL,
    "acknowledgedById" TEXT NOT NULL,
    "notes" TEXT,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PickupNoticeAcknowledgment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PickupNotice_activityDayId_childId_key" ON "PickupNotice"("activityDayId", "childId");

-- CreateIndex
CREATE INDEX "PickupNotice_childId_idx" ON "PickupNotice"("childId");

-- CreateIndex
CREATE INDEX "PickupNotice_createdById_idx" ON "PickupNotice"("createdById");

-- CreateIndex
CREATE INDEX "PickupNotice_activityDayId_idx" ON "PickupNotice"("activityDayId");

-- CreateIndex
CREATE UNIQUE INDEX "PickupNoticeAcknowledgment_pickupNoticeId_acknowledgedById_key" ON "PickupNoticeAcknowledgment"("pickupNoticeId", "acknowledgedById");

-- CreateIndex
CREATE INDEX "PickupNoticeAcknowledgment_pickupNoticeId_idx" ON "PickupNoticeAcknowledgment"("pickupNoticeId");

-- CreateIndex
CREATE INDEX "PickupNoticeAcknowledgment_acknowledgedById_idx" ON "PickupNoticeAcknowledgment"("acknowledgedById");

-- AddForeignKey
ALTER TABLE "PickupNotice" ADD CONSTRAINT "PickupNotice_activityDayId_fkey" FOREIGN KEY ("activityDayId") REFERENCES "ActivityDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickupNotice" ADD CONSTRAINT "PickupNotice_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickupNotice" ADD CONSTRAINT "PickupNotice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickupNotice" ADD CONSTRAINT "PickupNotice_alternatePersonUserId_fkey" FOREIGN KEY ("alternatePersonUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickupNoticeAcknowledgment" ADD CONSTRAINT "PickupNoticeAcknowledgment_pickupNoticeId_fkey" FOREIGN KEY ("pickupNoticeId") REFERENCES "PickupNotice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickupNoticeAcknowledgment" ADD CONSTRAINT "PickupNoticeAcknowledgment_acknowledgedById_fkey" FOREIGN KEY ("acknowledgedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
