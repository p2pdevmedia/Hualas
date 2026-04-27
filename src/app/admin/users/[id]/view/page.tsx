import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
      activityParticipants: { include: { activity: true, child: true } },
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

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 overflow-hidden rounded-full border bg-muted shrink-0">
              {user.profilePhoto ? (
                <img
                  src={`/api/users/${user.id}/photo?v=${user.updatedAt.getTime()}`}
                  alt={`Foto de perfil de ${user.name ?? 'usuario'}`}
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
          <span className="text-xs rounded-full bg-muted px-3 py-1 font-medium">
            {user.role}
          </span>
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
                <div className="flex gap-2">
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
                    className="text-primary hover:text-primary/80 text-xs underline underline-offset-4"
                  >
                    Comprobante
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
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
        className="inline-block text-sm text-primary hover:text-primary/80 underline underline-offset-4"
      >
        ← Volver a usuarios
      </Link>
    </div>
  );
}
