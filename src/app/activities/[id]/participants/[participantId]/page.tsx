import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getAccessibleChildrenWhere } from '@/lib/family-access';
import { canProfessorAccessParticipant } from '@/lib/professor-access';

export default async function ActivityParticipantFamilyPage({
  params,
}: {
  params: { id: string; participantId: string };
}) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  const canAccess =
    role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'PROFESSOR';

  if (!session?.user?.id || !canAccess) {
    redirect('/login');
  }

  const participant = await prisma.activityParticipant.findUnique({
    where: { id: params.participantId },
    include: {
      activity: { select: { id: true, name: true } },
      user: {
        select: {
          id: true,
          name: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
      child: {
        select: {
          id: true,
          name: true,
          lastName: true,
          birthDate: true,
        },
      },
    },
  });

  const familyChildren = participant
    ? await prisma.child.findMany({
        where: await getAccessibleChildrenWhere(participant.userId),
        orderBy: [{ name: 'asc' }, { lastName: 'asc' }],
        select: { id: true, name: true, lastName: true, birthDate: true },
      })
    : [];

  if (!participant || participant.activityId !== params.id) {
    redirect(`/activities/${params.id}`);
  }

  if (role === 'PROFESSOR') {
    const hasAccess = await canProfessorAccessParticipant(
      session.user.id,
      participant.id
    );

    if (!hasAccess) redirect('/');
  }

  const fullName =
    `${participant.user.name ?? ''} ${participant.user.lastName ?? ''}`.trim() ||
    'Sin nombre';
  const participantName = participant.child
    ? `${participant.child.name}${participant.child.lastName ? ` ${participant.child.lastName}` : ''}`
    : fullName;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <nav className="text-xs text-muted-foreground font-body flex items-center gap-1">
        <Link
          href="/my-activities"
          className="hover:text-primary transition-colors"
        >
          Mis actividades
        </Link>
        <span>→</span>
        <Link
          href={`/activities/${params.id}`}
          className="hover:text-primary transition-colors"
        >
          {participant.activity.name}
        </Link>
        <span>→</span>
        <span className="text-foreground">Grupo familiar</span>
      </nav>

      <section className="rounded-xl border bg-card p-6 shadow-sm space-y-3">
        <h1 className="text-2xl font-semibold">
          Grupo familiar de {participantName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Información de contacto del responsable y de la familia asociada.
        </p>
      </section>

      <section className="rounded-xl border bg-card p-6 shadow-sm space-y-2 text-sm">
        <h2 className="text-lg font-semibold">Responsable</h2>
        <p>
          <span className="text-muted-foreground">Nombre:</span> {fullName}
        </p>
        <p>
          <span className="text-muted-foreground">Email:</span>{' '}
          {participant.user.email}
        </p>
        <p>
          <span className="text-muted-foreground">Teléfono:</span>{' '}
          {participant.user.phone || 'Sin teléfono'}
        </p>
      </section>

      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Familia asociada</h2>
        {familyChildren.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No hay integrantes asociados a este grupo familiar.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {familyChildren.map((child) => (
              <li key={child.id} className="rounded-lg border p-3 text-sm">
                <p className="font-medium">
                  {child.name} {child.lastName ?? ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
