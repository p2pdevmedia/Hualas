-- AlterTable
ALTER TABLE "User" ADD COLUMN "activeRole" "Role" NOT NULL DEFAULT 'MEMBER';

-- Set activeRole = current role for every existing user
UPDATE "User" SET "activeRole" = "role";

-- CreateTable
CREATE TABLE "UserRoleAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedById" TEXT,
    "notes" TEXT,

    CONSTRAINT "UserRoleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserRoleAssignment_userId_role_key" ON "UserRoleAssignment"("userId", "role");

-- CreateIndex
CREATE INDEX "UserRoleAssignment_userId_idx" ON "UserRoleAssignment"("userId");

-- CreateIndex
CREATE INDEX "UserRoleAssignment_role_idx" ON "UserRoleAssignment"("role");

-- AddForeignKey
ALTER TABLE "UserRoleAssignment" ADD CONSTRAINT "UserRoleAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRoleAssignment" ADD CONSTRAINT "UserRoleAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: every existing user with an elevated role gets an assignment row.
-- MEMBER is implicit and is NOT stored as an assignment.
INSERT INTO "UserRoleAssignment" ("id", "userId", "role", "assignedAt")
SELECT
    'urabf_' || "id",
    "id",
    "role",
    COALESCE("createdAt", CURRENT_TIMESTAMP)
FROM "User"
WHERE "role" <> 'MEMBER';
