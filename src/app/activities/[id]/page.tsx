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
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 text-center text-muted-foreground">
        Actividad no encontrada
      </main>
    );
  }

  const session = await getServerSession(authOptions);
  const isAdmin =
    session?.user.role === 'ADMIN' || session?.user.role === 'SUPER_ADMIN';

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
    <main className="mx-auto max-w-2xl px-4 py-8">
      <PaymentHandler activityId={activity.id} />

      <div className="mb-4 flex items-start justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {activity.name}
        </h1>
        {isAdmin && (
          <Link
            href={`/activities/${activity.id}/edit`}
            className="shrink-0 text-sm text-primary hover:underline"
          >
            Editar
          </Link>
        )}
      </div>

      {activity.image && (
        <Image
          src={activity.image}
          alt={activity.name}
          width={800}
          height={450}
          className="mb-6 w-full rounded-xl object-cover"
        />
      )}

      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
        {activity.date && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground font-medium">Fecha</span>
            <span>{activity.date.toISOString().split('T')[0]}</span>
          </div>
        )}
        <div className="flex justify-between text-sm border-t pt-3">
          <span className="text-muted-foreground font-medium">Frecuencia</span>
          <span>{frequencyLabels[activity.frequency as keyof typeof frequencyLabels]}</span>
        </div>
        <div className="flex justify-between text-sm border-t pt-3">
          <span className="text-muted-foreground font-medium">Precio</span>
          <span className="font-semibold">${activity.price}</span>
        </div>
        <div className="flex justify-between text-sm border-t pt-3">
          <span className="text-muted-foreground font-medium">Suscriptos</span>
          <span>{activity.participants.length}</span>
        </div>
        {activity.description && (
          <div className="border-t pt-3">
            <p className="text-sm text-foreground leading-relaxed">
              {activity.description}
            </p>
          </div>
        )}
      </div>

      <div className="mt-6">
        <RegisterButton activityId={activity.id} />
      </div>
    </main>
  );
}
