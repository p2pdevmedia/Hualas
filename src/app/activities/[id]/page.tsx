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
      <div className="rounded-3xl border border-dashed border-slate-300/70 bg-white/60 p-10 text-center text-slate-500 backdrop-blur">
        Actividad no encontrada
      </div>
    );
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
    <div className="space-y-8">
      <PaymentHandler activityId={activity.id} />
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">
          {activity.name}
        </h1>
        {(session?.user.role === 'ADMIN' ||
          session?.user.role === 'SUPER_ADMIN') && (
          <Link
            href={`/activities/${activity.id}/edit`}
            className="text-sm font-semibold text-emerald-600 transition hover:text-emerald-700"
          >
            Editar actividad
          </Link>
        )}
      </div>
      {activity.image && (
        <div className="overflow-hidden rounded-3xl border border-white/60 bg-white/60 shadow-lg shadow-slate-900/5">
          <Image
            src={activity.image}
            alt={activity.name}
            width={1200}
            height={700}
            className="h-auto w-full object-cover"
          />
        </div>
      )}
      <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
        <div className="space-y-4 rounded-3xl border border-white/60 bg-white/70 p-6 shadow-lg shadow-slate-900/5 backdrop-blur">
          <dl className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-slate-800">Fecha</dt>
              <dd>{activity.date.toISOString().split('T')[0]}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-800">Frecuencia</dt>
              <dd>{frequencyLabels[activity.frequency as keyof typeof frequencyLabels]}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-800">Precio</dt>
              <dd>${activity.price}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-800">Suscriptos</dt>
              <dd>{activity.participants.length}</dd>
            </div>
          </dl>
          {activity.description && (
            <p className="rounded-2xl bg-white/80 p-4 text-sm text-slate-600 shadow-inner shadow-white/40">
              {activity.description}
            </p>
          )}
        </div>
        <RegisterButton activityId={activity.id} />
      </div>
    </div>
  );
}
