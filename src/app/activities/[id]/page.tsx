import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

interface ActivityPageProps {
  params: { id: string };
}

export default async function ActivityPage({ params }: ActivityPageProps) {
  const activity = await prisma.activity.findUnique({
    where: { id: params.id },
    include: { participants: true },
  });

  if (!activity) {
    return <main className="p-4">Actividad no encontrada</main>;
  }

  return (
    <main className="p-4">
      <h1 className="mb-4 text-2xl font-bold">{activity.name}</h1>
      {activity.image && (
        <Image
          src={activity.image}
          alt={activity.name}
          width={800}
          height={600}
          className="mb-4 max-w-full"
        />
      )}
      <p className="mb-2">Fecha: {activity.date.toISOString().split('T')[0]}</p>
      <p className="mb-4">{activity.description}</p>
      <p className="mb-4 font-semibold">
        {activity.participants.length} participantes
      </p>
      <Button>Inscribirse</Button>
    </main>
  );
}
