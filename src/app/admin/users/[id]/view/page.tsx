import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { formatAccountingDate, formatAmount } from '@/lib/accounting';
import { getManualPaymentRawData } from '@/lib/manual-payments';
import { formatManualPaymentStatus } from '@/lib/manual-payment-ui';
import DeleteChildButton from './delete-child-button';

const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

function formatPeriod(month: number, year: number) {
  return `${MONTHS[month - 1]} ${year}`;
}

function formatPersonName(
  person:
    | {
        name?: string | null;
        lastName?: string | null;
      }
    | null
    | undefined
) {
  if (!person) return 'Sin nombre';
  return `${person.name ?? ''} ${person.lastName ?? ''}`.trim() || 'Sin nombre';
}

export default async function ViewUserPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')
  ) {
    redirect('/');
  }

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      children: {
        orderBy: { createdAt: 'asc' },
      },
      professorProfile: {
        include: {
          payments: {
            orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
            take: 3,
          },
        },
      },
      activityParticipants: {
        include: { activity: true, child: true, user: true },
      },
      conversations: {
        include: {
          conversation: {
            include: {
              participants: { include: { user: true } },
              messages: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                include: { sender: true },
              },
            },
          },
        },
      },
    },
  });

  if (!user) redirect('/admin/users');

  const manualPayments = await prisma.payment.findMany({
    where: {
      provider: 'MANUAL_TRANSFER',
      order: {
        responsibleUserId: user.id,
      },
    },
    orderBy: [{ createdAt: 'desc' }],
    include: {
      order: {
        select: {
          items: {
            select: {
              description: true,
              billableConcept: {
                select: {
                  code: true,
                },
              },
              activity: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const socialFeePayments = await prisma.socialFeePayment.findMany({
    where: {
      userId: user.id,
    },
    orderBy: [{ createdAt: 'desc' }],
    include: {
      child: {
        select: {
          name: true,
          lastName: true,
        },
      },
    },
  });

  const activityPayments = user.activityParticipants
    .filter((payment) => payment.receipt)
    .sort(
      (a, b) =>
        (b.receiptDate?.getTime() ?? b.activity.date.getTime()) -
        (a.receiptDate?.getTime() ?? a.activity.date.getTime())
    );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 overflow-hidden rounded-full border bg-muted shrink-0">
              {user.profilePhoto ? (
                <Image
                  src={`/api/users/${user.id}/photo?v=${user.updatedAt.getTime()}`}
                  alt={`Foto de perfil de ${user.name ?? 'usuario'}`}
                  width={56}
                  height={56}
                  unoptimized
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-muted-foreground">
                  {(user.name?.[0] ?? '?').toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {user.name} {user.lastName}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="text-xs rounded-full bg-muted px-3 py-1 font-medium">
              {user.role}
            </span>
            <Button asChild variant="outline" className="h-9 px-4">
              <Link href={`/admin/users/${user.id}`}>Editar usuario</Link>
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm border-t border-border pt-3">
          {user.phone && (
            <p>
              <span className="font-medium">Teléfono:</span> {user.phone}
            </p>
          )}
          {user.observations && (
            <p className="col-span-2">
              <span className="font-medium">Observaciones:</span>{' '}
              {user.observations}
            </p>
          )}
        </div>
        {[
          user.allergies,
          user.regularMedication,
          user.relevantDiseases,
          user.previousInjuries,
          user.physicalRestrictions,
          user.bloodGroup,
          user.primaryDoctor,
          user.doctorPhone,
        ].some(Boolean) && (
          <div className="border-t border-border pt-3">
            <p className="text-sm font-semibold mb-2">Ficha médica</p>
            <div className="grid gap-2 rounded-lg border bg-muted/20 p-3 text-xs sm:grid-cols-2">
              {[
                ['Alergias', user.allergies],
                ['Medicación habitual', user.regularMedication],
                ['Enfermedades relevantes', user.relevantDiseases],
                ['Lesiones previas', user.previousInjuries],
                ['Restricciones físicas', user.physicalRestrictions],
                ['Grupo sanguíneo', user.bloodGroup],
                ['Médico de cabecera', user.primaryDoctor],
                ['Teléfono médico', user.doctorPhone],
              ]
                .filter(([, value]) => Boolean(value))
                .map(([label, value]) => (
                  <div key={label}>
                    <span className="font-medium text-foreground">
                      {label}:
                    </span>{' '}
                    <span className="text-muted-foreground">
                      {value as string}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {user.role === 'PROFESSOR' && (
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                Datos de profesor
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Información bancaria, sueldo y pagos registrados.
              </p>
            </div>
            <Button asChild variant="outline" className="h-9 px-4">
              <Link href={`/accounting/professors/${user.id}`}>
                Editar datos
              </Link>
            </Button>
          </div>

          {user.professorProfile ? (
            <div className="grid gap-3 rounded-lg border bg-muted/20 p-4 text-sm sm:grid-cols-2">
              <div>
                <span className="font-medium text-foreground">Sueldo:</span>{' '}
                <span className="text-muted-foreground">
                  {formatAmount(user.professorProfile.monthlySalary)}
                </span>
              </div>
              <div>
                <span className="font-medium text-foreground">Banco:</span>{' '}
                <span className="text-muted-foreground">
                  {user.professorProfile.bankName ?? 'Sin dato'}
                </span>
              </div>
              <div>
                <span className="font-medium text-foreground">CBU:</span>{' '}
                <span className="font-mono text-muted-foreground">
                  {user.professorProfile.cbu ?? 'Sin dato'}
                </span>
              </div>
              <div>
                <span className="font-medium text-foreground">Alias:</span>{' '}
                <span className="font-mono text-muted-foreground">
                  {user.professorProfile.alias ?? 'Sin dato'}
                </span>
              </div>
              <div>
                <span className="font-medium text-foreground">CUIT:</span>{' '}
                <span className="font-mono text-muted-foreground">
                  {user.professorProfile.cuit ?? 'Sin dato'}
                </span>
              </div>
              <div className="sm:col-span-2">
                <span className="font-medium text-foreground">Notas:</span>{' '}
                <span className="text-muted-foreground">
                  {user.professorProfile.notes ?? 'Sin notas'}
                </span>
              </div>
              <div className="sm:col-span-2 border-t border-border pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Últimos pagos
                </p>
                <div className="mt-2 space-y-2">
                  {user.professorProfile.payments.length > 0 ? (
                    user.professorProfile.payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between gap-3 rounded-md bg-background px-3 py-2"
                      >
                        <span>
                          {payment.periodMonth.toString().padStart(2, '0')}/
                          {payment.periodYear}
                        </span>
                        <span className="font-medium">
                          {formatAmount(payment.amount)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Sin pagos registrados.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Todavía no tiene un perfil de profesor cargado.
            </p>
          )}
        </div>
      )}

      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Hijos</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {user.children.length > 0
                ? `${user.children.length} hijo${user.children.length === 1 ? '' : 's'} registrado${user.children.length === 1 ? '' : 's'}`
                : 'Sin hijos registrados.'}
            </p>
          </div>
          <Link
            href={`/admin/users/${user.id}/child-enrollment`}
            className="inline-flex h-9 items-center justify-center rounded-full border border-primary px-4 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
          >
            Agregar hijo
          </Link>
        </div>

        {user.children.length > 0 && (
          <ul className="divide-y divide-border">
            {user.children.map((child) => (
              <li
                key={child.id}
                className="py-3 flex items-start justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="font-medium">
                    {child.name} {child.lastName}
                  </div>
                  <div className="text-sm text-muted-foreground space-x-2">
                    {child.documentType && child.documentNumber && (
                      <span>
                        {child.documentType} {child.documentNumber}
                      </span>
                    )}
                    {child.documentFrontPhoto && child.documentBackPhoto && (
                      <span>· DNI con frente y dorso cargados</span>
                    )}
                    {child.birthDate && (
                      <span>
                        · {child.birthDate.toLocaleDateString('es-AR')}
                      </span>
                    )}
                  </div>
                  {child.address && (
                    <p className="text-sm text-muted-foreground">
                      {child.address}
                    </p>
                  )}
                  {[
                    child.allergies,
                    child.regularMedication,
                    child.relevantDiseases,
                    child.previousInjuries,
                    child.physicalRestrictions,
                    child.bloodGroup,
                    child.primaryDoctor,
                    child.doctorPhone,
                    child.observations,
                  ].some(Boolean) && (
                    <div className="grid gap-2 rounded-lg border bg-muted/20 p-3 text-xs sm:grid-cols-2">
                      {[
                        ['Alergias', child.allergies],
                        ['Medicación habitual', child.regularMedication],
                        ['Enfermedades relevantes', child.relevantDiseases],
                        ['Lesiones previas', child.previousInjuries],
                        ['Restricciones físicas', child.physicalRestrictions],
                        ['Grupo sanguíneo', child.bloodGroup],
                        ['Médico de cabecera', child.primaryDoctor],
                        ['Teléfono médico', child.doctorPhone],
                        ['Observaciones', child.observations],
                      ]
                        .filter(([, value]) => Boolean(value))
                        .map(([label, value]) => (
                          <div key={label}>
                            <span className="font-medium text-foreground">
                              {label}:
                            </span>{' '}
                            <span className="text-muted-foreground">
                              {value as string}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Link
                    href={`/admin/users/${user.id}/children/${child.id}/view`}
                    className="inline-flex h-9 items-center justify-center rounded-full border border-border px-4 text-sm font-medium hover:bg-muted transition-colors shrink-0"
                  >
                    Ver
                  </Link>
                  <Link
                    href={`/admin/users/${user.id}/children/${child.id}/edit`}
                    className="inline-flex h-9 items-center justify-center rounded-full border border-primary px-4 text-sm font-medium text-primary hover:bg-primary/5 transition-colors shrink-0"
                  >
                    Editar
                  </Link>
                  <DeleteChildButton
                    userId={user.id}
                    childId={child.id}
                    childName={`${child.name} ${child.lastName ?? ''}`.trim()}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Actividades</h2>
        {user.activityParticipants.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin actividades.</p>
        ) : (
          <ul className="divide-y divide-border">
            {user.activityParticipants.map((ap) => (
              <li
                key={ap.id}
                className="py-2 text-sm flex items-center justify-between"
              >
                <span>
                  <span className="font-medium">{ap.activity.name}</span>
                  <span className="text-muted-foreground ml-2">
                    {ap.activity.date.toLocaleDateString()} · $
                    {ap.activity.price}
                    {ap.child && ` · ${ap.child.name}`}
                  </span>
                </span>
                {ap.receipt && (
                  <a
                    href={ap.receipt}
                    className="text-link hover:text-link/80 text-xs underline underline-offset-4"
                  >
                    Comprobante
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">
            Historial de pagos
          </h2>
          <p className="text-sm text-muted-foreground">
            Pagos de actividades, transferencias manuales y cuota social
            asociados a este usuario.
          </p>
        </div>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Pagos de actividades
          </h3>

          {activityPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin pagos de actividades registrados.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="min-w-full text-sm">
                <thead className="border-b bg-muted/20 text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Actividad</th>
                    <th className="px-4 py-3 font-medium">Participante</th>
                    <th className="px-4 py-3 font-medium">Comprobante</th>
                    <th className="px-4 py-3 font-medium text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {activityPayments.map((payment) => {
                    const participant = payment.child ?? payment.user;
                    const participantName = formatPersonName(participant);

                    return (
                      <tr key={payment.id}>
                        <td className="px-4 py-3 text-muted-foreground">
                          {payment.receiptDate
                            ? formatAccountingDate(payment.receiptDate)
                            : '—'}
                        </td>
                        <td className="px-4 py-3">{payment.activity.name}</td>
                        <td className="px-4 py-3">
                          {participantName || 'Sin nombre'}
                        </td>
                        <td className="px-4 py-3">{payment.receipt ?? '—'}</td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatAmount(payment.activity.price * 100)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Transferencias manuales
          </h3>

          {manualPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin transferencias manuales registradas.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="min-w-full text-sm">
                <thead className="border-b bg-muted/20 text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Actividad</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Comentario</th>
                    <th className="px-4 py-3 font-medium text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {manualPayments.map((payment) => {
                    const rawData = getManualPaymentRawData(payment.rawData);
                    const status = formatManualPaymentStatus(payment.status);
                    const activityNames = payment.order.items
                      .filter(
                        (item) => item.billableConcept.code === 'ACTIVITY_FEE'
                      )
                      .map((item) => item.activity?.name ?? item.description)
                      .filter((name): name is string => Boolean(name));
                    const detail = [
                      activityNames.length > 0
                        ? activityNames.join(', ')
                        : null,
                      rawData.socialFeeAmount ? 'Cuota social' : null,
                    ]
                      .filter(Boolean)
                      .join(' · ');

                    return (
                      <tr key={payment.id}>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatAccountingDate(
                            payment.paidAt ??
                              payment.updatedAt ??
                              payment.createdAt
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {detail || 'Sin actividad'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${status.className}`}
                          >
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {rawData.accountantComments ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatAmount(payment.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Cuota social
          </h3>

          {socialFeePayments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin pagos de cuota social registrados.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="min-w-full text-sm">
                <thead className="border-b bg-muted/20 text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Período</th>
                    <th className="px-4 py-3 font-medium">Beneficiario</th>
                    <th className="px-4 py-3 font-medium">MP</th>
                    <th className="px-4 py-3 font-medium text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {socialFeePayments.map((payment) => {
                    const beneficiary = payment.child
                      ? formatPersonName(payment.child)
                      : formatPersonName(user);

                    return (
                      <tr key={payment.id}>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatAccountingDate(payment.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          {formatPeriod(
                            payment.periodMonth,
                            payment.periodYear
                          )}
                        </td>
                        <td className="px-4 py-3">{beneficiary}</td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {payment.mercadoPagoPaymentId}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatAmount(payment.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Mensajes</h2>
        {user.conversations.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin mensajes.</p>
        ) : (
          <ul className="divide-y divide-border">
            {user.conversations.map((cp) => {
              const conv = cp.conversation;
              const others = conv.participants
                .filter((p) => p.userId !== user.id)
                .map(
                  (p) =>
                    `${p.user.name ?? 'Sin nombre'}${p.user.lastName ? ' ' + p.user.lastName : ''}`
                )
                .join(', ');
              const last = conv.messages[0];
              return (
                <li key={conv.id} className="py-2 text-sm">
                  <span className="font-medium">{others || 'Desconocido'}</span>
                  {last && (
                    <span className="block text-muted-foreground text-xs mt-0.5">
                      {last.senderId === user.id
                        ? 'Vos'
                        : `${last.sender?.name ?? 'Unknown'}${last.sender?.lastName ? ' ' + last.sender.lastName : ''}`}
                      : {last.body}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Link
        href="/admin/users"
        className="inline-block text-sm text-link hover:text-link/80 underline underline-offset-4"
      >
        ← Volver a usuarios
      </Link>
    </div>
  );
}
