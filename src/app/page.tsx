import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import ActivityList, { ActivityWithParticipants } from '@/components/activity-list';

export default async function Home() {
  let activities: ActivityWithParticipants[] = [];

  try {
    activities = await prisma.activity.findMany({
      include: { participants: true },
      orderBy: { date: 'asc' },
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2021'
    ) {
      activities = [];
    } else {
      throw e;
    }
  }

  return <ActivityList activities={activities} />;
}

