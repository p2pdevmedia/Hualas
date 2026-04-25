import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import SiteSettingsForm from './site-settings-form';

export default async function SiteAdminPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    redirect('/');
  }
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">
        Configuración del sitio
      </h1>
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <SiteSettingsForm />
      </div>
    </div>
  );
}
