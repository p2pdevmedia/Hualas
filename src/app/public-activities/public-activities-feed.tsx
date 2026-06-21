'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Search, ArrowRight, CalendarDays, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { PublicActivityCard } from '@/lib/activities/public-activity-cards';

type PublicActivitiesFeedProps = {
  activities: PublicActivityCard[];
};

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export default function PublicActivitiesFeed({
  activities,
}: PublicActivitiesFeedProps) {
  const [query, setQuery] = useState('');

  const filteredActivities = useMemo(() => {
    const normalizedQuery = normalize(query.trim());
    if (!normalizedQuery) return activities;

    return activities.filter((activity) => {
      const haystack = normalize(
        [
          activity.name,
          activity.description,
          activity.typeLabel,
          activity.frequencyLabel,
          activity.statusLabel,
        ].join(' ')
      );

      return haystack.includes(normalizedQuery);
    });
  }, [activities, query]);

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 rounded-3xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Buscar actividades
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Filtrá por nombre, tipo, frecuencia o estado.
          </p>
        </div>

        <label className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por actividad..."
            className="w-full rounded-full border bg-background py-3 pl-10 pr-4 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>
      </div>

      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <p>
          {filteredActivities.length} actividad
          {filteredActivities.length === 1 ? '' : 'es'} encontrada
          {filteredActivities.length === 1 ? '' : 's'}.
        </p>
      </div>

      {filteredActivities.length === 0 ? (
        <div className="rounded-3xl border bg-card p-10 text-center text-muted-foreground shadow-sm">
          No encontramos actividades con ese criterio.
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filteredActivities.map((activity) => (
            <article
              key={activity.id}
              className="group overflow-hidden rounded-[1.75rem] border bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="relative aspect-[4/5] overflow-hidden">
                {activity.imageUrl ? (
                  <Image
                    src={activity.imageUrl}
                    alt={activity.name}
                    fill
                    unoptimized
                    className="object-cover transition duration-700 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                    priority={false}
                  />
                ) : (
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(160deg, #16372e 0%, #49bda6 52%, #f5a524 100%)',
                    }}
                  />
                )}
                <div
                  className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent"
                  aria-hidden="true"
                />

                <div className="absolute left-4 right-4 top-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-foreground backdrop-blur">
                    {activity.typeLabel}
                  </span>
                  <span className="rounded-full border border-white/25 bg-black/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur">
                    {activity.statusLabel}
                  </span>
                </div>

                <div className="absolute inset-x-4 bottom-4 space-y-2 text-white">
                  <p className="inline-flex items-center gap-2 text-xs font-medium text-white/85">
                    <CalendarDays className="h-4 w-4" aria-hidden="true" />
                    {activity.dateLabel}
                  </p>
                  <h3 className="text-2xl font-semibold leading-tight">
                    {activity.name}
                  </h3>
                </div>
              </div>

              <div className="space-y-4 p-4">
                <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
                  {activity.description}
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-muted/40 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Frecuencia
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {activity.frequencyLabel}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-muted/40 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Cupos
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {activity.capacityLabel}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-muted/40 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Precio
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {activity.priceLabel}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-muted/40 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Inscriptos
                    </p>
                    <p className="mt-1 inline-flex items-center gap-1 text-sm font-medium">
                      <Users className="h-4 w-4" aria-hidden="true" />
                      {activity.participantCount}
                    </p>
                  </div>
                </div>

                <Link
                  href={activity.actionHref}
                  prefetch={true}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  {activity.actionLabel}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
