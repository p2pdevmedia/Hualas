import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { PickupNoticeForm } from '@/components/pickup-notice/parent-form';
import { childAccessWhere } from '@/lib/child-access';

export default async function EditPickupNoticePage({
  params,
}: {
  params: Promise<{ noticeId: string }>;
}) {
  const { noticeId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: { role: true },
  });

  if (user?.role !== 'MEMBER') {
    redirect('/profile/pickup-notices');
  }

  const notice = await prisma.pickupNotice.findUnique({
    where: { id: noticeId },
    include: {
      activityDay: {
        include: {
          activity: true,
        },
      },
      child: true,
    },
  });

  if (!notice || notice.createdById !== (session.user as any).id) {
    redirect('/profile/pickup-notices');
  }

  const children = await prisma.child.findMany({
    where: childAccessWhere((session.user as any).id),
    select: {
      id: true,
      name: true,
    },
  });

  const rawUsers = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
    },
  });

  const users = rawUsers.map((u) => ({
    id: u.id,
    name: u.name || '',
  }));

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight mb-2">
          Editar aviso de retiro
        </h1>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>{notice.activityDay.activity.name}</p>
          <p>
            Fecha:{' '}
            {new Date(notice.activityDay.date).toLocaleDateString('es-AR')}
          </p>
          <p>Hijo: {notice.child.name}</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <PickupNoticeForm
          activityDayId={notice.activityDayId}
          childrenList={children}
          users={users}
          existingNotice={{
            id: notice.id,
            childId: notice.childId,
            alternatePersonUserId: notice.alternatePersonUserId,
            alternatePersonName: notice.alternatePersonName,
            description: notice.description,
          }}
          onSuccess={() => {
            window.location.href = '/profile/pickup-notices';
          }}
        />
      </div>

      <div className="flex gap-2">
        <Link href="/profile/pickup-notices">
          <Button variant="outline">Cancelar</Button>
        </Link>
      </div>
    </div>
  );
}
