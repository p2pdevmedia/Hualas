import Link from 'next/link';
import { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatAccountingDate, formatAmount } from '@/lib/accounting';
import { Button } from '@/components/ui/button';
import { ArrowRight, Search } from 'lucide-react';
import { buildAccountingSimilarityCondition } from '@/lib/accounting-search';
import MovementTabs from '../movement-tabs';

type SearchParams = {
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

function formatActivityPeriod(start: Date, end: Date) {
  const formattedStart = formatAccountingDate(start);
  const formattedEnd = formatAccountingDate(end);

  return formattedStart === formattedEnd
    ? formattedStart
    : `${formattedStart} al ${formattedEnd}`;
}

export default async function ActivityMovementsPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  // Auth gating happens in the parent /accounting layout.
  await getServerSession(authOptions);

  const q = searchParams?.q?.trim() ?? '';
  const filters: Prisma.Sql[] = [];

  if (q) {
    filters.push(
      buildAccountingSimilarityCondition(q, [
        Prisma.sql`a."name"`,
        Prisma.sql`a."description"`,
      ])
    );
  }

  const whereSql =
    filters.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(filters, ' AND ')}`
      : Prisma.empty;

  const activities = await prisma.$queryRaw<ActivitySummaryRow[]>`
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
    ${whereSql}
    ORDER BY a."date" DESC, a."name" ASC
  `;

  const totalCollected = activities.reduce(
    (sum, activity) => sum + activity.totalCollected,
    0
  );
  const totalParticipants = activities.reduce(
    (sum, activity) => sum + activity.participantCount,
    0
  );
  const totalPayments = activities.reduce(
    (sum, activity) => sum + activity.paymentCount,
    0
  );

  return (
    <div className="space-y-6">
      <MovementTabs active="activities" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Movimientos por actividad
          </h2>
          <p className="text-sm text-muted-foreground">
            Resumen contable de cada actividad con inscripciones, pagos
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

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Actividades</p>
          <p className="mt-2 text-2xl font-bold">{activities.length}</p>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Inscriptos</p>
          <p className="mt-2 text-2xl font-bold">{totalParticipants}</p>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Recaudado</p>
          <p className="mt-2 text-2xl font-bold">
            {formatAmount(totalCollected)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {totalPayments} pagos registrados
          </p>
        </div>
      </section>

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

      <div className="overflow-x-auto rounded-2xl border bg-card shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="border-b bg-muted/20 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Actividad</th>
              <th className="px-4 py-3 font-medium">Período</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Inscriptos</th>
              <th className="px-4 py-3 font-medium">Pagaron</th>
              <th className="px-4 py-3 font-medium">Pagos</th>
              <th className="px-4 py-3 font-medium">Precio</th>
              <th className="px-4 py-3 font-medium">Recaudado</th>
              <th className="px-4 py-3 font-medium">Último pago</th>
              <th className="px-4 py-3 font-medium">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {activities.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  No hay actividades con esos filtros.
                </td>
              </tr>
            ) : (
              activities.map((activity) => {
                const pendingParticipants = Math.max(
                  activity.participantCount - activity.paidParticipantCount,
                  0
                );

                return (
                  <tr key={activity.id} className="align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">
                        {activity.name}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {formatActivityPeriod(activity.date, activity.endDate)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <p>
                          {activityTypeLabels[activity.activityType] ??
                            activity.activityType}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {frequencyLabels[activity.frequency] ??
                            activity.frequency}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {activity.participantCount}
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <p className="font-semibold">
                          {activity.paidParticipantCount}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {pendingParticipants} sin pagos registrados
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <p className="font-semibold">{activity.paymentCount}</p>
                        <p className="text-xs text-muted-foreground">
                          {activity.monthlyPaymentCount} mensuales ·{' '}
                          {activity.sessionPaymentCount} por salida
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {formatAmount(activity.price)}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {formatAmount(activity.totalCollected)}
                    </td>
                    <td className="px-4 py-3">
                      {activity.lastPaidAt
                        ? formatAccountingDate(activity.lastPaidAt)
                        : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <Button asChild variant="outline" className="px-3 py-2">
                        <Link
                          href={`/activities/${activity.id}`}
                          prefetch={true}
                        >
                          Ver detalle
                        </Link>
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
