import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import {
  isAccountingRole,
  formatAmount,
  getAccountingProfessorProfileHref,
  formatPersonName,
} from '@/lib/accounting';
import { Button } from '@/components/ui/button';
import PersonLink from '@/components/accounting/person-link';

export default async function ProfessorsAccountingPage() {
  const session = await getServerSession(authOptions);
  if (!isAccountingRole((session?.user as any)?.role)) redirect('/');

  const professors = await prisma.user.findMany({
    where: { role: 'PROFESSOR', isActive: true },
    orderBy: [{ lastName: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      lastName: true,
      email: true,
      professorProfile: {
        select: {
          monthlySalary: true,
          cbu: true,
          alias: true,
          payments: {
            orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
            take: 1,
            select: {
              periodMonth: true,
              periodYear: true,
              amount: true,
              status: true,
              paidAt: true,
            },
          },
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Profesores</h2>
          <p className="text-sm text-muted-foreground">
            Datos bancarios, sueldos e historial de pagos.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Profesor</th>
              <th className="px-4 py-3 text-right">Sueldo mensual</th>
              <th className="px-4 py-3 text-left">CBU / Alias</th>
              <th className="px-4 py-3 text-left">Último pago</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {professors.map((prof) => {
              const lastPayment = prof.professorProfile?.payments[0];
              return (
                <tr
                  key={prof.id}
                  className="hover:bg-muted/20 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">
                      <PersonLink
                        href={getAccountingProfessorProfileHref(prof.id)}
                        className="text-link hover:underline"
                      >
                        {formatPersonName(prof)}
                      </PersonLink>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {prof.email}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {prof.professorProfile ? (
                      formatAmount(prof.professorProfile.monthlySalary)
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {prof.professorProfile?.cbu ||
                      prof.professorProfile?.alias || (
                        <span className="text-muted-foreground">Sin datos</span>
                      )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {lastPayment
                      ? `${lastPayment.periodMonth.toString().padStart(2, '0')}/${lastPayment.periodYear}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {lastPayment ? (
                      <PaymentStatusBadge status={lastPayment.status} />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Sin pagos
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      asChild
                      variant="outline"
                      className="px-3 py-1 text-xs"
                    >
                      <Link href={`/accounting/professors/${prof.id}`}>
                        Ver
                      </Link>
                    </Button>
                  </td>
                </tr>
              );
            })}
            {professors.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  No hay profesores activos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    PENDING: {
      label: 'Pendiente',
      className: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    },
    PAID: {
      label: 'Pagado',
      className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    },
    CANCELLED: {
      label: 'Cancelado',
      className: 'bg-rose-100 text-rose-700 border-rose-200',
    },
  };
  const config = map[status] ?? map.PENDING;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
