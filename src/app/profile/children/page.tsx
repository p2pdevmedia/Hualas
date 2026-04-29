import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function ChildrenPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    include: {
      children: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Mis Hijos</h1>
        <Link
          href="/profile/children/new"
          className="inline-flex h-9 items-center justify-center rounded-full border border-primary px-4 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
        >
          Agregar hijo
        </Link>
      </div>

      {user.children.length === 0 ? (
        <div className="rounded-xl border bg-card p-6 shadow-sm text-center">
          <p className="text-sm text-muted-foreground">
            No tienes hijos registrados.
          </p>
          <Link
            href="/profile/children/new"
            className="inline-flex mt-4 h-9 items-center justify-center rounded-full border border-primary px-4 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
          >
            Agregar hijo
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {user.children.map((child) => (
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
                    {new Date().getFullYear() - child.birthDate.getFullYear()} años
                  </p>
                )}
              </div>

              {/* Health Highlights */}
              <div className="bg-muted/30 rounded-lg p-3 space-y-1 text-xs">
                {child.bloodGroup && (
                  <p className="text-muted-foreground">
                    <span className="font-medium">Grupo sanguíneo:</span> {child.bloodGroup}
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
                    <span className="font-medium">Médico:</span> {child.primaryDoctor}
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
