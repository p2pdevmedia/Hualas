DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'Role' AND e.enumlabel = 'PROFESSOR'
  ) THEN
    ALTER TYPE "Role" ADD VALUE 'PROFESSOR';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'AttendanceStatus'
  ) THEN
    CREATE TYPE "AttendanceStatus" AS ENUM ('PENDING', 'GOING', 'NOT_GOING');
  ELSE
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'AttendanceStatus' AND e.enumlabel = 'PENDING'
    ) THEN
      ALTER TYPE "AttendanceStatus" ADD VALUE 'PENDING';
    END IF;
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'AttendanceStatus' AND e.enumlabel = 'GOING'
    ) THEN
      ALTER TYPE "AttendanceStatus" ADD VALUE 'GOING';
    END IF;
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'AttendanceStatus' AND e.enumlabel = 'NOT_GOING'
    ) THEN
      ALTER TYPE "AttendanceStatus" ADD VALUE 'NOT_GOING';
    END IF;
  END IF;
END$$;
