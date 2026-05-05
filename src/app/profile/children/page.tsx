import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { gateActiveRole } from '@/lib/role-guards';
import { getAccessibleChildrenWhere } from '@/lib/family-access';
import { familyGroupService } from '@/lib/services/family-group-service';
import FamilyMemberForm from './family-member-form';

export default async function ChildrenPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login');
  }
  const gate = gateActiveRole(session, 'MEMBER');
  if (gate) return gate;

  const userId = (session.user as any).id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      lastName: true,
      email: true,
      phone: true,
    },
  });

  if (!user) {
    redirect('/login');
  }

  let familyGroups = await familyGroupService.getFamilyGroupsForUser(userId);
  const ownedChildrenCount = await prisma.child.count({
    where: { userId },
  });

  let responsibleFamilyGroup = familyGroups.find(
    (group) => group.responsibleUserId === userId
  );

  if (!responsibleFamilyGroup && ownedChildrenCount > 0) {
    responsibleFamilyGroup =
      await familyGroupService.getOrCreateFamilyGroupByResponsible(user);
    familyGroups = await familyGroupService.getFamilyGroupsForUser(userId);
  }

  const activeFamilyGroup =
    responsibleFamilyGroup ?? familyGroups[0] ?? null;
  const children = await prisma.child.findMany({
    where: await getAccessibleChildrenWhere(userId),
    include: {
      user: { select: { id: true, name: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const familyMembers = activeFamilyGroup?.members.map((member) => member.member) ?? [];
  const isResponsible = activeFamilyGroup?.responsibleUserId === userId;

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

      {familyGroups.length > 1 && (
        <div className="rounded-xl border bg-card p-4 shadow-sm space-y-2">
          <h2 className="text-sm font-semibold tracking-tight">
            Otros grupos familiares
          </h2>
          <div className="flex flex-wrap gap-2 text-xs">
            {familyGroups
              .filter((group) => group.id !== activeFamilyGroup?.id)
              .map((group) => (
                <span
                  key={group.id}
                  className="rounded-full bg-muted px-3 py-1 text-muted-foreground"
                >
                  {group.name}
                </span>
              ))}
          </div>
        </div>
      )}

      {activeFamilyGroup && (
        <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                Grupo familiar
              </h2>
              <p className="text-sm text-muted-foreground">
                {isResponsible
                  ? 'Sumá otro adulto para que vea todos los hijos de la familia.'
                  : 'Este es el grupo familiar al que estás vinculado.'}
              </p>
            </div>
          </div>

          {familyMembers.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {familyMembers.map((member) => (
                <span
                  key={member.id}
                  className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
                >
                  {member.name ?? member.email}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No hay integrantes adicionales en este grupo.
            </p>
          )}

          {isResponsible && (
            <FamilyMemberForm
              familyGroupId={activeFamilyGroup.id}
              members={familyMembers.map((member) => ({
                id: member.id,
                label: member.email,
              }))}
            />
          )}
        </div>
      )}

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {children.map((child) => (
            <div
              key={child.id}
              className="rounded-xl border bg-card p-4 shadow-sm space-y-3"
            >
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
                    Ve este hijo como parte de tu grupo familiar.
                  </p>
                )}
              </div>

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
