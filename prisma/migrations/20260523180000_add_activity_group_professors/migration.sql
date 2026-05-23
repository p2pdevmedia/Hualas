CREATE TABLE "ActivityGroupProfessor" (
    "id" TEXT NOT NULL,
    "activityGroupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityGroupProfessor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ActivityGroupProfessor_activityGroupId_userId_key" ON "ActivityGroupProfessor"("activityGroupId", "userId");

CREATE INDEX "ActivityGroupProfessor_activityGroupId_idx" ON "ActivityGroupProfessor"("activityGroupId");

CREATE INDEX "ActivityGroupProfessor_userId_idx" ON "ActivityGroupProfessor"("userId");

ALTER TABLE "ActivityGroupProfessor" ADD CONSTRAINT "ActivityGroupProfessor_activityGroupId_fkey" FOREIGN KEY ("activityGroupId") REFERENCES "ActivityGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ActivityGroupProfessor" ADD CONSTRAINT "ActivityGroupProfessor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
