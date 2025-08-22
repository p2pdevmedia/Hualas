import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/');
  }

  const notifications = await prisma.mercadoPagoNotification.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Mercado Pago Notifications</h1>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="text-left p-2 border-b">Topic</th>
            <th className="text-left p-2 border-b">Data</th>
            <th className="text-left p-2 border-b">Received</th>
          </tr>
        </thead>
        <tbody>
          {notifications.map((n) => (
            <tr key={n.id}>
              <td className="p-2 border-b align-top">{n.topic}</td>
              <td className="p-2 border-b align-top">
                <pre className="whitespace-pre-wrap break-words text-xs">
                  {JSON.stringify(n.data, null, 2)}
                </pre>
              </td>
              <td className="p-2 border-b align-top">
                {n.createdAt.toISOString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
