import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NOTIFICATION_TYPES } from '@/lib/validations/notifications';
import PreferencesForm from './preferences-form';
import type { NotificationType, Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

const ALL_ROLES: Role[] = ['MEMBER', 'PROFESSOR', 'COUNTER', 'ADMIN', 'SUPER_ADMIN'];

const TYPE_ROLES: Record<NotificationType, Role[]> = {
  ACTIVITY_DAY_NEW: ALL_ROLES,
  ACTIVITY_DAY_UPDATED: ALL_ROLES,
  PICKUP_NOTICE_CREATED: ['MEMBER', 'PROFESSOR', 'ADMIN', 'SUPER_ADMIN'],
  PICKUP_NOTICE_ACKNOWLEDGED: ['MEMBER', 'ADMIN', 'SUPER_ADMIN'],
  PAYMENT_MANUAL_CREATED: ['COUNTER', 'ADMIN', 'SUPER_ADMIN'],
  PAYMENT_APPROVED: ALL_ROLES,
  PAYMENT_REJECTED: ALL_ROLES,
  ACTIVITY_CAPACITY_FULL: ['ADMIN', 'SUPER_ADMIN'],
  CHAT_MESSAGE_NEW: ALL_ROLES,
};

const TYPE_LABELS: Record<NotificationType, { title: string; description: string }> = {
  ACTIVITY_DAY_NEW: {
    title: 'Nuevo día en una actividad',
    description: 'Cuando se agrega un día a una actividad en la que estás inscripto.',
  },
  ACTIVITY_DAY_UPDATED: {
    title: 'Día de actividad actualizado',
    description: 'Cuando cambia la fecha, horario o lugar de un día programado.',
  },
  PICKUP_NOTICE_CREATED: {
    title: 'Nuevo aviso de retiro',
    description: 'Cuando un familiar avisa que retira a un menor.',
  },
  PICKUP_NOTICE_ACKNOWLEDGED: {
    title: 'Aviso de retiro confirmado',
    description: 'Cuando un profesor confirma haber recibido tu aviso.',
  },
  PAYMENT_MANUAL_CREATED: {
    title: 'Movimiento manual',
    description: 'Cuando se carga un movimiento manual de contabilidad.',
  },
  PAYMENT_APPROVED: {
    title: 'Pago aprobado',
    description: 'Cuando uno de tus pagos queda aprobado.',
  },
  PAYMENT_REJECTED: {
    title: 'Pago rechazado',
    description: 'Cuando un pago es rechazado y no se procesa.',
  },
  ACTIVITY_CAPACITY_FULL: {
    title: 'Cupo completo',
    description: 'Cuando una actividad alcanza su capacidad máxima.',
  },
  CHAT_MESSAGE_NEW: {
    title: 'Mensajes nuevos',
    description: 'Cuando recibís un mensaje en el chat interno.',
  },
};

function parseUserAgent(ua: string | null): string {
  if (!ua) return 'Dispositivo desconocido';
  const browser = /Chrome/.test(ua) && !/Edg/.test(ua)
    ? 'Chrome'
    : /Firefox/.test(ua)
      ? 'Firefox'
      : /Edg/.test(ua)
        ? 'Edge'
        : /Safari/.test(ua)
          ? 'Safari'
          : 'Navegador';
  const os = /Windows/.test(ua)
    ? 'Windows'
    : /Mac OS X/.test(ua)
      ? 'macOS'
      : /Android/.test(ua)
        ? 'Android'
        : /iPhone|iPad|iPod/.test(ua)
          ? 'iOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : '';
  return os ? `${browser} en ${os}` : browser;
}

export default async function NotificationsPreferencesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login?callbackUrl=/profile/notifications');
  }
  const userId = (session.user as { id: string }).id;
  const role = (session.user as { role: Role }).role;

  const visibleTypes = NOTIFICATION_TYPES.filter((type) =>
    TYPE_ROLES[type].includes(role),
  );

  const [prefRows, subscriptions] = await Promise.all([
    prisma.notificationPreference.findMany({
      where: { userId },
      select: { type: true, inApp: true, push: true },
    }),
    prisma.pushSubscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userAgent: true,
        createdAt: true,
        lastUsedAt: true,
        failedAt: true,
      },
    }),
  ]);

  const prefMap: Record<string, { inApp: boolean; push: boolean }> = {};
  for (const t of visibleTypes) prefMap[t] = { inApp: true, push: true };
  for (const row of prefRows) {
    if (visibleTypes.includes(row.type)) {
      prefMap[row.type] = { inApp: row.inApp, push: row.push };
    }
  }

  const items = visibleTypes.map((type) => ({
    type,
    title: TYPE_LABELS[type].title,
    description: TYPE_LABELS[type].description,
    preference: prefMap[type],
  }));

  const devices = subscriptions.map((s) => ({
    id: s.id,
    label: parseUserAgent(s.userAgent),
    addedAt: s.createdAt.toISOString(),
    failed: !!s.failedAt,
  }));

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-1">
        Preferencias de notificaciones
      </h1>
      <p className="text-sm text-gray-600 mb-6">
        Elegí qué notificaciones querés recibir y cómo.
      </p>
      <PreferencesForm items={items} devices={devices} />
    </main>
  );
}
