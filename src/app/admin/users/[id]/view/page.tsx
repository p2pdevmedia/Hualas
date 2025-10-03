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

  if (!user) {
    redirect('/admin/users');
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">
          {user.name} {user.lastName}
        </h1>
        <p className="text-sm text-slate-500">
          Detalles del socio y sus participaciones.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3 rounded-3xl border border-white/60 bg-white/70 p-6 shadow-lg shadow-slate-900/5 backdrop-blur">
          <h2 className="text-lg font-semibold text-slate-900">Datos personales</h2>
          <dl className="space-y-2 text-sm text-slate-600">
            <div>
              <dt className="font-semibold text-slate-800">Email</dt>
              <dd>{user.email}</dd>
            </div>
            {user.phone && (
              <div>
                <dt className="font-semibold text-slate-800">Teléfono</dt>
                <dd>{user.phone}</dd>
              </div>
            )}
            {user.observations && (
              <div>
                <dt className="font-semibold text-slate-800">Observaciones</dt>
                <dd>{user.observations}</dd>
              </div>
            )}
            <div>
              <dt className="font-semibold text-slate-800">Rol</dt>
              <dd>{user.role}</dd>
            </div>
          </dl>
        </div>
        <div className="space-y-3 rounded-3xl border border-white/60 bg-white/70 p-6 shadow-lg shadow-slate-900/5 backdrop-blur">
          <h2 className="text-lg font-semibold text-slate-900">Resumen</h2>
          <p className="text-sm text-slate-600">
            {user.activityParticipants.length} actividades registradas y{' '}
            {user.conversations.length} conversaciones activas.
          </p>
        </div>
      </div>

      <div className="space-y-3 rounded-3xl border border-white/60 bg-white/70 p-6 shadow-lg shadow-slate-900/5 backdrop-blur">
        <h2 className="text-lg font-semibold text-slate-900">Actividades</h2>
        {user.activityParticipants.length === 0 ? (
          <p className="text-sm text-slate-500">No hay actividades registradas.</p>
        ) : (
          <ul className="space-y-2 text-sm text-slate-600">
            {user.activityParticipants.map((ap) => (
              <li
                key={ap.id}
                className="flex flex-col gap-1 rounded-2xl bg-white/80 p-4 shadow-inner shadow-white/40"
              >
                <span className="font-semibold text-slate-900">
                  {ap.activity.name}
                </span>
                <span>
                  {ap.activity.date.toLocaleDateString()} • ${ap.activity.price}
                </span>
                {ap.child && <span>Participante: {ap.child.name}</span>}
                {ap.receipt && (
                  <a
                    href={ap.receipt}
                    className="text-sm font-semibold text-emerald-600 transition hover:text-emerald-700"
                  >
                    Ver comprobante
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3 rounded-3xl border border-white/60 bg-white/70 p-6 shadow-lg shadow-slate-900/5 backdrop-blur">
        <h2 className="text-lg font-semibold text-slate-900">Chats</h2>
        {user.conversations.length === 0 ? (
          <p className="text-sm text-slate-500">Sin conversaciones recientes.</p>
        ) : (
          <ul className="space-y-2 text-sm text-slate-600">
            {user.conversations.map((cp) => {
              const conv = cp.conversation;
              const others = conv.participants
                .filter((p) => p.userId !== user.id)
                .map(
                  (p) =>
                    `${p.user.name ?? 'Sin nombre'}${
                      p.user.lastName ? ' ' + p.user.lastName : ''
                    }`
                )
                .join(', ');
              const last = conv.messages[0];
              return (
                <li
                  key={conv.id}
                  className="rounded-2xl bg-white/80 p-4 shadow-inner shadow-white/40"
                >
                  <p className="font-semibold text-slate-900">
                    Con: {others || 'Participante desconocido'}
                  </p>
                  {last && (
                    <p className="text-xs text-slate-500">
                      Último mensaje:{' '}
                      {last.senderId === user.id
                        ? 'Enviado por vos'
                        : `${last.sender?.name ?? 'Sin nombre'}${
                            last.sender?.lastName
                              ? ' ' + last.sender.lastName
                              : ''
                          }`}
                      : {last.body}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div>
        <Link
          href="/admin/users"
          className="inline-flex items-center rounded-full border border-white/60 bg-white/80 px-4 py-2 text-sm font-semibold text-emerald-600 shadow-sm transition hover:border-emerald-400 hover:text-emerald-700"
        >
          ← Volver al listado
        </Link>
      </div>
    </div>
  );
}
