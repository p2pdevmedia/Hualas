import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ChildInfoSection from '@/components/child-info-section';
import ChildProfilePhotoUpload from './child-profile-photo-upload';
import { gateActiveRole } from '@/lib/role-guards';
import { getAccessibleChildOwnerIds } from '@/lib/family-access';
import { formatAmount } from '@/lib/accounting';

export default async function ViewMyChildPage({
  params,
}: {
  params: { childId: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login');
  }
  const gate = gateActiveRole(session, 'MEMBER');
  if (gate) return gate;

  const child = await prisma.child.findFirst({
    where: {
      id: params.childId,
      userId: {
        in: await getAccessibleChildOwnerIds((session.user as any).id),
      },
    },
    include: {
      user: true,
      activityParticipants: { include: { activity: true } },
    },
  });

  if (!child) {
    redirect('/profile/children');
  }

  const now = new Date();
  const activeActivities = child.activityParticipants.filter(
    (ap) => ap.activity.date >= now
  );
  const pastActivities = child.activityParticipants.filter(
    (ap) => ap.activity.date < now
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">
              {child.name} {child.lastName}
            </h1>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/profile/children/${params.childId}/edit`}
              className="inline-flex h-9 items-center justify-center rounded-full border border-primary px-4 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
            >
              Editar
            </Link>
            <Link
              href="/profile/children"
              className="inline-flex h-9 items-center justify-center rounded-full border border-border px-4 text-sm font-medium hover:bg-muted transition-colors"
            >
              ← Volver
            </Link>
          </div>
        </div>

        <ChildProfilePhotoUpload
          childId={params.childId}
          hasPhoto={!!child.profilePhoto}
          photoVersion={0}
          name={child.name}
          lastName={child.lastName}
        />

        {/* Document info summary */}
        {(child.documentFrontPhoto || child.documentBackPhoto) && (
          <div className="text-xs rounded-full bg-muted px-3 py-1 font-medium w-fit">
            DNI con frente y dorso cargados
          </div>
        )}
      </div>

      {/* Información Personal */}
      <ChildInfoSection title="Información Personal">
        <div className="grid grid-cols-2 gap-4 text-sm">
          {child.name && (
            <div>
              <span className="font-medium block text-foreground">Nombre</span>
              <span className="text-muted-foreground">{child.name}</span>
            </div>
          )}
          {child.lastName && (
            <div>
              <span className="font-medium block text-foreground">
                Apellido
              </span>
              <span className="text-muted-foreground">{child.lastName}</span>
            </div>
          )}
          {child.birthDate && (
            <div>
              <span className="font-medium block text-foreground">
                Fecha de Nacimiento
              </span>
              <span className="text-muted-foreground">
                {child.birthDate.toLocaleDateString('es-AR')}
              </span>
            </div>
          )}
          {child.gender && (
            <div>
              <span className="font-medium block text-foreground">Género</span>
              <span className="text-muted-foreground">
                {child.gender === 'FEMALE'
                  ? 'Femenino'
                  : child.gender === 'MALE'
                    ? 'Masculino'
                    : child.gender === 'NON_BINARY'
                      ? 'No Binario'
                      : child.gender === 'UNDISCLOSED'
                        ? 'Prefiero no decirlo'
                        : 'Otro'}
              </span>
            </div>
          )}
          {child.nationality && (
            <div>
              <span className="font-medium block text-foreground">
                Nacionalidad
              </span>
              <span className="text-muted-foreground">{child.nationality}</span>
            </div>
          )}
          {child.maritalStatus && (
            <div>
              <span className="font-medium block text-foreground">
                Estado Civil
              </span>
              <span className="text-muted-foreground">
                {child.maritalStatus}
              </span>
            </div>
          )}
          {child.address && (
            <div className="col-span-2">
              <span className="font-medium block text-foreground">
                Domicilio
              </span>
              <span className="text-muted-foreground">{child.address}</span>
            </div>
          )}
        </div>
      </ChildInfoSection>

      {/* Documentación */}
      {(child.documentType ||
        child.documentNumber ||
        child.documentFrontPhoto ||
        child.documentBackPhoto) && (
        <ChildInfoSection title="Documentación">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              {child.documentType && (
                <div>
                  <span className="font-medium block text-foreground">
                    Tipo de Documento
                  </span>
                  <span className="text-muted-foreground">
                    {child.documentType}
                  </span>
                </div>
              )}
              {child.documentNumber && (
                <div>
                  <span className="font-medium block text-foreground">
                    Número
                  </span>
                  <span className="text-muted-foreground">
                    {child.documentNumber}
                  </span>
                </div>
              )}
            </div>

            {/* Document Photos */}
            <div className="grid grid-cols-2 gap-4">
              {child.documentFrontPhoto && (
                <div>
                  <span className="font-medium block text-foreground text-sm mb-2">
                    Foto Delantera
                  </span>
                  <div className="relative h-64 w-full">
                    <Image
                      src={child.documentFrontPhoto}
                      alt="Foto delantera del documento"
                      fill
                      className="rounded-lg border border-border object-cover"
                    />
                  </div>
                </div>
              )}
              {child.documentBackPhoto && (
                <div>
                  <span className="font-medium block text-foreground text-sm mb-2">
                    Foto Trasera
                  </span>
                  <div className="relative h-64 w-full">
                    <Image
                      src={child.documentBackPhoto}
                      alt="Foto trasera del documento"
                      fill
                      className="rounded-lg border border-border object-cover"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </ChildInfoSection>
      )}

      {/* Ficha Médica */}
      {[
        child.allergies,
        child.regularMedication,
        child.relevantDiseases,
        child.previousInjuries,
        child.physicalRestrictions,
        child.bloodGroup,
        child.primaryDoctor,
        child.doctorPhone,
        child.doctorCertificate,
        child.observations,
      ].some(Boolean) && (
        <ChildInfoSection title="Ficha Médica">
          <div className="grid grid-cols-2 gap-4 text-sm">
            {child.allergies && (
              <div className="col-span-2">
                <span className="font-medium block text-foreground">
                  Alergias
                </span>
                <span className="text-muted-foreground whitespace-pre-wrap">
                  {child.allergies}
                </span>
              </div>
            )}
            {child.regularMedication && (
              <div className="col-span-2">
                <span className="font-medium block text-foreground">
                  Medicación Habitual
                </span>
                <span className="text-muted-foreground whitespace-pre-wrap">
                  {child.regularMedication}
                </span>
              </div>
            )}
            {child.relevantDiseases && (
              <div className="col-span-2">
                <span className="font-medium block text-foreground">
                  Enfermedades Relevantes
                </span>
                <span className="text-muted-foreground whitespace-pre-wrap">
                  {child.relevantDiseases}
                </span>
              </div>
            )}
            {child.previousInjuries && (
              <div className="col-span-2">
                <span className="font-medium block text-foreground">
                  Lesiones Previas
                </span>
                <span className="text-muted-foreground whitespace-pre-wrap">
                  {child.previousInjuries}
                </span>
              </div>
            )}
            {child.physicalRestrictions && (
              <div className="col-span-2">
                <span className="font-medium block text-foreground">
                  Restricciones Físicas
                </span>
                <span className="text-muted-foreground whitespace-pre-wrap">
                  {child.physicalRestrictions}
                </span>
              </div>
            )}
            {child.bloodGroup && (
              <div>
                <span className="font-medium block text-foreground">
                  Grupo Sanguíneo
                </span>
                <span className="text-muted-foreground">
                  {child.bloodGroup}
                </span>
              </div>
            )}
            {child.primaryDoctor && (
              <div>
                <span className="font-medium block text-foreground">
                  Médico de Cabecera
                </span>
                <span className="text-muted-foreground">
                  {child.primaryDoctor}
                </span>
              </div>
            )}
            {child.doctorPhone && (
              <div>
                <span className="font-medium block text-foreground">
                  Teléfono Médico
                </span>
                <span className="text-muted-foreground">
                  {child.doctorPhone}
                </span>
              </div>
            )}
            {child.doctorCertificate && (
              <div className="col-span-2">
                <span className="font-medium block text-foreground">
                  Certificado Médico
                </span>
                <div className="mt-2 overflow-hidden rounded-lg border bg-background">
                  <a
                    href={child.doctorCertificate}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm text-primary underline underline-offset-4"
                  >
                    Abrir certificado en tamaño completo
                  </a>
                  <Image
                    src={child.doctorCertificate}
                    alt="Certificado médico"
                    width={1200}
                    height={1600}
                    unoptimized
                    className="mt-2 h-auto w-full object-contain"
                  />
                </div>
              </div>
            )}
            {child.observations && (
              <div className="col-span-2">
                <span className="font-medium block text-foreground">
                  Observaciones
                </span>
                <span className="text-muted-foreground whitespace-pre-wrap">
                  {child.observations}
                </span>
              </div>
            )}
          </div>
        </ChildInfoSection>
      )}

      {/* Actividades - Active/Upcoming */}
      {activeActivities.length > 0 && (
        <ChildInfoSection title="Actividades Próximas" defaultOpen={true}>
          <ul className="divide-y divide-border space-y-2">
            {activeActivities.map((ap) => (
              <li key={ap.id} className="py-2 text-sm">
                <span className="font-medium">{ap.activity.name}</span>
                <span className="text-muted-foreground text-xs block mt-0.5">
                  {ap.activity.date.toLocaleDateString('es-AR')} · $
                  {formatAmount(ap.activity.price)}
                </span>
              </li>
            ))}
          </ul>
        </ChildInfoSection>
      )}

      {/* Actividades - Past */}
      {pastActivities.length > 0 && (
        <ChildInfoSection title="Historial de Actividades" defaultOpen={false}>
          <ul className="divide-y divide-border space-y-2">
            {pastActivities.map((ap) => (
              <li key={ap.id} className="py-2 text-sm">
                <span className="font-medium">{ap.activity.name}</span>
                <span className="text-muted-foreground text-xs block mt-0.5">
                  {ap.activity.date.toLocaleDateString('es-AR')} · $
                  {formatAmount(ap.activity.price)}
                </span>
              </li>
            ))}
          </ul>
        </ChildInfoSection>
      )}

      {child.activityParticipants.length === 0 && (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <p className="text-sm text-muted-foreground">
            Sin actividades registradas.
          </p>
        </div>
      )}
    </div>
  );
}
