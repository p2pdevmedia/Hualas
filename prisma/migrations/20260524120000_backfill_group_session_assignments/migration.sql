-- Backfill the group-based modality for existing data.
-- Sessions are now assigned to groups, and professors are assigned to groups.

INSERT INTO "ActivityGroupProfessor" ("id", "activityGroupId", "userId", "createdAt")
SELECT
  'backfill_' || md5("ActivityGroup"."id" || ':' || "ActivityProfessor"."userId"),
  "ActivityGroup"."id",
  "ActivityProfessor"."userId",
  LEAST("ActivityGroup"."createdAt", "ActivityProfessor"."createdAt")
FROM "ActivityGroup"
INNER JOIN "ActivityProfessor"
  ON "ActivityProfessor"."activityId" = "ActivityGroup"."activityId"
WHERE NOT EXISTS (
  SELECT 1
  FROM "ActivityGroupProfessor"
  WHERE "ActivityGroupProfessor"."activityGroupId" = "ActivityGroup"."id"
)
ON CONFLICT ("activityGroupId", "userId") DO NOTHING;

WITH single_group_activities AS (
  SELECT
    "activityId",
    MIN("id") AS "activityGroupId",
    COUNT(*) AS "groupCount"
  FROM "ActivityGroup"
  GROUP BY "activityId"
  HAVING COUNT(*) = 1
)
UPDATE "ActivityDay"
SET "activityGroupId" = single_group_activities."activityGroupId"
FROM single_group_activities
WHERE "ActivityDay"."activityId" = single_group_activities."activityId"
  AND "ActivityDay"."activityGroupId" IS NULL;
