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
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">
          {user.name} {user.lastName}
        </h1>
        <p>Email: {user.email}</p>
        {user.phone && <p>Phone: {user.phone}</p>}
        {user.observations && <p>Observaciones: {user.observations}</p>}
        <p>Role: {user.role}</p>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Activities</h2>
        {user.activityParticipants.length === 0 ? (
          <p>No activities</p>
        ) : (
          <ul className="list-disc pl-4 space-y-1">
            {user.activityParticipants.map((ap) => (
              <li key={ap.id}>
                {ap.activity.name} - {ap.activity.date.toLocaleDateString()} - $
                {ap.activity.price}
                {ap.child && ` - ${ap.child.name}`}
                {ap.receipt && (
                  <a
                    href={ap.receipt}
                    className="text-blue-600 hover:underline ml-2"
                  >
                    Receipt
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Chats</h2>
        {user.conversations.length === 0 ? (
          <p>No chats</p>
        ) : (
          <ul className="list-disc pl-4 space-y-1">
            {user.conversations.map((cp) => {
              const conv = cp.conversation;
              const others = conv.participants
                .filter((p) => p.userId !== user.id)
                .map(
                  (p) =>
                    `${p.user.name ?? 'Unnamed'}${
                      p.user.lastName ? ' ' + p.user.lastName : ''
                    }`
                )
                .join(', ');
              const last = conv.messages[0];
              return (
                <li key={conv.id}>
                  With: {others || 'Unknown'}
                  {last && (
                    <span className="block text-sm text-gray-600">
                      {last.senderId === user.id
                        ? 'You'
                        : `${last.sender?.name ?? 'Unknown'}${
                            last.sender?.lastName
                              ? ' ' + last.sender.lastName
                              : ''
                          }`}
                      : {last.body}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div>
        <Link href="/admin/users" className="text-blue-600 hover:underline">
          Back to users
        </Link>
      </div>
    </div>
  );
}
