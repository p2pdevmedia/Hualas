import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { gateActiveRole } from '@/lib/role-guards';
import { childAccessWhere } from '@/lib/child-access';
import FamilyGuardianForm from './family-guardian-form';

export default async function ChildrenPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login');
  }
  const gate = gateActiveRole(session, 'MEMBER');
  if (gate) return gate;

  const userId = (session.user as any).id;
  const children = await prisma.child.findMany({
    where: childAccessWhere(userId),
    include: {
      user: { select: { id: true, name: true, lastName: true, email: true } },
      guardians: {
        include: {
          user: {
            select: { id: true, name: true, lastName: true, email: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const ownedChildren = children.filter((child) => child.userId === userId);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Familia</h1>
        {children.length > 0 && (
          <Link
            href="/profile/children/new"
            className="inline-flex h-9 items-center justify-center rounded-full border border-primary px-4 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
          >
            Agregar hijo/a
          </Link>
        )}
      </div>

      {children.length === 0 ? (
        <div className="rounded-xl border bg-card p-6 shadow-sm text-center">
          <p className="text-sm text-muted-foreground">
            No tenés familia registrada.
          </p>
          <Link
            href="/profile/children/new"
            className="inline-flex mt-4 h-9 items-center justify-center rounded-full border border-primary px-4 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
          >
            Agregar hijo/a
          </Link>
        </div>
      ) : (
        <>
          {ownedChildren.length > 0 && (
            <FamilyGuardianForm
              childrenOptions={ownedChildren.map((child) => ({
                id: child.id,
                label: `${child.name}${child.lastName ? ` ${child.lastName}` : ''}`,
              }))}
            />
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {children.map((child) => (
              <div
                key={child.id}
                className="rounded-xl border bg-card p-4 shadow-sm space-y-3"
              >
                {/* Child Info */}
                <div className="space-y-2">
                  <h2 className="font-semibold">
                    {child.name} {child.lastName}
                  </h2>
                  {child.birthDate && (
                    <p className="text-xs text-muted-foreground">
                      {new Date().getFullYear() - child.birthDate.getFullYear()}{' '}
                      años
                    </p>
                  )}
                  {child.userId !== userId && (
                    <p className="text-xs text-muted-foreground">
                      Vinculado por {child.user.name ?? child.user.email}
                    </p>
                  )}
                </div>
                {child.guardians.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {child.guardians.map((guardian) => (
                      <span
                        key={guardian.id}
                        className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                      >
                        {guardian.relationship === 'MOTHER'
                          ? 'Madre'
                          : guardian.relationship === 'FATHER'
                            ? 'Padre'
                            : 'Tutor/a'}
                        : {guardian.user.name ?? guardian.user.email}
                      </span>
                    ))}
                  </div>
                )}

                {/* Health Highlights */}
                <div className="bg-muted/30 rounded-lg p-3 space-y-1 text-xs">
                  {child.bloodGroup && (
                    <p className="text-muted-foreground">
                      <span className="font-medium">Grupo sanguíneo:</span>{' '}
                      {child.bloodGroup}
                    </p>
                  )}
                  {child.allergies && (
                    <p className="text-muted-foreground">
                      <span className="font-medium">Alergias:</span>{' '}
                      {child.allergies.substring(0, 50)}
                      {child.allergies.length > 50 ? '...' : ''}
                    </p>
                  )}
                  {child.primaryDoctor && (
                    <p className="text-muted-foreground">
                      <span className="font-medium">Médico:</span>{' '}
                      {child.primaryDoctor}
                    </p>
                  )}
                </div>

                {/* Buttons */}
                <div className="flex gap-2 pt-2">
                  <Link
                    href={`/profile/children/${child.id}`}
                    className="flex-1 inline-flex h-8 items-center justify-center rounded-full border border-border px-3 text-xs font-medium hover:bg-muted transition-colors"
                  >
                    Ver
                  </Link>
                  <Link
                    href={`/profile/children/${child.id}/edit`}
                    className="flex-1 inline-flex h-8 items-center justify-center rounded-full border border-primary px-3 text-xs font-medium text-primary hover:bg-primary/5 transition-colors"
                  >
                    Editar
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Link
        href="/profile"
        className="inline-block text-sm text-link hover:text-link/80 underline underline-offset-4"
      >
        ← Volver al perfil
      </Link>
    </div>
  );
}
