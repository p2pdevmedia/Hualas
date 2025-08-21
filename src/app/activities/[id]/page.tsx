import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Prisma } from '@prisma/client';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface ActivityPageProps {
  params: { id: string };
}

export default async function ActivityPage({ params }: ActivityPageProps) {
  type ActivityWithParticipants = Prisma.ActivityGetPayload<{
    include: { participants: true };
  }>;

  let activity: ActivityWithParticipants | null = null;
  try {
    activity = await prisma.activity.findUnique({
      where: { id: params.id },
      include: { participants: true },
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2021'
    ) {
      activity = null;
    } else {
      throw e;
    }
  }

  if (!activity) {
    return <main className="p-4">Activity not found</main>;
  }

  const session = await getServerSession(authOptions);

  return (
    <main className="p-4">
      <h1 className="mb-4 text-2xl font-bold">{activity.name}</h1>
      {session?.user.role === 'ADMIN' && (
        <Link
          href={`/activities/${activity.id}/edit`}
          className="mb-4 inline-block text-blue-600"
        >
          Editar
        </Link>
      )}
      {activity.image && (
        <Image
          src={activity.image}
          alt={activity.name}
          width={800}
          height={600}
          className="mb-4 max-w-full"
        />
      )}
      <p className="mb-2">Date: {activity.date.toISOString().split('T')[0]}</p>
      <p className="mb-4">{activity.description}</p>
      <p className="mb-4 font-semibold">
        {activity.participants.length} suscriptos
      </p>
      <Button>Register</Button>
    </main>
  );
}
