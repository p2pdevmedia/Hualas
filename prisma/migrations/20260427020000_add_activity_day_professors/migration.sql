-- CreateTable
CREATE TABLE "ActivityDayProfessor" (
    "id" TEXT NOT NULL,
    "activityDayId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityDayProfessor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ActivityDayProfessor_activityDayId_userId_key" ON "ActivityDayProfessor"("activityDayId", "userId");

-- CreateIndex
CREATE INDEX "ActivityDayProfessor_userId_idx" ON "ActivityDayProfessor"("userId");

-- CreateIndex
CREATE INDEX "ActivityDayProfessor_activityDayId_idx" ON "ActivityDayProfessor"("activityDayId");

-- AddForeignKey
ALTER TABLE "ActivityDayProfessor" ADD CONSTRAINT "ActivityDayProfessor_activityDayId_fkey" FOREIGN KEY ("activityDayId") REFERENCES "ActivityDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityDayProfessor" ADD CONSTRAINT "ActivityDayProfessor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
