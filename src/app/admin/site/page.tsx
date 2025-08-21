import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import SiteSettingsForm from './site-settings-form';

export default async function SiteAdminPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    redirect('/');
  }
  const settings = await prisma.siteSetting.findUnique({ where: { id: 1 } });
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Site Administrator</h1>
      <SiteSettingsForm settings={settings} />
    </div>
  );
}
