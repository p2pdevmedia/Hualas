import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export const metadata = {
  title: 'Avisos de Retiro',
};

export default async function PickupNoticesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  // Get all pickup notices created by this user
  const notices = await prisma.pickupNotice.findMany({
    where: {
      createdBy: {
        id: session.user.id,
      },
      deletedAt: null,
    },
    include: {
      child: true,
      activityDay: {
        include: {
          activity: true,
        },
      },
      alternatePersonUser: true,
      acknowledgments: {
        include: {
          acknowledgedBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Avisos de Retiro</h1>
        <p className="text-gray-600">
          Gestiona los avisos de quién recogerá a tu hijo en las actividades
        </p>
      </div>

      {notices.length === 0 ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <p className="text-gray-600 mb-4">
            No tienes avisos de retiro. Los avisos se crean desde la página de detalles de la actividad.
          </p>
          <Link
            href="/my-activities"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition"
          >
            Ir a Mis Actividades
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {notices.map((notice) => (
            <div
              key={notice.id}
              className="border rounded-lg p-4 bg-white shadow-sm space-y-3"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">{notice.child.name}</h3>
                  <p className="text-sm text-gray-600">
                    {notice.activityDay.activity.name} - {new Date(notice.activityDay.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-sm text-gray-500">
                  Creado: {new Date(notice.createdAt).toLocaleDateString()}
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded">
                <p className="text-sm font-medium mb-1">Quién recogerá:</p>
                <p className="font-semibold">
                  {notice.alternatePersonUser?.name ||
                    notice.alternatePersonName ||
                    'No especificado'}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium mb-1">Descripción:</p>
                <p className="text-sm text-gray-700">{notice.description}</p>
              </div>

              <div className="border-t pt-3">
                <p className="text-sm font-medium mb-2">
                  Confirmaciones de profesores ({notice.acknowledgments.length})
                </p>
                {notice.acknowledgments.length === 0 ? (
                  <p className="text-xs text-gray-500">
                    Aún no hay confirmaciones de profesores
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {notice.acknowledgments.map((ack) => (
                      <li
                        key={ack.id}
                        className="bg-green-50 p-2 rounded text-sm"
                      >
                        <p className="font-medium">{ack.acknowledgedBy.name}</p>
                        {ack.notes && (
                          <p className="text-gray-700">{ack.notes}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          {new Date(ack.confirmedAt).toLocaleString()}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Link
                  href={`/activities/${notice.activityDay.activityId}`}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Ver Actividad
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
