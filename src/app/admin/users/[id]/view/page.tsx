import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function ViewUserPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
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
              messages: { orderBy: { createdAt: 'desc' }, take: 1, include: { sender: true } },
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
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{user.name} {user.lastName}</h1>
            <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
          </div>
          <span className="text-xs rounded-full bg-muted px-3 py-1 font-medium">{user.role}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm border-t border-border pt-3">
          {user.phone && <p><span className="font-medium">Teléfono:</span> {user.phone}</p>}
          {user.observations && <p className="col-span-2"><span className="font-medium">Observaciones:</span> {user.observations}</p>}
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Actividades</h2>
        {user.activityParticipants.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin actividades.</p>
        ) : (
          <ul className="divide-y divide-border">
            {user.activityParticipants.map((ap) => (
              <li key={ap.id} className="py-2 text-sm flex items-center justify-between">
                <span>
                  <span className="font-medium">{ap.activity.name}</span>
                  <span className="text-muted-foreground ml-2">
                    {ap.activity.date.toLocaleDateString()} · ${ap.activity.price}
                    {ap.child && ` · ${ap.child.name}`}
                  </span>
                </span>
                {ap.receipt && (
                  <a href={ap.receipt} className="text-primary hover:text-primary/80 text-xs underline underline-offset-4">
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
                .map((p) => `${p.user.name ?? 'Sin nombre'}${p.user.lastName ? ' ' + p.user.lastName : ''}`)
                .join(', ');
              const last = conv.messages[0];
              return (
                <li key={conv.id} className="py-2 text-sm">
                  <span className="font-medium">{others || 'Desconocido'}</span>
                  {last && (
                    <span className="block text-muted-foreground text-xs mt-0.5">
                      {last.senderId === user.id ? 'Vos' : `${last.sender?.name ?? 'Unknown'}${last.sender?.lastName ? ' ' + last.sender.lastName : ''}`}: {last.body}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Link href="/admin/users" className="inline-block text-sm text-primary hover:text-primary/80 underline underline-offset-4">
        ← Volver a usuarios
      </Link>
    </div>
  );
}
