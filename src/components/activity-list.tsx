'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/language-context';
import { Prisma } from '@prisma/client';

export type ActivityWithParticipants = Prisma.ActivityGetPayload<{ include: { participants: true } }>;

export default function ActivityList({ activities }: { activities: ActivityWithParticipants[] }) {
  const { t } = useLanguage();

  return (
    <main className="p-4">
      <h1 className="mb-4 text-2xl font-bold">{t('welcome')}</h1>
      <ul className="space-y-4">
        {activities.map((activity) => (
          <li key={activity.id} className="flex flex-col border p-4">
            {activity.image && (
              <Image
                src={activity.image}
                alt={activity.name}
                width={800}
                height={600}
                className="mb-2 max-w-full"
              />
            )}
            <span className="mb-1 font-semibold">{activity.name}</span>
            {activity.description && (
              <p className="mb-2 text-sm text-slate-600">{activity.description}</p>
            )}
            <Link href={`/activities/${activity.id}`}>
              <Button>{t('enroll')}</Button>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

