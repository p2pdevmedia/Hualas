import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Heading, Text, Box, Flex, Container } from '@radix-ui/themes';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ChildInfoSection from '@/components/child-info-section';

export default async function ViewChildPage({
  params,
}: {
  params: { id: string; childId: string };
}) {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')
  ) {
    redirect('/');
  }

  const child = await prisma.child.findUnique({
    where: { id: params.childId },
    include: {
      user: true,
      activityParticipants: { include: { activity: true } },
    },
  });

  if (!child || child.userId !== params.id) {
    redirect(`/admin/users/${params.id}/view`);
  }

  return (
    <Container>
      <div className="py-8 space-y-6">
        {/* Header */}
        <Box className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <Flex justify="between" align="start" gap="4">
            <div>
              <Heading size="8">
                {child.name} {child.lastName}
              </Heading>
              <Text size="2" color="gray" className="mt-1">
                Hijo de {child.user.name} {child.user.lastName}
              </Text>
            </div>
            <Flex gap="2">
              <Link
                href={`/admin/users/${params.id}/children/${params.childId}/edit`}
                className="inline-flex h-9 items-center justify-center rounded-full border border-primary px-4 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
              >
                Editar
              </Link>
              <Link
                href={`/admin/users/${params.id}/view`}
                className="inline-flex h-9 items-center justify-center rounded-full border border-border px-4 text-sm font-medium hover:bg-muted transition-colors"
              >
                ← Volver
              </Link>
            </Flex>
          </Flex>

          {/* Document info summary */}
          {(child.documentFrontPhoto || child.documentBackPhoto) && (
            <Text
              size="1"
              weight="medium"
              className="rounded-full bg-muted px-3 py-1 w-fit"
            >
              DNI con frente y dorso cargados
            </Text>
          )}
        </Box>

        {/* Información Personal */}
        <ChildInfoSection title="Información Personal">
          <Box className="grid grid-cols-2 gap-4 text-sm">
            {child.name && (
              <div>
                <span className="font-medium block text-foreground">
                  Nombre
                </span>
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
                <span className="font-medium block text-foreground">
                  Género
                </span>
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
                <span className="text-muted-foreground">
                  {child.nationality}
                </span>
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
          </Box>
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
                    <img
                      src={child.documentFrontPhoto}
                      alt="Foto delantera del documento"
                      className="rounded-lg border border-border w-full max-h-64 object-cover"
                    />
                  </div>
                )}
                {child.documentBackPhoto && (
                  <div>
                    <span className="font-medium block text-foreground text-sm mb-2">
                      Foto Trasera
                    </span>
                    <img
                      src={child.documentBackPhoto}
                      alt="Foto trasera del documento"
                      className="rounded-lg border border-border w-full max-h-64 object-cover"
                    />
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

        {/* Actividades */}
        {child.activityParticipants.length > 0 && (
          <ChildInfoSection title="Actividades">
            <ul className="divide-y divide-border space-y-2">
              {child.activityParticipants.map((ap) => (
                <li key={ap.id} className="py-2 text-sm">
                  <span className="font-medium">{ap.activity.name}</span>
                  <span className="text-muted-foreground text-xs block mt-0.5">
                    {ap.activity.date.toLocaleDateString('es-AR')} · $
                    {ap.activity.price}
                  </span>
                </li>
              ))}
            </ul>
          </ChildInfoSection>
        )}

        {child.activityParticipants.length === 0 && (
          <Box className="rounded-xl border bg-card p-6 shadow-sm">
            <Text size="2" color="gray">
              Sin actividades registradas.
            </Text>
          </Box>
        )}
      </div>
    </Container>
  );
}
