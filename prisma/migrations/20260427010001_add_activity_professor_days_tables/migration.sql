CREATE TABLE IF NOT EXISTS "ActivityProfessor" (
  "id" TEXT NOT NULL,
  "activityId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ActivityProfessor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ActivityDay" (
  "id" TEXT NOT NULL,
  "activityId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "schedule" TEXT NOT NULL,
  "description" TEXT,
  "geoLocation" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ActivityDay_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ActivityDayAttendance" (
  "id" TEXT NOT NULL,
  "activityDayId" TEXT NOT NULL,
  "activityParticipantId" TEXT NOT NULL,
  "status" "AttendanceStatus" NOT NULL DEFAULT 'PENDING',
  "confirmedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ActivityDayAttendance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ActivityProfessor_activityId_userId_key"
  ON "ActivityProfessor"("activityId", "userId");

CREATE INDEX IF NOT EXISTS "ActivityProfessor_userId_idx"
  ON "ActivityProfessor"("userId");

CREATE INDEX IF NOT EXISTS "ActivityDay_activityId_date_idx"
  ON "ActivityDay"("activityId", "date");

CREATE UNIQUE INDEX IF NOT EXISTS "ActivityDayAttendance_activityDayId_activityParticipantId_key"
  ON "ActivityDayAttendance"("activityDayId", "activityParticipantId");

CREATE INDEX IF NOT EXISTS "ActivityDayAttendance_activityParticipantId_idx"
  ON "ActivityDayAttendance"("activityParticipantId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ActivityProfessor_activityId_fkey'
  ) THEN
    ALTER TABLE "ActivityProfessor"
      ADD CONSTRAINT "ActivityProfessor_activityId_fkey"
      FOREIGN KEY ("activityId") REFERENCES "Activity"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ActivityProfessor_userId_fkey'
  ) THEN
    ALTER TABLE "ActivityProfessor"
      ADD CONSTRAINT "ActivityProfessor_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ActivityDay_activityId_fkey'
  ) THEN
    ALTER TABLE "ActivityDay"
      ADD CONSTRAINT "ActivityDay_activityId_fkey"
      FOREIGN KEY ("activityId") REFERENCES "Activity"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ActivityDay_createdById_fkey'
  ) THEN
    ALTER TABLE "ActivityDay"
      ADD CONSTRAINT "ActivityDay_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ActivityDayAttendance_activityDayId_fkey'
  ) THEN
    ALTER TABLE "ActivityDayAttendance"
      ADD CONSTRAINT "ActivityDayAttendance_activityDayId_fkey"
      FOREIGN KEY ("activityDayId") REFERENCES "ActivityDay"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ActivityDayAttendance_activityParticipantId_fkey'
  ) THEN
    ALTER TABLE "ActivityDayAttendance"
      ADD CONSTRAINT "ActivityDayAttendance_activityParticipantId_fkey"
      FOREIGN KEY ("activityParticipantId") REFERENCES "ActivityParticipant"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
