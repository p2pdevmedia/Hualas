import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import TutorsList from './tutors-list';
import DeleteChildButton from './delete-child-button';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { gateActiveRole } from '@/lib/role-guards';
import { getAccessibleChildrenWhere } from '@/lib/family-access';
import { familyGroupService } from '@/lib/services/family-group-service';

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
      _count: { select: { activityParticipants: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const familyMembers = activeFamilyGroup?.members ?? [];
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
        <div className="rounded-xl border bg-card p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">
              Grupo familiar
            </h2>
            {isResponsible && (
              <Link
                href="/profile/children/add-tutor"
                className="inline-flex h-8 items-center justify-center rounded-full border border-primary px-4 text-xs font-medium text-primary hover:bg-primary/5 transition-colors"
              >
                + Agregar tutor
              </Link>
            )}
          </div>

          {/* Responsable principal */}
          {activeFamilyGroup.responsibleUser && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Responsable principal
              </p>
              <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {`${activeFamilyGroup.responsibleUser.name?.[0] ?? ''}${activeFamilyGroup.responsibleUser.lastName?.[0] ?? ''}`.trim() || '?'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {[activeFamilyGroup.responsibleUser.name, activeFamilyGroup.responsibleUser.lastName].filter(Boolean).join(' ') || activeFamilyGroup.responsibleUser.email}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {activeFamilyGroup.responsibleUser.email}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tutores / padres adicionales */}
          <TutorsList
            familyGroupId={activeFamilyGroup.id}
            isResponsible={isResponsible}
            tutors={familyMembers.map((fm) => ({
              id: fm.id,
              memberId: fm.memberId,
              name: [fm.member.name, fm.member.lastName].filter(Boolean).join(' ') || fm.member.email,
              email: fm.member.email,
              relationship: fm.relationship,
            }))}
          />

          {familyMembers.length === 0 && !isResponsible && (
            <p className="text-sm text-muted-foreground">
              No hay integrantes adicionales en este grupo.
            </p>
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
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 h-12 w-12 overflow-hidden rounded-full border bg-muted/30">
                  {child.profilePhoto ? (
                    <div className="relative h-full w-full">
                      <Image
                        src={`/api/children/${child.id}/photo`}
                        alt={child.name}
                        fill
                        unoptimized
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <span className="text-sm font-bold text-muted-foreground">
                        {`${child.name[0]}${child.lastName?.[0] ?? ''}`.trim()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="space-y-0.5 min-w-0">
                  <h2 className="font-semibold truncate">
                    {child.name} {child.lastName}
                  </h2>
                  {child.birthDate && (
                    <p className="text-xs text-muted-foreground">
                      {(() => {
                        const today = new Date();
                        const birth = new Date(child.birthDate);
                        let age = today.getFullYear() - birth.getFullYear();
                        const m = today.getMonth() - birth.getMonth();
                        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
                        return age;
                      })()}{' '}
                      años
                    </p>
                  )}
                  {child.userId !== userId && (
                    <p className="text-xs text-muted-foreground">
                      Grupo familiar
                    </p>
                  )}
                </div>
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
                {child.userId === userId ? (
                  <Link
                    href="/profile?returnTo=/profile/children"
                    className="flex-1 inline-flex h-8 items-center justify-center rounded-full border border-primary px-3 text-xs font-medium text-primary hover:bg-primary/5 transition-colors"
                  >
                    Editar perfil
                  </Link>
                ) : (
                  <Link
                    href={`/profile/children/${child.id}/edit?returnTo=/profile/children`}
                    className="flex-1 inline-flex h-8 items-center justify-center rounded-full border border-primary px-3 text-xs font-medium text-primary hover:bg-primary/5 transition-colors"
                  >
                    Editar
                  </Link>
                )}
              </div>
              {child.userId === userId && child._count.activityParticipants === 0 && (
                <DeleteChildButton
                  childId={child.id}
                  childName={[child.name, child.lastName].filter(Boolean).join(' ')}
                />
              )}
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
