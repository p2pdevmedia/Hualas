import { prisma } from '@/lib/prisma';

export type ActivityType = 'TEMPORARY' | 'EVENTUAL' | 'ANNUAL';

export type ActivityBaseRecord = {
  id: string;
  name: string;
  date: Date;
  endDate: Date;
  activityType: ActivityType;
  frequency: string;
  image: string | null;
  description: string | null;
  price: number;
  createdAt: Date;
};

export type ActivityListRecord = ActivityBaseRecord & {
  capacity: number | null;
  participantCount: number;
};

type ActivityListRow = ActivityBaseRecord & {
  capacity: bigint | number | null;
  participantCount: bigint | number;
};

function normalizeListRow(row: ActivityListRow): ActivityListRecord {
  return {
    ...row,
    price: Number(row.price),
    capacity: row.capacity == null ? null : Number(row.capacity),
    participantCount: Number(row.participantCount),
  };
}

export async function listActivitiesWithParticipantCount() {
  const rows = await prisma.$queryRaw<ActivityListRow[]>`
    SELECT
      a."id",
      a."name",
      a."date",
      a."endDate",
      a."activityType",
      a."frequency",
      a."image",
      a."description",
      a."price",
      a."createdAt",
      (SELECT
        CASE
          WHEN COUNT(ag."id") = 0 THEN NULL
          WHEN COUNT(CASE WHEN ag."capacity" IS NULL THEN 1 END) > 0 THEN NULL
          ELSE SUM(ag."capacity")
        END
      FROM "ActivityGroup" ag WHERE ag."activityId" = a."id") AS "capacity",
      COUNT(ap."id") AS "participantCount"
    FROM "Activity" a
    LEFT JOIN "ActivityParticipant" ap ON ap."activityId" = a."id"
    GROUP BY
      a."id",
      a."name",
      a."date",
      a."endDate",
      a."activityType",
      a."frequency",
      a."image",
      a."description",
      a."price",
      a."createdAt"
    ORDER BY a."date" ASC
  `;

  return rows.map(normalizeListRow);
}

export async function getActivityBaseRecordById(id: string) {
  const rows = await prisma.$queryRaw<ActivityBaseRecord[]>`
    SELECT
      "id",
      "name",
      "date",
      "endDate",
      "activityType",
      "frequency",
      "image",
      "description",
      "price",
      "createdAt"
    FROM "Activity"
    WHERE "id" = ${id}
    LIMIT 1
  `;

  return rows[0] ?? null;
}
