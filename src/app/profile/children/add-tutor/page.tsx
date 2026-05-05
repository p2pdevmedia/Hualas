import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { gateActiveRole } from '@/lib/role-guards';
import { familyGroupService } from '@/lib/services/family-group-service';
import { prisma } from '@/lib/prisma';
import AddTutorForm from './add-tutor-form';

export default async function AddTutorPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  const gate = gateActiveRole(session, 'MEMBER');
  if (gate) return gate;

  const userId = (session.user as any).id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, lastName: true, email: true, phone: true },
  });
  if (!user) redirect('/login');

  const familyGroup =
    await familyGroupService.getFamilyGroupByResponsible(userId);

  if (!familyGroup) redirect('/profile/children');

  if (familyGroup.responsibleUserId !== userId) redirect('/profile/children');

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/profile/children"
          className="inline-flex h-9 items-center justify-center rounded-full border border-border px-4 text-sm font-medium hover:bg-muted transition-colors"
        >
          ← Volver
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Agregar tutor</h1>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="space-y-1 mb-6">
          <p className="text-sm text-muted-foreground">
            Ingresá el email de la madre, padre o tutor que querés sumar al
            grupo familiar. Ese usuario podrá ver y gestionar todos los hijos
            del grupo.
          </p>
        </div>
        <AddTutorForm familyGroupId={familyGroup.id} />
      </div>
    </div>
  );
}
