import { Suspense } from 'react';
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
      <main className="mx-auto max-w-2xl px-4 py-12 text-center text-muted-foreground font-body">
        Actividad no encontrada
      </main>
    );
  }

  const session = await getServerSession(authOptions);
  const isAdmin = session?.user.role === 'ADMIN' || session?.user.role === 'SUPER_ADMIN';

  const frequencyLabels: Record<string, string> = {
    DAILY: 'Diaria',
    WEEKLY: 'Semanal',
    MONTHLY: 'Mensual',
    ONE_TIME: 'Un solo pago',
  };

  return (ß
    <main className="p-4">
      <Suspense fallback={null}>
        <PaymentHandler activityId={activity.id} />
      </Suspense>
      <h1 className="mb-4 text-2xl font-bold">{activity.name}</h1>
      {(session?.user.role === 'ADMIN' ||
        session?.user.role === 'SUPER_ADMIN') && (
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

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="text-xs text-muted-foreground mb-5 font-body flex items-center gap-1">
          <Link href="/activities" className="hover:text-primary transition-colors">Actividades</Link>
          <span>→</span>
          <span className="text-foreground">{activity.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8 items-start">

          {/* Columna izquierda */}
          <div className="space-y-6">
            <div>
              <h1 className="font-heading text-3xl sm:text-4xl font-semibold leading-tight">
                {activity.name}
              </h1>
              {activity.description && (
                <p className="mt-4 text-sm text-muted-foreground leading-relaxed font-body">
                  {activity.description}
                </p>
              )}
            </div>

            {/* Grid de detalles 2×2 */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Frecuencia', value: frequencyLabels[activity.frequency] ?? activity.frequency },
                { label: 'Precio', value: `$${activity.price}` },
                { label: 'Inscriptos', value: `${activity.participants.length} personas` },
                activity.date && { label: 'Fecha', value: activity.date.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }) },
              ].filter(Boolean).map((item: any) => (
                <div
                  key={item.label}
                  className="rounded-lg border bg-card p-4"
                >
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-body mb-1">{item.label}</p>
                  <p className="font-heading text-lg font-semibold">{item.value}</p>
                </div>
              ))}
            </div>

            {isAdmin && (
              <Link
                href={`/activities/${activity.id}/edit`}
                className="inline-block text-sm text-primary hover:text-primary/80 underline underline-offset-4 font-body"
              >
                Editar actividad
              </Link>
            )}
          </div>

          {/* Panel derecho (sticky) */}
          <div
            className="rounded-xl p-5 space-y-4 lg:sticky lg:top-6"
            style={{ border: '1.5px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
          >
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-body mb-1">Precio</p>
              <p className="font-heading text-3xl font-semibold">${activity.price}</p>
              {activity.frequency !== 'ONE_TIME' && (
                <p className="text-xs text-muted-foreground font-body mt-0.5">
                  / {frequencyLabels[activity.frequency]?.toLowerCase()}
                </p>
              )}
            </div>

            <div className="space-y-3 pt-2">
              <RegisterButton activityId={activity.id} />
              <Link
                href="/contact"
                className="block text-center text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 font-body"
              >
                Contactanos
              </Link>
            </div>

            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground font-body text-center">
                {activity.participants.length} personas ya inscriptas
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
