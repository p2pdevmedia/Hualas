import Link from 'next/link';
import { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  formatAccountingDate,
  formatAmount,
  movementTypeClass,
  movementTypeLabel,
} from '@/lib/accounting';
import { Button } from '@/components/ui/button';
import { ArrowRight, Search, ReceiptText } from 'lucide-react';
import PersonLink from '@/components/accounting/person-link';
import {
  buildAccountingMovementReceiptUrl,
  buildManualPaymentReceiptUrl,
} from '@/lib/blob-urls';
import { buildAccountingSimilarityCondition } from '@/lib/accounting-search';
import MovementTabs from './movement-tabs';

const PAGE_SIZE = 20;

const ACCOUNTING_HISTORY_ORIGINS = [
  'MOVEMENT',
  'MANUAL_PAYMENT',
  'MP_PAYMENT',
] as const;

type AccountingHistoryOrigin = (typeof ACCOUNTING_HISTORY_ORIGINS)[number];

type SearchParams = {
  from?: string;
  to?: string;
  type?: string;
  origin?: string;
  q?: string;
  page?: string;
};

type CountRow = {
  count: number;
};

type HistoryRow = {
  id: string;
  date: Date | null;
  origin: AccountingHistoryOrigin;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  description: string;
  amount: number;
  receiptNumber: string | null;
  receiptLabel: string | null;
  personName: string | null;
  personEmail: string | null;
  personHref: string | null;
};

function normalizeOrigin(value?: string) {
  return ACCOUNTING_HISTORY_ORIGINS.includes(value as AccountingHistoryOrigin)
    ? (value as AccountingHistoryOrigin)
    : '';
}

function pageHref({
  from,
  to,
  type,
  origin,
  q,
  page,
}: {
  from: string;
  to: string;
  type: string;
  origin: string;
  q: string;
  page: number;
}) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (type) params.set('type', type);
  if (origin) params.set('origin', origin);
  if (q) params.set('q', q);
  params.set('page', String(page));
  const query = params.toString();
  return query ? `/accounting/movements?${query}` : '/accounting/movements';
}

export default async function MovementsPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  // Auth gating happens in the parent /accounting layout.
  await getServerSession(authOptions);

  const from = searchParams?.from?.trim() ?? '';
  const to = searchParams?.to?.trim() ?? '';
  const type =
    searchParams?.type === 'INCOME' || searchParams?.type === 'EXPENSE'
      ? searchParams.type
      : '';
  const origin = normalizeOrigin(searchParams?.origin);
  const q = searchParams?.q?.trim() ?? '';
  const page = Math.max(Number(searchParams?.page ?? '1') || 1, 1);
  const offset = (page - 1) * PAGE_SIZE;

  const historyBranches = [
    Prisma.sql`
      SELECT
        m."id" AS "id",
        m."date" AS "date",
        'MOVEMENT'::text AS "origin",
        m."type"::text AS "type",
        m."category" AS "category",
        m."description" AS "description",
        m."amount" AS "amount",
        m."receiptNumber" AS "receiptNumber",
        CASE
          WHEN m."receiptImage" IS NOT NULL THEN 'Ver'
          WHEN m."receiptNumber" IS NOT NULL THEN m."receiptNumber"
          ELSE NULL
        END AS "receiptLabel",
        concat_ws(' ', u."name", u."lastName") AS "personName",
        u."email" AS "personEmail",
        '/admin/users/' || u."id" || '/view' AS "personHref"
      FROM "AccountingMovement" m
      JOIN "User" u ON u."id" = m."createdById"
    `,
    Prisma.sql`
      SELECT
        p."id" AS "id",
        COALESCE(p."paidAt", p."updatedAt", p."createdAt") AS "date",
        'MANUAL_PAYMENT'::text AS "origin",
        'INCOME'::text AS "type",
        'Pagos manuales'::text AS "category",
        COALESCE(p."payerName", o."responsibleName", 'Pago manual') AS "description",
        CASE
          WHEN p."amount" <> 0 THEN p."amount"
          ELSE COALESCE(o."total", 0)
        END AS "amount",
        NULL::text AS "receiptNumber",
        CASE
          WHEN p."receiptUrl" IS NOT NULL THEN 'Ver'
          ELSE NULL
        END AS "receiptLabel",
        COALESCE(concat_ws(' ', ru."name", ru."lastName"), o."responsibleName") AS "personName",
        ru."email" AS "personEmail",
        CASE
          WHEN o."responsibleUserId" IS NOT NULL
            THEN '/admin/users/' || o."responsibleUserId" || '/view'
          ELSE NULL
        END AS "personHref"
      FROM "Payment" p
      JOIN "Order" o ON o."id" = p."orderId"
      LEFT JOIN "User" ru ON ru."id" = o."responsibleUserId"
      WHERE p."provider" = 'MANUAL_TRANSFER' AND p."status" = 'APPROVED'
    `,
    Prisma.sql`
      SELECT
        ap."id" AS "id",
        ap."receiptDate" AS "date",
        'MP_PAYMENT'::text AS "origin",
        'INCOME'::text AS "type",
        'Mercado Pago'::text AS "category",
        a."name" AS "description",
        a."price" AS "amount",
        ap."receipt" AS "receiptNumber",
        CASE
          WHEN ap."receipt" IS NOT NULL THEN ap."receipt"
          ELSE NULL
        END AS "receiptLabel",
        CASE
          WHEN c."id" IS NOT NULL THEN concat_ws(' ', c."name", c."lastName")
          ELSE concat_ws(' ', u."name", u."lastName")
        END AS "personName",
        u."email" AS "personEmail",
        CASE
          WHEN c."id" IS NOT NULL
            THEN '/admin/users/' || u."id" || '/children/' || c."id" || '/view'
          ELSE '/admin/users/' || u."id" || '/view'
        END AS "personHref"
      FROM "ActivityParticipant" ap
      JOIN "Activity" a ON a."id" = ap."activityId"
      JOIN "User" u ON u."id" = ap."userId"
      LEFT JOIN "Child" c ON c."id" = ap."childId"
      WHERE ap."receipt" IS NOT NULL
    `,
  ];

  const filters: Prisma.Sql[] = [];
  if (from) filters.push(Prisma.sql`entry."date" >= ${new Date(from)}`);
  if (to) filters.push(Prisma.sql`entry."date" <= ${new Date(to)}`);
  if (type) filters.push(Prisma.sql`entry."type" = ${type}`);
  if (origin) filters.push(Prisma.sql`entry."origin" = ${origin}`);
  if (q) {
    filters.push(
      buildAccountingSimilarityCondition(q, [
        Prisma.sql`entry."description"`,
        Prisma.sql`entry."category"`,
        Prisma.sql`entry."personName"`,
        Prisma.sql`entry."personEmail"`,
        Prisma.sql`entry."receiptNumber"`,
      ])
    );
  }

  const whereSql =
    filters.length > 0 ? Prisma.join(filters, ' AND ') : Prisma.sql`TRUE`;

  const [countRows, historyRows] = await Promise.all([
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*)::int AS "count"
      FROM (
        ${Prisma.join(historyBranches, '\nUNION ALL\n')}
      ) AS entry
      WHERE ${whereSql}
    `,
    prisma.$queryRaw<HistoryRow[]>`
      SELECT *
      FROM (
        ${Prisma.join(historyBranches, '\nUNION ALL\n')}
      ) AS entry
      WHERE ${whereSql}
      ORDER BY entry."date" DESC NULLS LAST, entry."id" DESC
      OFFSET ${offset}
      LIMIT ${PAGE_SIZE}
    `,
  ]);

  const total = countRows[0]?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rows = historyRows.map((entry) => {
    let actionLabel = 'Ver';
    let actionHref = '/accounting';
    let receiptHref: string | null = null;

    if (entry.origin === 'MOVEMENT') {
      actionLabel = 'Editar';
      actionHref = `/accounting/movements/${entry.id}/edit`;
      receiptHref =
        entry.receiptLabel === 'Ver'
          ? buildAccountingMovementReceiptUrl(entry.id)
          : null;
    } else if (entry.origin === 'MANUAL_PAYMENT') {
      actionLabel = 'Revisar';
      actionHref = `/accounting/manual-payments?status=PENDING&q=${encodeURIComponent(
        entry.personName ?? entry.description
      )}`;
      receiptHref =
        entry.receiptLabel === 'Ver'
          ? buildManualPaymentReceiptUrl(entry.id)
          : null;
    } else {
      const searchPerson = entry.personName ?? entry.description;
      actionHref = `/accounting/payments?q=${encodeURIComponent(searchPerson)}&activity=${encodeURIComponent(
        entry.description
      )}`;
    }

    return {
      ...entry,
      actionLabel,
      actionHref,
      receiptHref,
    };
  });

  return (
    <div className="space-y-6">
      <MovementTabs active="history" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Movimientos</h2>
          <p className="text-sm text-muted-foreground">
            Histórico completo de movimientos manuales, pagos manuales aprobados
            y pagos de Mercado Pago.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/accounting/movements/new" prefetch={true}>
              Nuevo movimiento
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link
              href="/accounting/manual-payments?status=PENDING"
              prefetch={true}
            >
              Revisar pagos manuales
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      <form className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Origen</span>
            <select
              name="origin"
              defaultValue={origin}
              className="w-full rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Todos</option>
              <option value="MOVEMENT">Movimientos</option>
              <option value="MANUAL_PAYMENT">Pagos manuales</option>
              <option value="MP_PAYMENT">Pagos MP</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Tipo</span>
            <select
              name="type"
              defaultValue={type}
              className="w-full rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Todos</option>
              <option value="INCOME">Ingreso</option>
              <option value="EXPENSE">Egreso</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Desde</span>
            <input
              type="date"
              name="from"
              defaultValue={from}
              className="w-full rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Hasta</span>
            <input
              type="date"
              name="to"
              defaultValue={to}
              className="w-full rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
          <label className="space-y-1 text-sm md:col-span-2 xl:col-span-1">
            <span className="font-medium">Buscar</span>
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Persona, actividad, email o descripción"
              className="w-full rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
        </div>
        <input type="hidden" name="page" value="1" />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="submit">
            <Search className="mr-2 h-4 w-4" />
            Buscar
          </Button>
          <Button asChild variant="outline">
            <Link href="/accounting/movements" prefetch={true}>
              Limpiar
            </Link>
          </Button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-2xl border bg-card shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="border-b bg-muted/20 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Origen</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Categoría</th>
              <th className="px-4 py-3 font-medium">Descripción</th>
              <th className="px-4 py-3 font-medium">Persona</th>
              <th className="px-4 py-3 font-medium">Monto</th>
              <th className="px-4 py-3 font-medium">Recibo</th>
              <th className="px-4 py-3 font-medium">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  No hay movimientos con esos filtros.
                </td>
              </tr>
            ) : (
              rows.map((entry) => (
                <tr key={`${entry.origin}:${entry.id}`} className="align-top">
                  <td className="px-4 py-3">
                    {entry.date ? formatAccountingDate(entry.date) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    {entry.origin === 'MOVEMENT'
                      ? 'Movimiento manual'
                      : entry.origin === 'MANUAL_PAYMENT'
                        ? 'Pago manual'
                        : 'Mercado Pago'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${movementTypeClass(entry.type)}`}
                    >
                      {movementTypeLabel(entry.type)}
                    </span>
                  </td>
                  <td className="px-4 py-3">{entry.category}</td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">
                        {entry.description}
                      </p>
                      {entry.receiptNumber && entry.origin === 'MOVEMENT' && (
                        <p className="text-xs text-muted-foreground">
                          Recibo: {entry.receiptNumber}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <PersonLink
                      href={entry.personHref}
                      className="text-link hover:underline"
                    >
                      {entry.personName ?? '-'}
                    </PersonLink>
                    {entry.personEmail && (
                      <p className="text-xs text-muted-foreground">
                        {entry.personEmail}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {formatAmount(entry.amount)}
                  </td>
                  <td className="px-4 py-3">
                    {entry.receiptHref ? (
                      <a
                        href={entry.receiptHref}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-link hover:underline"
                      >
                        <ReceiptText className="h-4 w-4" />
                        {entry.receiptLabel ?? 'Ver'}
                      </a>
                    ) : entry.receiptLabel ? (
                      <span className="text-muted-foreground">
                        {entry.receiptLabel}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Button asChild variant="outline" className="px-3 py-2">
                      <Link href={entry.actionHref} prefetch={true}>
                        {entry.actionLabel}
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm text-muted-foreground">
          Página {page} de {totalPages} · {total} movimientos
        </span>
        <div className="flex gap-2">
          {page > 1 ? (
            <Button asChild variant="outline">
              <Link
                href={pageHref({
                  from,
                  to,
                  type,
                  origin,
                  q,
                  page: page - 1,
                })}
                prefetch={true}
              >
                Anterior
              </Link>
            </Button>
          ) : (
            <Button variant="outline" disabled>
              Anterior
            </Button>
          )}
          {page < totalPages ? (
            <Button asChild variant="outline">
              <Link
                href={pageHref({
                  from,
                  to,
                  type,
                  origin,
                  q,
                  page: page + 1,
                })}
                prefetch={true}
              >
                Siguiente
              </Link>
            </Button>
          ) : (
            <Button variant="outline" disabled>
              Siguiente
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
