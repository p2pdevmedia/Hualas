import { Suspense } from 'react';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import RegisterButton from './register-button';
import PaymentHandler from './payment-handler';
import ActivityDaysPanel from './activity-days-panel';
import Image from 'next/image';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Button } from '@/components/ui/button';

interface ActivityPageProps {
  params: { id: string };
}

type ActivityDetail = Prisma.ActivityGetPayload<{
  include: {
    participants: {
      include: {
        user: true;
        child: true;
      };
    };
  };
}>;

type ActivityParticipantDetail = ActivityDetail['participants'][number];

function getParticipantName(participant: ActivityParticipantDetail) {
  if (participant.child) {
    return `${participant.child.name}${participant.child.lastName ? ` ${participant.child.lastName}` : ''}`;
  }

  return `${participant.user.name ?? 'Sin nombre'}${participant.user.lastName ? ` ${participant.user.lastName}` : ''}`;
}

function getParticipantSubtitle(participant: ActivityParticipantDetail) {
  if (participant.child) {
    return `Registrado por ${participant.user.name ?? 'sin nombre'}${participant.user.lastName ? ` ${participant.user.lastName}` : ''}`;
  }

  return participant.user.email;
}

export default async function ActivityPage({ params }: ActivityPageProps) {
  const session = await getServerSession(authOptions);
  const isAdmin =
    session?.user.role === 'ADMIN' || session?.user.role === 'SUPER_ADMIN';

  let activity: any = null;
  try {
    activity = await prisma.activity.findUnique({
      where: { id: params.id },
      include: {
        participants: isAdmin
          ? {
              include: {
                user: true,
                child: true,
              },
            }
          : true,
        professors: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                lastName: true,
              },
            },
          },
        },
        days: {
          orderBy: { date: 'asc' },
          include: {
            attendances: {
              select: {
                activityParticipantId: true,
                status: true,
                confirmedAt: true,
              },
            },
          },
        },
      },
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

  const frequencyLabels: Record<string, string> = {
    DAILY: 'Diaria',
    WEEKLY: 'Semanal',
    MONTHLY: 'Mensual',
    ONE_TIME: 'Un solo pago',
  };
  const enrolledCount = activity.participants.length;
  const hasCapacity = activity.capacity != null;
  const remainingSpots = hasCapacity
    ? Math.max(activity.capacity - enrolledCount, 0)
    : null;
  const isFull = hasCapacity && remainingSpots === 0;
  const canManageDays =
    isAdmin ||
    activity.professors.some(
      (assignment: { userId: string }) => assignment.userId === session?.user.id
    );

  let registrations: Array<{
    id: string;
    label: string;
  }> = [];

  if (session) {
    const activityParticipants = await prisma.activityParticipant.findMany({
      where: {
        activityId: activity.id,
        OR: [
          { userId: session.user.id },
          { child: { userId: session.user.id } },
        ],
      },
      include: {
        child: {
          select: {
            name: true,
            lastName: true,
          },
        },
      },
    });

    registrations = activityParticipants.map((participant: any) => ({
      id: participant.id,
      label: participant.child
        ? `${participant.child.name}${participant.child.lastName ? ` ${participant.child.lastName}` : ''}`
        : (session.user.name ?? 'Yo'),
    }));
  }

  const professorLabels = activity.professors.map((assignment: any) => {
    const professor = assignment.user;
    return `${professor.name ?? 'Sin nombre'}${professor.lastName ? ` ${professor.lastName}` : ''}`;
  });

  return (
    <main>
      <Suspense fallback={null}>
        <PaymentHandler activityId={activity.id} />
      </Suspense>

      {/* Hero foto */}
      {activity.image ? (
        <div className="relative w-full h-52 overflow-hidden">
          <Image
            src={activity.image}
            alt={activity.name}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
      ) : (
        <div
          className="w-full h-52"
          style={{
            background: 'linear-gradient(135deg, #1C2117 0%, #3D5A3E 100%)',
          }}
        />
      )}

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="text-xs text-muted-foreground mb-5 font-body flex items-center gap-1">
          <Link
            href="/activities"
            className="hover:text-primary transition-colors"
          >
            Actividades
          </Link>
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
                {
                  label: 'Frecuencia',
                  value:
                    frequencyLabels[activity.frequency] ?? activity.frequency,
                },
                { label: 'Precio', value: `$${activity.price}` },
                {
                  label: 'Inscriptos',
                  value: `${enrolledCount} personas`,
                },
                {
                  label: 'Cupo',
                  value: hasCapacity
                    ? `${activity.capacity} lugares`
                    : 'Ilimitado',
                },
                activity.professors.length > 0 && {
                  label: 'Profesores',
                  value: professorLabels.join(', '),
                },
                activity.date && {
                  label: 'Fecha',
                  value: activity.date.toLocaleDateString('es-AR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  }),
                },
              ]
                .filter(Boolean)
                .map((item: any) => (
                  <div
                    key={item.label}
                    className="rounded-lg border bg-card p-4"
                  >
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-body mb-1">
                      {item.label}
                    </p>
                    <p className="font-heading text-lg font-semibold">
                      {item.value}
                    </p>
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
            style={{
              border: '1.5px solid hsl(var(--border))',
              background: 'hsl(var(--card))',
            }}
          >
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-body mb-1">
                Precio
              </p>
              <p className="font-heading text-3xl font-semibold">
                ${activity.price}
              </p>
              {activity.frequency !== 'ONE_TIME' && (
                <p className="text-xs text-muted-foreground font-body mt-0.5">
                  / {frequencyLabels[activity.frequency]?.toLowerCase()}
                </p>
              )}
              {hasCapacity && (
                <p
                  className={`text-xs font-body mt-1 ${
                    isFull ? 'text-destructive' : 'text-muted-foreground'
                  }`}
                >
                  {isFull
                    ? 'Cupo completo'
                    : `${remainingSpots} lugares disponibles`}
                </p>
              )}
            </div>

            <div className="space-y-3 pt-2">
              {isFull ? (
                <Button disabled className="w-full">
                  Cupo completo
                </Button>
              ) : (
                <RegisterButton activityId={activity.id} />
              )}
              <Link
                href="/contact"
                className="block text-center text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 font-body"
              >
                Contactanos
              </Link>
            </div>

            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground font-body text-center">
                {hasCapacity
                  ? `${enrolledCount} de ${activity.capacity} lugares ocupados`
                  : `${enrolledCount} personas ya inscriptas`}
              </p>
            </div>
          </div>
        </div>

        <ActivityDaysPanel
          activityId={activity.id}
          canManageDays={canManageDays}
          registrations={registrations}
          days={activity.days.map((day: any) => ({
            id: day.id,
            date: day.date.toISOString(),
            schedule: day.schedule,
            description: day.description,
            geoLocation: day.geoLocation,
            attendances: day.attendances.map((attendance: any) => ({
              activityParticipantId: attendance.activityParticipantId,
              status: attendance.status,
              confirmedAt: attendance.confirmedAt
                ? attendance.confirmedAt.toISOString()
                : null,
            })),
          }))}
        />

        {isAdmin && (
          <section className="mt-8 rounded-xl border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-heading text-2xl font-semibold">
                  Inscriptos
                </h2>
                <p className="text-sm text-muted-foreground font-body mt-1">
                  {enrolledCount} inscripto
                  {enrolledCount === 1 ? '' : 's'}
                </p>
              </div>
              {hasCapacity && (
                <div className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                  {remainingSpots} lugares disponibles
                </div>
              )}
            </div>

            {activity.participants.length === 0 ? (
              <p className="mt-6 text-sm text-muted-foreground font-body">
                Aún no hay inscriptos en esta actividad.
              </p>
            ) : (
              <ul className="mt-6 divide-y divide-border">
                {activity.participants.map(
                  (participant: ActivityParticipantDetail) => (
                    <li
                      key={participant.id}
                      className="py-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium">
                          {getParticipantName(participant)}
                        </p>
                        <p className="text-sm text-muted-foreground font-body">
                          {getParticipantSubtitle(participant)}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground font-body">
                          {participant.receipt && (
                            <span>Comprobante {participant.receipt}</span>
                          )}
                          {participant.receiptDate && (
                            <span>
                              {participant.receipt ? '· ' : ''}
                              Pago aprobado el{' '}
                              {participant.receiptDate.toLocaleDateString(
                                'es-AR',
                                {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                }
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground font-body">
                        {participant.child ? 'Hijo/a' : 'Titular'}
                      </div>
                    </li>
                  )
                )}
              </ul>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
