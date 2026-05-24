import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { gateActiveRole } from '@/lib/role-guards';
import GroupEditForm from './form';

export default async function EditActivityGroupPage({
  params,
}: {
  params: { id: string; groupId: string };
}) {
  const session = await getServerSession(authOptions);
  const block = gateActiveRole(session, ['ADMIN', 'PROFESSOR']);
  if (block) return block;

  const [activity, group] = await Promise.all([
    prisma.activity.findUnique({
      where: { id: params.id },
      select: { id: true, name: true },
    }),
    prisma.activityGroup.findFirst({
      where: { id: params.groupId, activityId: params.id },
      select: {
        id: true,
        name: true,
        description: true,
        capacity: true,
        minAge: true,
        maxAge: true,
        professors: { select: { userId: true } },
      },
    }),
  ]);

  if (!activity || !group) {
    redirect(`/activities/${params.id}`);
  }

  const isAdmin = session!.user.role === 'ADMIN';
  const canManageGroup =
    isAdmin ||
    group.professors.some(
      (assignment) => assignment.userId === session!.user.id
    );

  if (!canManageGroup) {
    redirect(`/activities/${params.id}`);
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {activity.name}
          </p>
          <h1 className="font-heading text-3xl font-semibold">Editar grupo</h1>
        </div>
        <Link
          href={`/activities/${params.id}/groups/${params.groupId}`}
          prefetch={true}
          className="inline-flex items-center justify-center rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          ← Volver
        </Link>
      </div>

      <section className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <GroupEditForm activityId={params.id} group={group} />
      </section>
    </main>
  );
}
