import Link from 'next/link';
import { Prisma, ProfessorPaymentStatus } from '@prisma/client';
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
import {
  buildAccountingMovementReceiptUrl,
  buildProfessorInvoiceFileUrl,
} from '@/lib/blob-urls';
import ReceiptPreviewLink from '@/components/accounting/receipt-preview-link';
import MovementTabs from '../movement-tabs';

type SearchParams = {
  activityId?: string;
  groupId?: string;
  q?: string;
  tab?: string;
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
  totalExpenses: number;
  availableBalance: number;
  lastPaidAt: Date | null;
};

type ActivityPayment = Prisma.ActivityParticipantPaymentGetPayload<{
  include: {
    user: { select: { name: true; lastName: true; email: true } };
    child: { select: { name: true; lastName: true } };
    activityDay: { select: { date: true; schedule: true } };
  };
}>;

type ActivityExpense = Prisma.AccountingMovementGetPayload<{
  include: {
    createdBy: { select: { name: true; lastName: true } };
  };
}>;

type ActivityProfessorExpense = Prisma.ProfessorPaymentGetPayload<{
  include: {
    professorProfile: {
      include: { user: { select: { name: true; lastName: true } } };
    };
    invoice: { select: { id: true; originalName: true } };
    createdBy: { select: { name: true; lastName: true } };
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
      (COALESCE(expenses."totalExpenses", 0) + COALESCE(professor_expenses."totalProfessorExpenses", 0))::double precision AS "totalExpenses",
      (COALESCE(payments."totalCollected", 0) - COALESCE(expenses."totalExpenses", 0) - COALESCE(professor_expenses."totalProfessorExpenses", 0))::double precision AS "availableBalance",
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
    LEFT JOIN (
      SELECT
        am."activityId",
        SUM(am."amount") AS "totalExpenses"
      FROM "AccountingMovement" am
      WHERE am."type" = 'EXPENSE'
        AND am."activityId" IS NOT NULL
      GROUP BY am."activityId"
    ) expenses ON expenses."activityId" = a."id"
    LEFT JOIN (
      SELECT
        pp."activityId",
        SUM(pp."amount") AS "totalProfessorExpenses"
      FROM "ProfessorPayment" pp
      WHERE pp."status" = 'PAID'
        AND pp."activityId" IS NOT NULL
      GROUP BY pp."activityId"
    ) professor_expenses ON professor_expenses."activityId" = a."id"
    WHERE a."id" = ${activityId}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

async function getActivityOptions(q: string) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const searchCondition = q
    ? buildAccountingSimilarityCondition(q, [
        Prisma.sql`a."name"`,
        Prisma.sql`a."description"`,
      ])
    : Prisma.sql`TRUE`;

  return prisma.$queryRaw<
    Array<{ id: string; name: string; date: Date; endDate: Date }>
  >`
    SELECT a."id", a."name", a."date", a."endDate"
    FROM "Activity" a
    WHERE a."endDate" >= ${todayStart}
      AND ${searchCondition}
    ORDER BY a."date" ASC, a."name" ASC
    LIMIT 50
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
  const selectedGroupId = searchParams?.groupId?.trim() ?? '';
  const selectedTab = searchParams?.tab === 'expenses' ? 'expenses' : 'income';
  const [activityOptions, selectedActivity] = await Promise.all([
    selectedActivityId ? Promise.resolve([]) : getActivityOptions(q),
    selectedActivityId ? getActivitySummary(selectedActivityId) : null,
  ]);

  const payments = selectedActivity
    ? await prisma.activityParticipantPayment.findMany({
        where: {
          activityId: selectedActivity.id,
          ...(selectedGroupId
            ? {
                activityParticipant: {
                  groupMembership: {
                    activityGroupId: selectedGroupId,
                  },
                },
              }
            : {}),
        },
        orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
        include: {
          user: { select: { name: true, lastName: true, email: true } },
          child: { select: { name: true, lastName: true } },
          activityDay: { select: { date: true, schedule: true } },
        },
      })
    : [];

  const [expenses, professorExpenses]: [
    ActivityExpense[],
    ActivityProfessorExpense[],
  ] = selectedActivity
    ? await Promise.all([
        prisma.accountingMovement.findMany({
          where: {
            activityId: selectedActivity.id,
            type: 'EXPENSE',
          },
          include: {
            createdBy: { select: { name: true, lastName: true } },
          },
          orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        }),
        prisma.professorPayment.findMany({
          where: {
            activityId: selectedActivity.id,
            status: {
              in: [ProfessorPaymentStatus.PENDING, ProfessorPaymentStatus.PAID],
            },
          },
          include: {
            professorProfile: {
              include: {
                user: { select: { name: true, lastName: true } },
              },
            },
            invoice: { select: { id: true, originalName: true } },
            createdBy: { select: { name: true, lastName: true } },
          },
          orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
        }),
      ])
    : [[], []];

  const expenseRows = [
    ...expenses.map((expense) => ({
      id: `movement:${expense.id}`,
      date: expense.date,
      category: expense.category,
      description: expense.description,
      receipt: expense.receiptNumber ?? '—',
      receiptHref: expense.receiptImage
        ? buildAccountingMovementReceiptUrl(expense.id)
        : null,
      receiptTitle: `Comprobante de ${expense.category}`,
      createdBy: formatPersonName(expense.createdBy),
      amount: expense.amount,
    })),
    ...professorExpenses.map((payment) => ({
      id: `professor:${payment.id}`,
      date: payment.paidAt ?? payment.createdAt,
      category: 'Honorarios profesores',
      description: `${formatPersonName(payment.professorProfile.user)} · ${String(payment.periodMonth).padStart(2, '0')}/${payment.periodYear} · ${
        payment.status === ProfessorPaymentStatus.PAID
          ? 'Transferida'
          : 'Aprobada'
      }`,
      receipt: payment.invoice?.originalName ?? 'Factura',
      receiptHref: payment.invoice
        ? buildProfessorInvoiceFileUrl(payment.invoice.id)
        : null,
      receiptTitle: `Factura de ${formatPersonName(payment.professorProfile.user)}`,
      createdBy: formatPersonName(payment.createdBy),
      amount: payment.amount,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const activityGroups = selectedActivity
    ? await prisma.activityGroup.findMany({
        where: { activityId: selectedActivity.id },
        orderBy: [{ name: 'asc' }],
        select: { id: true, name: true },
      })
    : [];

  const selectedGroup = selectedGroupId
    ? (activityGroups.find((group) => group.id === selectedGroupId) ?? null)
    : null;

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
          <Link href="/accounting/movements/activities" prefetch={true}>
            Ver actividades vigentes
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
            Seleccioná una actividad vigente para abrir su caja. Si necesitás
            acotar la lista, usá el buscador por nombre o descripción.
          </p>

          <div className="mt-4 divide-y rounded-xl border">
            {activityOptions.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                {q
                  ? 'No hay actividades vigentes con ese criterio de búsqueda.'
                  : 'No hay actividades vigentes para seleccionar.'}
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
                      Seleccionar
                    </Link>
                  </Button>
                </div>
              ))
            )}
          </div>
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
              <p className="text-sm text-muted-foreground">Caja disponible</p>
              <p className="mt-2 text-2xl font-bold">
                {formatAmount(selectedActivity.availableBalance)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Recaudado: {formatAmount(selectedActivity.totalCollected)} ·
                Egresos: {formatAmount(selectedActivity.totalExpenses)}
              </p>
            </div>
          </section>

          <form className="rounded-2xl border bg-card p-4 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <label className="space-y-1 text-sm">
                <span className="font-medium">Filtrar por grupo</span>
                <select
                  name="groupId"
                  defaultValue={selectedGroupId}
                  className="w-full rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Todos los grupos</option>
                  {activityGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
                <input
                  type="hidden"
                  name="activityId"
                  value={selectedActivity.id}
                />
                <input type="hidden" name="tab" value={selectedTab} />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="submit">Aplicar filtro</Button>
                <Button asChild variant="outline">
                  <Link
                    href={`/accounting/movements/activities?activityId=${selectedActivity.id}`}
                    prefetch={true}
                  >
                    Quitar filtro
                  </Link>
                </Button>
              </div>
            </div>
            {selectedGroup ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Mostrando pagos del grupo:{' '}
                <span className="font-medium">{selectedGroup.name}</span>
              </p>
            ) : null}
          </form>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                asChild
                variant={selectedTab === 'income' ? 'primary' : 'outline'}
              >
                <Link
                  href={`/accounting/movements/activities?activityId=${selectedActivity.id}${selectedGroupId ? `&groupId=${selectedGroupId}` : ''}&tab=income`}
                  prefetch={true}
                >
                  Ingresos ({payments.length})
                </Link>
              </Button>
              <Button
                asChild
                variant={selectedTab === 'expenses' ? 'primary' : 'outline'}
              >
                <Link
                  href={`/accounting/movements/activities?activityId=${selectedActivity.id}${selectedGroupId ? `&groupId=${selectedGroupId}` : ''}&tab=expenses`}
                  prefetch={true}
                >
                  Egresos ({expenseRows.length})
                </Link>
              </Button>
            </div>

            {selectedTab === 'income' ? (
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
                          <td className="px-4 py-3">
                            {payment.paymentReference}
                          </td>
                          <td className="px-4 py-3 font-semibold">
                            {formatAmount(payment.amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border bg-card shadow-sm">
                <table className="min-w-full text-sm">
                  <thead className="border-b bg-muted/20 text-left text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Fecha</th>
                      <th className="px-4 py-3 font-medium">Categoría</th>
                      <th className="px-4 py-3 font-medium">Detalle</th>
                      <th className="px-4 py-3 font-medium">Comprobante</th>
                      <th className="px-4 py-3 font-medium">Registrado por</th>
                      <th className="px-4 py-3 font-medium">Importe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {expenseRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-10 text-center text-muted-foreground"
                        >
                          Esta actividad todavía no tiene egresos registrados.
                        </td>
                      </tr>
                    ) : (
                      expenseRows.map((expense) => (
                        <tr key={expense.id} className="align-top">
                          <td className="px-4 py-3">
                            {formatAccountingDate(expense.date)}
                          </td>
                          <td className="px-4 py-3">{expense.category}</td>
                          <td className="px-4 py-3">{expense.description}</td>
                          <td className="px-4 py-3">
                            <ReceiptPreviewLink
                              label={expense.receipt}
                              href={expense.receiptHref}
                              title={expense.receiptTitle}
                            />
                          </td>
                          <td className="px-4 py-3">{expense.createdBy}</td>
                          <td className="px-4 py-3 font-semibold">
                            {formatAmount(expense.amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
