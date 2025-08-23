import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')
  ) {
    redirect('/');
  }

  const notifications = await prisma.mercadoPagoNotification.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Notificaciones</h1>
      <ul className="space-y-2">
        {notifications.map((n) => (
          <li key={n.id} className="border p-2 rounded">
            <p className="text-sm text-gray-600">{n.topic}</p>
            <pre className="overflow-x-auto text-xs bg-gray-100 p-2 rounded">
              {JSON.stringify(n.data, null, 2)}
            </pre>
            <p className="text-xs text-gray-500">{n.createdAt.toISOString()}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
