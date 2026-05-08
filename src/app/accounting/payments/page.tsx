import Link from 'next/link';
import { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  formatAccountingDate,
  formatAmount,
  getAccountingChildProfileHref,
  getAccountingUserProfileHref,
  formatPersonName,
  isAccountingRole,
} from '@/lib/accounting';
import { Button } from '@/components/ui/button';
import { ArrowRight, Search } from 'lucide-react';
import PersonLink from '@/components/accounting/person-link';
import { buildAccountingSimilarityCondition } from '@/lib/accounting-search';

const PAGE_SIZE = 20;

type SearchParams = {
  from?: string;
  to?: string;
  activity?: string;
  q?: string;
  page?: string;
};

type PaymentIdRow = {
  id: string;
};

type CountRow = {
  count: number;
};

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  // Auth gating happens in the parent /accounting layout.
  await getServerSession(authOptions);

  const from = searchParams.from ?? '';
  const to = searchParams.to ?? '';
  const activity = searchParams.activity ?? '';
  const q = searchParams.q?.trim() ?? '';
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10));

  const filters: Prisma.Sql[] = [Prisma.sql`ap."receipt" IS NOT NULL`];
  if (from || to) {
    if (from) filters.push(Prisma.sql`ap."receiptDate" >= ${new Date(from)}`);
    if (to) filters.push(Prisma.sql`ap."receiptDate" <= ${new Date(to)}`);
  }
  if (activity) {
    filters.push(
      buildAccountingSimilarityCondition(activity, [Prisma.sql`a."name"`])
    );
  }
  if (q) {
    filters.push(
      buildAccountingSimilarityCondition(q, [
        Prisma.sql`a."name"`,
        Prisma.sql`u."name"`,
        Prisma.sql`u."lastName"`,
        Prisma.sql`concat_ws(' ', u."name", u."lastName")`,
        Prisma.sql`u."email"`,
        Prisma.sql`c."name"`,
        Prisma.sql`c."lastName"`,
        Prisma.sql`concat_ws(' ', c."name", c."lastName")`,
      ])
    );
  }

  const [paymentIdRows, countRows] = await Promise.all([
    prisma.$queryRaw<PaymentIdRow[]>`
      SELECT ap."id"
      FROM "ActivityParticipant" ap
      JOIN "Activity" a ON a."id" = ap."activityId"
      JOIN "User" u ON u."id" = ap."userId"
      LEFT JOIN "Child" c ON c."id" = ap."childId"
      WHERE ${Prisma.join(filters, ' AND ')}
      ORDER BY ap."receiptDate" DESC NULLS LAST
      OFFSET ${(page - 1) * PAGE_SIZE}
      LIMIT ${PAGE_SIZE}
    `,
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(DISTINCT ap."id")::int AS "count"
      FROM "ActivityParticipant" ap
      JOIN "Activity" a ON a."id" = ap."activityId"
      JOIN "User" u ON u."id" = ap."userId"
      LEFT JOIN "Child" c ON c."id" = ap."childId"
      WHERE ${Prisma.join(filters, ' AND ')}
    `,
  ]);
  const paymentIds = paymentIdRows.map((row) => row.id);
  const paymentOrder = new Map(paymentIds.map((id, index) => [id, index]));
  const payments =
    paymentIds.length > 0
      ? (
          await prisma.activityParticipant.findMany({
            where: { id: { in: paymentIds } },
            include: {
              activity: { select: { name: true, price: true } },
              user: { select: { id: true, name: true, lastName: true } },
              child: {
                select: { id: true, userId: true, name: true, lastName: true },
              },
            },
          })
        ).sort(
          (left, right) =>
            (paymentOrder.get(left.id) ?? 0) - (paymentOrder.get(right.id) ?? 0)
        )
      : [];
  const total = countRows[0]?.count ?? 0;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (activity) params.set('activity', activity);
    if (q) params.set('q', q);
    params.set('page', String(p));
    return `/accounting/payments?${params.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Pagos MP</h2>
          <p className="text-sm text-muted-foreground">
            Registro de participantes con recibo aprobado.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/accounting/reports" prefetch={true}>
            Ir a reportes
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <form className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-5">
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
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="font-medium">Actividad</span>
            <input
              type="text"
              name="activity"
              defaultValue={activity}
              placeholder="Nombre de actividad"
              className="w-full rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="font-medium">Buscar</span>
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Nombre, apellido, actividad o mail"
              className="w-full rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="submit">
            <Search className="mr-2 h-4 w-4" />
            Buscar
          </Button>
          <Button asChild variant="outline">
            <Link href="/accounting/payments" prefetch={true}>
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
              <th className="px-4 py-3 font-medium">Actividad</th>
              <th className="px-4 py-3 font-medium">Participante</th>
              <th className="px-4 py-3 font-medium">Monto</th>
              <th className="px-4 py-3 font-medium">Nro. recibo</th>
              <th className="px-4 py-3 font-medium">Comprobante</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {payments.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  No hay pagos con esos filtros.
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment.id} className="align-top">
                  <td className="px-4 py-3">
                    {payment.receiptDate
                      ? formatAccountingDate(payment.receiptDate)
                      : '-'}
                  </td>
                  <td className="px-4 py-3">{payment.activity.name}</td>
                  <td className="px-4 py-3">
                    <PersonLink
                      href={
                        payment.child
                          ? getAccountingChildProfileHref(
                              payment.user.id,
                              payment.child.id
                            )
                          : getAccountingUserProfileHref(payment.user.id)
                      }
                      className="text-link hover:underline"
                    >
                      {formatPersonName(payment.child ?? payment.user)}
                    </PersonLink>
                  </td>
                  <td className="px-4 py-3">
                    {formatAmount(payment.activity.price)}
                  </td>
                  <td className="px-4 py-3">{payment.receipt ?? '-'}</td>
                  <td className="px-4 py-3">
                    {payment.receipt ? (
                      <span className="text-xs text-success">Registrado</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Página {page} de {totalPages} · {total} pagos
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Button asChild variant="outline">
                <Link href={pageHref(page - 1)} prefetch={true}>
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
                <Link href={pageHref(page + 1)} prefetch={true}>
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
      )}
    </div>
  );
}
