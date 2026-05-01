import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import DayTypesManager from './day-types-manager';

export default async function ActivityDayTypesPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    redirect('/');
  }

  const types = await prisma.activityDayType.findMany({
    orderBy: { sortOrder: 'asc' },
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Tipos de sesión</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Administrá los tipos de deporte disponibles para las sesiones de actividades.
        </p>
      </div>
      <DayTypesManager initialTypes={types} />
    </main>
  );
}
