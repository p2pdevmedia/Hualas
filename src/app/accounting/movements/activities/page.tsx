import Link from 'next/link';
import { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  formatAccountingDate,
  formatAmount,
  formatPersonName,
} from '@/lib/accounting';
import { Button } from '@/components/ui/button';
import { ArrowRight, Search } from 'lucide-react';
import { buildAccountingSimilarityCondition } from '@/lib/accounting-search';
import MovementTabs from '../movement-tabs';

type SearchParams = {
  activityId?: string;
  q?: string;
};

type ActivitySummaryRow = {
  id: string;
  name: string;
  date: Date;
  endDate: Date;
  activityType: string;
  frequency: string;
  price: number;
  participantCount: number;
  paidParticipantCount: number;
  paymentCount: number;
  monthlyPaymentCount: number;
  sessionPaymentCount: number;
  totalCollected: number;
  lastPaidAt: Date | null;
};

type ActivityPayment = Prisma.ActivityParticipantPaymentGetPayload<{
  include: {
    user: { select: { name: true; lastName: true; email: true } };
    child: { select: { name: true; lastName: true } };
    activityDay: { select: { date: true; schedule: true } };
  };
}>;

const activityTypeLabels: Record<string, string> = {
  ANNUAL: 'Anual',
  TEMPORARY: 'Temporal',
};

const frequencyLabels: Record<string, string> = {
  ONE_TIME: 'Única',
  DAILY: 'Diaria',
  WEEKLY: 'Semanal',
  MONTHLY: 'Mensual',
};

const paymentTypeLabels: Record<string, string> = {
  MONTHLY: 'Mensual',
  SESSION: 'Por salida',
};

function formatActivityPeriod(start: Date, end: Date) {
  const formattedStart = formatAccountingDate(start);
  const formattedEnd = formatAccountingDate(end);

  return formattedStart === formattedEnd
    ? formattedStart
    : `${formattedStart} al ${formattedEnd}`;
}

function getPaymentConcept(payment: ActivityPayment) {
  if (
    payment.paymentType === 'MONTHLY' &&
    payment.periodMonth &&
    payment.periodYear
  ) {
    return `Período ${String(payment.periodMonth).padStart(2, '0')}/${payment.periodYear}`;
  }

  if (payment.activityDay) {
    return `Salida ${formatAccountingDate(payment.activityDay.date)} · ${payment.activityDay.schedule}`;
  }

  return paymentTypeLabels[payment.paymentType] ?? payment.paymentType;
}

function getPayerName(payment: ActivityPayment) {
  const userName = formatPersonName(payment.user);

  if (!payment.child) return userName;

  return `${formatPersonName(payment.child)} · Responsable: ${userName}`;
}

async function getActivitySummary(activityId: string) {
  const rows = await prisma.$queryRaw<ActivitySummaryRow[]>`
    SELECT
      a."id" AS "id",
      a."name" AS "name",
      a."date" AS "date",
      a."endDate" AS "endDate",
      a."activityType"::text AS "activityType",
      a."frequency"::text AS "frequency",
      a."price" AS "price",
      COALESCE(participants."participantCount", 0)::int AS "participantCount",
      COALESCE(payments."paidParticipantCount", 0)::int AS "paidParticipantCount",
      COALESCE(payments."paymentCount", 0)::int AS "paymentCount",
      COALESCE(payments."monthlyPaymentCount", 0)::int AS "monthlyPaymentCount",
      COALESCE(payments."sessionPaymentCount", 0)::int AS "sessionPaymentCount",
      COALESCE(payments."totalCollected", 0)::double precision AS "totalCollected",
      payments."lastPaidAt" AS "lastPaidAt"
    FROM "Activity" a
    LEFT JOIN (
      SELECT
        ap."activityId",
        COUNT(*) AS "participantCount"
      FROM "ActivityParticipant" ap
      GROUP BY ap."activityId"
    ) participants ON participants."activityId" = a."id"
    LEFT JOIN (
      SELECT
        app."activityId",
        COUNT(*) AS "paymentCount",
        COUNT(DISTINCT app."activityParticipantId") AS "paidParticipantCount",
        COUNT(*) FILTER (WHERE app."paymentType" = 'MONTHLY') AS "monthlyPaymentCount",
        COUNT(*) FILTER (WHERE app."paymentType" = 'SESSION') AS "sessionPaymentCount",
        SUM(app."amount") AS "totalCollected",
        MAX(app."paidAt") AS "lastPaidAt"
      FROM "ActivityParticipantPayment" app
      GROUP BY app."activityId"
    ) payments ON payments."activityId" = a."id"
    WHERE a."id" = ${activityId}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

async function getActivityOptions(q: string) {
  if (!q) return [];

  const condition = buildAccountingSimilarityCondition(q, [
    Prisma.sql`a."name"`,
    Prisma.sql`a."description"`,
  ]);

  return prisma.$queryRaw<
    Array<{ id: string; name: string; date: Date; endDate: Date }>
  >`
    SELECT a."id", a."name", a."date", a."endDate"
    FROM "Activity" a
    WHERE ${condition}
    ORDER BY a."date" DESC, a."name" ASC
    LIMIT 20
  `;
}

export default async function ActivityMovementsPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  // Auth gating happens in the parent /accounting layout.
  await getServerSession(authOptions);

  const q = searchParams?.q?.trim() ?? '';
  const selectedActivityId = searchParams?.activityId?.trim() ?? '';
  const [activityOptions, selectedActivity] = await Promise.all([
    selectedActivityId ? Promise.resolve([]) : getActivityOptions(q),
    selectedActivityId ? getActivitySummary(selectedActivityId) : null,
  ]);

  const payments = selectedActivity
    ? await prisma.activityParticipantPayment.findMany({
        where: { activityId: selectedActivity.id },
        orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
        include: {
          user: { select: { name: true, lastName: true, email: true } },
          child: { select: { name: true, lastName: true } },
          activityDay: { select: { date: true, schedule: true } },
        },
      })
    : [];

  const pendingParticipants = selectedActivity
    ? Math.max(
        selectedActivity.participantCount -
          selectedActivity.paidParticipantCount,
        0
      )
    : 0;

  return (
    <div className="space-y-6">
      <MovementTabs active="activities" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Caja por actividad
          </h2>
          <p className="text-sm text-muted-foreground">
            Buscá y elegí una actividad para ver únicamente su caja, pagos
            registrados y recaudación acumulada.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/activities" prefetch={true}>
            Ver actividades
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <form className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Buscar actividad</span>
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Nombre o descripción"
              className="w-full rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="submit">
              <Search className="mr-2 h-4 w-4" />
              Buscar
            </Button>
            <Button asChild variant="outline">
              <Link href="/accounting/movements/activities" prefetch={true}>
                Limpiar
              </Link>
            </Button>
          </div>
        </div>
      </form>

      {!selectedActivity && (
        <section className="rounded-2xl border bg-card p-4 shadow-sm">
          <h3 className="text-lg font-semibold">Elegí una actividad</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Esta pantalla ya no muestra todas las actividades juntas. Usá el
            buscador y seleccioná una actividad para abrir su caja.
          </p>

          {q ? (
            <div className="mt-4 divide-y rounded-xl border">
              {activityOptions.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">
                  No hay actividades con ese criterio de búsqueda.
                </p>
              ) : (
                activityOptions.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium">{activity.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatActivityPeriod(activity.date, activity.endDate)}
                      </p>
                    </div>
                    <Button
                      asChild
                      variant="outline"
                      className="self-start sm:self-auto"
                    >
                      <Link
                        href={`/accounting/movements/activities?activityId=${activity.id}`}
                        prefetch={true}
                      >
                        Ver caja
                      </Link>
                    </Button>
                  </div>
                ))
              )}
            </div>
          ) : null}
        </section>
      )}

      {selectedActivity && (
        <>
          <section className="rounded-2xl border bg-card p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Caja de</p>
                <h3 className="text-xl font-bold">{selectedActivity.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatActivityPeriod(
                    selectedActivity.date,
                    selectedActivity.endDate
                  )}{' '}
                  ·{' '}
                  {activityTypeLabels[selectedActivity.activityType] ??
                    selectedActivity.activityType}{' '}
                  ·{' '}
                  {frequencyLabels[selectedActivity.frequency] ??
                    selectedActivity.frequency}
                </p>
              </div>
              <Button asChild variant="outline">
                <Link href="/accounting/movements/activities" prefetch={true}>
                  Elegir otra actividad
                </Link>
              </Button>
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border bg-card p-4 shadow-sm">
              <p className="text-sm text-muted-foreground">Inscriptos</p>
              <p className="mt-2 text-2xl font-bold">
                {selectedActivity.participantCount}
              </p>
            </div>
            <div className="rounded-2xl border bg-card p-4 shadow-sm">
              <p className="text-sm text-muted-foreground">Pagaron</p>
              <p className="mt-2 text-2xl font-bold">
                {selectedActivity.paidParticipantCount}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {pendingParticipants} sin pagos registrados
              </p>
            </div>
            <div className="rounded-2xl border bg-card p-4 shadow-sm">
              <p className="text-sm text-muted-foreground">Pagos</p>
              <p className="mt-2 text-2xl font-bold">
                {selectedActivity.paymentCount}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {selectedActivity.monthlyPaymentCount} mensuales ·{' '}
                {selectedActivity.sessionPaymentCount} por salida
              </p>
            </div>
            <div className="rounded-2xl border bg-card p-4 shadow-sm">
              <p className="text-sm text-muted-foreground">Recaudado</p>
              <p className="mt-2 text-2xl font-bold">
                {formatAmount(selectedActivity.totalCollected)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Precio base: {formatAmount(selectedActivity.price)}
              </p>
            </div>
          </section>

          <div className="overflow-x-auto rounded-2xl border bg-card shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="border-b bg-muted/20 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Participante</th>
                  <th className="px-4 py-3 font-medium">Concepto</th>
                  <th className="px-4 py-3 font-medium">Referencia</th>
                  <th className="px-4 py-3 font-medium">Importe</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {payments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      Esta actividad todavía no tiene pagos registrados.
                    </td>
                  </tr>
                ) : (
                  payments.map((payment) => (
                    <tr key={payment.id} className="align-top">
                      <td className="px-4 py-3">
                        {formatAccountingDate(payment.paidAt)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">
                          {getPayerName(payment)}
                        </p>
                        {!payment.child && payment.user.email ? (
                          <p className="text-xs text-muted-foreground">
                            {payment.user.email}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <p>{getPaymentConcept(payment)}</p>
                          <p className="text-xs text-muted-foreground">
                            {paymentTypeLabels[payment.paymentType] ??
                              payment.paymentType}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">{payment.paymentReference}</td>
                      <td className="px-4 py-3 font-semibold">
                        {formatAmount(payment.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
