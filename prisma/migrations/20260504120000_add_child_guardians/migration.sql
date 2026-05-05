CREATE TYPE "ChildGuardianRelationship" AS ENUM ('MOTHER', 'FATHER', 'TUTOR');

CREATE TABLE "ChildGuardian" (
  "id" TEXT NOT NULL,
  "childId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "relationship" "ChildGuardianRelationship" NOT NULL DEFAULT 'TUTOR',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ChildGuardian_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ChildGuardian_childId_userId_key" ON "ChildGuardian"("childId", "userId");
CREATE INDEX "ChildGuardian_userId_idx" ON "ChildGuardian"("userId");

ALTER TABLE "ChildGuardian" ADD CONSTRAINT "ChildGuardian_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChildGuardian" ADD CONSTRAINT "ChildGuardian_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
