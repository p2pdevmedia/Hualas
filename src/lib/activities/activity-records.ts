import { prisma } from '@/lib/prisma';

export type ActivityType = 'TEMPORARY' | 'ANNUAL';

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
  capacity: number | null;
  createdAt: Date;
};

export type ActivityListRecord = ActivityBaseRecord & {
  participantCount: number;
};

type ActivityListRow = ActivityBaseRecord & {
  participantCount: bigint | number;
};

function normalizeListRow(row: ActivityListRow): ActivityListRecord {
  return {
    ...row,
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
      a."capacity",
      a."createdAt",
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
      a."capacity",
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
      "capacity",
      "createdAt"
    FROM "Activity"
    WHERE "id" = ${id}
    LIMIT 1
  `;

  return rows[0] ?? null;
}
