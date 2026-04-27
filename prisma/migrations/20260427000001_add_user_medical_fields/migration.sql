-- Add medical fields to User, mirroring the same fields already present on Child.
ALTER TABLE "User" ADD COLUMN "allergies"            TEXT;
ALTER TABLE "User" ADD COLUMN "regularMedication"    TEXT;
ALTER TABLE "User" ADD COLUMN "relevantDiseases"     TEXT;
ALTER TABLE "User" ADD COLUMN "previousInjuries"     TEXT;
ALTER TABLE "User" ADD COLUMN "physicalRestrictions" TEXT;
ALTER TABLE "User" ADD COLUMN "bloodGroup"           TEXT;
ALTER TABLE "User" ADD COLUMN "primaryDoctor"        TEXT;
ALTER TABLE "User" ADD COLUMN "doctorPhone"          TEXT;
