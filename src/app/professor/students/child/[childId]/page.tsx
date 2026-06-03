import { getServerSession } from 'next-auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { professorScopedActivityParticipantWhere } from '@/lib/professor-access';

export default async function ProfessorChildProfilePage({
  params,
}: {
  params: { childId: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const activeRole = session.user.activeRole ?? session.user.role;
  if (activeRole !== 'PROFESSOR') redirect('/my-activities');

  const professorId = session.user.id;

  // Verify professor has access to this child through an assigned group, or
  // through an ungrouped activity where the professor is assigned.
  const accessCheck = await prisma.activityGroupMember.findFirst({
    where: {
      activityParticipant: {
        childId: params.childId,
        ...professorScopedActivityParticipantWhere(professorId),
      },
    },
  });

  const ungroupedAccessCheck =
    accessCheck ??
    (await prisma.activityParticipant.findFirst({
      where: {
        childId: params.childId,
        ...professorScopedActivityParticipantWhere(professorId),
      },
      select: { id: true },
    }));

  if (!ungroupedAccessCheck) notFound();

  const child = await prisma.child.findUnique({
    where: { id: params.childId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          lastName: true,
          phone: true,
          email: true,
          address: true,
        },
      },
      activityParticipants: {
        where: {
          ...professorScopedActivityParticipantWhere(professorId),
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

  if (!child) notFound();

  const familyGroup = await prisma.familyGroup.findFirst({
    where: { responsibleUserId: child.userId },
    include: {
      members: {
        include: {
          member: {
            select: {
              id: true,
              name: true,
              lastName: true,
              phone: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  const medicalFields: [string, string | null | undefined][] = [
    ['Alergias', child.allergies],
    ['Medicación habitual', child.regularMedication],
    ['Enfermedades relevantes', child.relevantDiseases],
    ['Lesiones previas', child.previousInjuries],
    ['Restricciones físicas', child.physicalRestrictions],
    ['Grupo sanguíneo', child.bloodGroup],
    ['Médico de cabecera', child.primaryDoctor],
    ['Teléfono médico', child.doctorPhone],
    ['Observaciones', child.observations],
  ];

  const hasMedical = medicalFields.some(([, v]) => Boolean(v));

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {child.name} {child.lastName}
          </h1>
          {child.birthDate && (
            <p className="text-sm text-muted-foreground mt-1">
              Nacimiento: {child.birthDate.toLocaleDateString('es-AR')}
            </p>
          )}
          {child.gender && (
            <p className="text-sm text-muted-foreground">
              Género:{' '}
              {child.gender === 'FEMALE'
                ? 'Femenino'
                : child.gender === 'MALE'
                  ? 'Masculino'
                  : child.gender === 'NON_BINARY'
                    ? 'No binario'
                    : 'Otro'}
            </p>
          )}
          {child.documentType && child.documentNumber && (
            <p className="text-sm text-muted-foreground">
              {child.documentType}: {child.documentNumber}
            </p>
          )}
          {child.address && (
            <p className="text-sm text-muted-foreground">
              Dirección: {child.address}
            </p>
          )}
        </div>

        <div className="border-t pt-4 space-y-3">
          <p className="text-sm font-semibold">Contacto del responsable</p>
          <div className="rounded-lg border bg-muted/20 p-3 text-sm space-y-1">
            <p>
              <span className="font-medium">Nombre:</span>{' '}
              <Link
                href={`/professor/students/parent/${child.user.id}`}
                className="text-primary hover:underline underline-offset-4"
              >
                {child.user.name ?? ''} {child.user.lastName ?? ''}
              </Link>
            </p>
            {child.user.phone && (
              <p>
                <span className="font-medium">Teléfono:</span>{' '}
                <a
                  href={`tel:${child.user.phone}`}
                  className="text-primary hover:underline underline-offset-4"
                >
                  {child.user.phone}
                </a>
              </p>
            )}
            <p>
              <span className="font-medium">Email:</span>{' '}
              <a
                href={`mailto:${child.user.email}`}
                className="text-primary hover:underline underline-offset-4"
              >
                {child.user.email}
              </a>
            </p>
            {child.user.address && (
              <p>
                <span className="font-medium">Dirección:</span>{' '}
                {child.user.address}
              </p>
            )}
          </div>

          {familyGroup && familyGroup.members.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-2">Tutores y padres</p>
              <div className="space-y-2">
                {familyGroup.members.map((fm) => {
                  const relLabel: Record<string, string> = {
                    PARENT: 'Madre / Padre',
                    RESPONSIBLE: 'Responsable',
                    OTHER: 'Tutor/a',
                  };
                  return (
                    <div
                      key={fm.id}
                      className="rounded-lg border bg-muted/20 p-3 text-sm space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium">
                          {[fm.member.name, fm.member.lastName]
                            .filter(Boolean)
                            .join(' ') || fm.member.email}
                        </p>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {relLabel[fm.relationship] ?? fm.relationship}
                        </span>
                      </div>
                      {fm.member.phone && (
                        <p>
                          <span className="font-medium">Teléfono:</span>{' '}
                          <a
                            href={`tel:${fm.member.phone}`}
                            className="text-primary hover:underline underline-offset-4"
                          >
                            {fm.member.phone}
                          </a>
                        </p>
                      )}
                      <p>
                        <span className="font-medium">Email:</span>{' '}
                        <a
                          href={`mailto:${fm.member.email}`}
                          className="text-primary hover:underline underline-offset-4"
                        >
                          {fm.member.email}
                        </a>
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

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

      {child.activityParticipants.length > 0 && (
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">
            Actividades en tus grupos
          </h2>
          <ul className="divide-y divide-border">
            {child.activityParticipants.map((ap) => (
              <li
                key={ap.id}
                className="py-2 text-sm flex items-center justify-between"
              >
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

      <Link
        href="/professor/students"
        className="inline-block text-sm text-link hover:text-link/80 underline underline-offset-4"
        prefetch={true}
      >
        ← Volver a mis alumnos
      </Link>
    </main>
  );
}
