import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Prisma } from '@prisma/client';
import { paymentTypeLabels } from '@/lib/payment-type';

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

  return (
    <main className="p-4">
      <h1 className="mb-4 text-2xl font-bold">{activity.name}</h1>
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
      <p className="mb-2">
        Tipo de pago: {paymentTypeLabels[activity.paymentType]}
      </p>
      <p className="mb-4">{activity.description}</p>
      <p className="mb-4 font-semibold">
        {activity.participants.length} participants
      </p>
      <Button>Register</Button>
    </main>
  );
}
