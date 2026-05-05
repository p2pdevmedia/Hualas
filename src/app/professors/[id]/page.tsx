import Link from 'next/link';
import Image from 'next/image';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { MessageCircle, Mail, Phone } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function formatName(user: { name: string | null; lastName: string | null }) {
  return [user.name, user.lastName].filter(Boolean).join(' ') || 'Sin nombre';
}

export default async function ProfessorPublicProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login');
  }

  const professor = await prisma.user.findFirst({
    where: {
      id: params.id,
      role: 'PROFESSOR',
    },
    select: {
      id: true,
      name: true,
      lastName: true,
      email: true,
      phone: true,
      profilePhoto: true,
      updatedAt: true,
      observations: true,
      professorProfile: {
        select: {
          bankName: true,
          alias: true,
          cbu: true,
          cuit: true,
          notes: true,
        },
      },
    },
  });

  if (!professor) notFound();

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-5">
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 overflow-hidden rounded-full border bg-muted shrink-0">
            {professor.profilePhoto ? (
              <Image
                src={`/api/users/${professor.id}/photo?v=${professor.updatedAt.getTime()}`}
                alt={`Foto de perfil de ${formatName(professor)}`}
                width={64}
                height={64}
                unoptimized
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-base font-semibold text-muted-foreground">
                {(professor.name?.[0] ?? '?').toUpperCase()}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {formatName(professor)}
            </h1>
            <p className="text-sm text-muted-foreground">Profesor del club</p>
          </div>
        </div>

        <div className="grid gap-3 rounded-xl border bg-muted/30 p-4">
          {professor.email && (
            <a
              href={`mailto:${professor.email}`}
              className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
            >
              <Mail className="h-4 w-4" />
              <span>{professor.email}</span>
            </a>
          )}
          {professor.phone && (
            <a
              href={`tel:${professor.phone}`}
              className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
            >
              <Phone className="h-4 w-4" />
              <span>{professor.phone}</span>
            </a>
          )}
          {!professor.email && !professor.phone && (
            <p className="text-sm text-muted-foreground">
              Sin datos de contacto cargados.
            </p>
          )}
        </div>

        {professor.observations && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Observaciones
            </p>
            <p className="text-sm text-foreground">{professor.observations}</p>
          </div>
        )}

        {professor.professorProfile && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Datos profesionales
            </p>
            <div className="grid gap-2 text-sm rounded-xl border bg-muted/20 p-4">
              {professor.professorProfile.bankName && (
                <p>Banco: {professor.professorProfile.bankName}</p>
              )}
              {professor.professorProfile.alias && (
                <p>Alias: {professor.professorProfile.alias}</p>
              )}
              {professor.professorProfile.cbu && (
                <p>CBU: {professor.professorProfile.cbu}</p>
              )}
              {professor.professorProfile.cuit && (
                <p>CUIT: {professor.professorProfile.cuit}</p>
              )}
              {professor.professorProfile.notes && (
                <p>Notas: {professor.professorProfile.notes}</p>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/chat?with=${professor.id}`}
            prefetch={true}
            className="inline-flex items-center gap-2 rounded-full border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            Iniciar chat
          </Link>
          <Link
            href="/chat"
            prefetch={true}
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            Ver chat
          </Link>
        </div>
      </div>
    </main>
  );
}
