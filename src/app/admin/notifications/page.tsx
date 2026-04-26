import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    redirect('/');
  }

  const notifications = await prisma.mercadoPagoNotification.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Notificaciones</h1>
      {notifications.length === 0 && (
        <p className="text-sm text-muted-foreground">No hay notificaciones.</p>
      )}
      <ul className="space-y-3">
        {notifications.map((n) => (
          <li
            key={n.id}
            className="rounded-xl border bg-card p-4 shadow-sm space-y-2"
          >
            <p className="text-sm font-medium text-muted-foreground">
              {n.topic}
            </p>
            <pre className="overflow-x-auto text-xs bg-muted p-3 rounded-md">
              {JSON.stringify(n.data, null, 2)}
            </pre>
            <p className="text-xs text-muted-foreground">
              {n.createdAt.toISOString()}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
