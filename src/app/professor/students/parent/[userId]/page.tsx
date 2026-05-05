import { getServerSession } from 'next-auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getAccessibleChildOwnerIds } from '@/lib/family-access';

export default async function ProfessorParentProfilePage({
  params,
}: {
  params: { userId: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const activeRole = session.user.activeRole ?? session.user.role;
  if (activeRole !== 'PROFESSOR') redirect('/my-activities');

  const professorId = session.user.id;

  const professorActivityIds = await prisma.activityProfessor
    .findMany({ where: { userId: professorId }, select: { activityId: true } })
    .then((rows) => rows.map((r) => r.activityId));

  if (professorActivityIds.length === 0) notFound();

  // Verify access: this user or one of their children is in a group of one of the professor's activities
  const accessCheck = await prisma.activityGroupMember.findFirst({
    where: {
      activityGroup: { activityId: { in: professorActivityIds } },
      activityParticipant: {
        OR: [{ userId: params.userId }, { child: { userId: params.userId } }],
      },
    },
  });

  if (!accessCheck) notFound();

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: {
      id: true,
      name: true,
      lastName: true,
      email: true,
      phone: true,
      address: true,
      birthDate: true,
      gender: true,
      observations: true,
      allergies: true,
      regularMedication: true,
      relevantDiseases: true,
      previousInjuries: true,
      physicalRestrictions: true,
      bloodGroup: true,
      primaryDoctor: true,
      doctorPhone: true,
      profilePhoto: true,
      updatedAt: true,
      activityParticipants: {
        where: {
          childId: null,
          groupMembership: {
            activityGroup: { activityId: { in: professorActivityIds } },
          },
        },
        include: {
          activity: { select: { id: true, name: true } },
          groupMembership: {
            include: { activityGroup: { select: { name: true } } },
          },
        },
      },
    },
  });

  if (!user) notFound();

  const familyGroup = await prisma.familyGroup.findFirst({
    where: { responsibleUserId: params.userId },
    include: {
      members: {
        include: {
          member: {
            select: { id: true, name: true, lastName: true, phone: true, email: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  const childOwnerIds = await getAccessibleChildOwnerIds(params.userId);
  const children = await prisma.child.findMany({
    where: {
      userId: { in: childOwnerIds },
      activityParticipants: {
        some: {
          groupMembership: {
            activityGroup: { activityId: { in: professorActivityIds } },
          },
        },
      },
    },
    select: {
      id: true,
      name: true,
      lastName: true,
      birthDate: true,
      activityParticipants: {
        where: {
          groupMembership: {
            activityGroup: { activityId: { in: professorActivityIds } },
          },
        },
        include: {
          activity: { select: { id: true, name: true } },
          groupMembership: {
            include: { activityGroup: { select: { name: true } } },
          },
        },
      },
    },
  });

  const medicalFields: [string, string | null | undefined][] = [
    ['Alergias', user.allergies],
    ['Medicación habitual', user.regularMedication],
    ['Enfermedades relevantes', user.relevantDiseases],
    ['Lesiones previas', user.previousInjuries],
    ['Restricciones físicas', user.physicalRestrictions],
    ['Grupo sanguíneo', user.bloodGroup],
    ['Médico de cabecera', user.primaryDoctor],
    ['Teléfono médico', user.doctorPhone],
  ];

  const hasMedical = medicalFields.some(([, v]) => Boolean(v));

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 overflow-hidden rounded-full border bg-muted shrink-0">
            {user.profilePhoto ? (
              <Image
                src={`/api/users/${user.id}/photo?v=${user.updatedAt.getTime()}`}
                alt={`Foto de perfil de ${user.name ?? 'usuario'}`}
                width={56}
                height={56}
                unoptimized
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-muted-foreground">
                {(user.name?.[0] ?? '?').toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">
              {user.name} {user.lastName}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
            {user.phone && (
              <p className="text-sm text-muted-foreground">
                <a
                  href={`tel:${user.phone}`}
                  className="hover:text-primary transition-colors"
                >
                  {user.phone}
                </a>
              </p>
            )}
            {user.address && (
              <p className="text-sm text-muted-foreground">{user.address}</p>
            )}
          </div>
        </div>

        {user.observations && (
          <div className="border-t pt-3 text-sm">
            <span className="font-medium">Observaciones:</span>{' '}
            <span className="text-muted-foreground">{user.observations}</span>
          </div>
        )}
      </div>

      {familyGroup && familyGroup.members.length > 0 && (
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">Tutores y padres</h2>
          <div className="space-y-2">
            {familyGroup.members.map((fm) => {
              const relLabel: Record<string, string> = {
                PARENT: 'Madre / Padre',
                RESPONSIBLE: 'Responsable',
                OTHER: 'Tutor/a',
              };
              return (
                <div key={fm.id} className="rounded-lg border bg-muted/20 p-3 text-sm space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">
                      {[fm.member.name, fm.member.lastName].filter(Boolean).join(' ') || fm.member.email}
                    </p>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground shrink-0">
                      {relLabel[fm.relationship] ?? fm.relationship}
                    </span>
                  </div>
                  {fm.member.phone && (
                    <p className="text-muted-foreground">
                      <a href={`tel:${fm.member.phone}`} className="hover:text-primary transition-colors">
                        {fm.member.phone}
                      </a>
                    </p>
                  )}
                  <p className="text-muted-foreground">
                    <a href={`mailto:${fm.member.email}`} className="hover:text-primary transition-colors">
                      {fm.member.email}
                    </a>
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {hasMedical && (
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">Ficha médica</h2>
          <div className="grid gap-2 rounded-lg border bg-muted/20 p-3 text-xs sm:grid-cols-2">
            {medicalFields
              .filter(([, v]) => Boolean(v))
              .map(([label, value]) => (
                <div key={label}>
                  <span className="font-medium text-foreground">{label}:</span>{' '}
                  <span className="text-muted-foreground">{value}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {user.activityParticipants.length > 0 && (
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">
            Actividades en tus grupos
          </h2>
          <ul className="divide-y divide-border">
            {user.activityParticipants.map((ap) => (
              <li key={ap.id} className="py-2 text-sm flex items-center justify-between">
                <span>
                  <span className="font-medium">{ap.activity.name}</span>
                  {ap.groupMembership?.activityGroup && (
                    <span className="text-muted-foreground ml-2">
                      · {ap.groupMembership.activityGroup.name}
                    </span>
                  )}
                </span>
                <Link
                  href={`/activities/${ap.activity.id}`}
                  className="text-xs text-link hover:underline underline-offset-4"
                >
                  Ver actividad
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {children.length > 0 && (
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">
            Hijos en tus grupos
          </h2>
          <ul className="divide-y divide-border">
            {children.map((child) => (
              <li key={child.id} className="py-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <Link
                      href={`/professor/students/child/${child.id}`}
                      className="font-medium hover:text-primary transition-colors"
                    >
                      {child.name} {child.lastName}
                    </Link>
                    {child.birthDate && (
                      <p className="text-xs text-muted-foreground">
                        {child.birthDate.toLocaleDateString('es-AR')}
                      </p>
                    )}
                    <div className="space-y-1">
                      {child.activityParticipants.map((ap) => (
                        <p key={ap.id} className="text-xs text-muted-foreground">
                          {ap.activity.name}
                          {ap.groupMembership?.activityGroup &&
                            ` · ${ap.groupMembership.activityGroup.name}`}
                        </p>
                      ))}
                    </div>
                  </div>
                  <Link
                    href={`/professor/students/child/${child.id}`}
                    className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-muted transition-colors"
                  >
                    Ver perfil
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Link
        href="/professor/students"
        className="inline-block text-sm text-link hover:text-link/80 underline underline-offset-4"
      >
        ← Volver a mis alumnos
      </Link>
    </main>
  );
}
