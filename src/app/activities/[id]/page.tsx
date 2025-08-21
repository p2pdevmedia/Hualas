import { prisma } from '@/lib/prisma';
import RegisterButton from './register-button';
import PaymentHandler from './payment-handler';
import Image from 'next/image';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface ActivityPageProps {
  params: { id: string };
}

export default async function ActivityPage({ params }: ActivityPageProps) {
  let activity: any = null;
  try {
    activity = await prisma.activity.findUnique({
      where: { id: params.id },
      include: { participants: true },
    });
  } catch (e: any) {
    activity = null;
  }

  if (!activity) {
    return <main className="p-4">Activity not found</main>;
  }

  const session = await getServerSession(authOptions);

  const frequencyLabels: Record<
    'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ONE_TIME',
    string
  > = {
    DAILY: 'Diaria',
    WEEKLY: 'Semanal',
    MONTHLY: 'Mensual',
    ONE_TIME: 'Un solo pago',
  };

  return (
    <main className="p-4">
      <PaymentHandler activityId={activity.id} />
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
      <p className="mb-2">
        Frecuencia:{' '}
        {frequencyLabels[activity.frequency as keyof typeof frequencyLabels]}
      </p>
      <p className="mb-4">{activity.description}</p>
      <p className="mb-4 font-semibold">Precio: ${activity.price}</p>
      <p className="mb-4 font-semibold">
        {activity.participants.length} suscriptos
      </p>
      <RegisterButton activityId={activity.id} />
    </main>
  );
}
