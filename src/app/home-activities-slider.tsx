'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, CalendarDays, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

export type HomeActivitySlide = {
  id: string;
  name: string;
  description: string;
  dateLabel: string | null;
  capacityLabel: string;
  priceLabel: string;
  typeLabel: string;
  imageUrl: string | null;
};

type HomeActivitiesSliderProps = {
  activities: HomeActivitySlide[];
};

export default function HomeActivitiesSlider({
  activities,
}: HomeActivitiesSliderProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeActivity = activities[activeIndex];

  const hasMultipleSlides = activities.length > 1;

  const controls = useMemo(
    () => ({
      previous: () =>
        setActiveIndex((current) =>
          current === 0 ? activities.length - 1 : current - 1
        ),
      next: () =>
        setActiveIndex((current) =>
          current === activities.length - 1 ? 0 : current + 1
        ),
    }),
    [activities.length]
  );

  useEffect(() => {
    if (!hasMultipleSlides) return;

    const timer = window.setInterval(() => {
      controls.next();
    }, 7000);

    return () => window.clearInterval(timer);
  }, [controls, hasMultipleSlides]);

  if (!activeActivity) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-lg border bg-muted/40 px-6 text-center text-muted-foreground">
        <p>No hay actividades disponibles por el momento.</p>
      </div>
    );
  }

  return (
    <section aria-label="Próximas actividades" className="space-y-4">
      <div className="relative min-h-[420px] overflow-hidden rounded-lg border bg-[#263832] shadow-sm">
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-500"
          style={
            activeActivity.imageUrl
              ? { backgroundImage: `url(${activeActivity.imageUrl})` }
              : {
                  background:
                    'linear-gradient(135deg, #2f8372 0%, #49BDA6 55%, #f59e0b 100%)',
                }
          }
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-black/15"
          aria-hidden="true"
        />

        <div className="relative flex min-h-[420px] flex-col justify-between p-5 text-white sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide backdrop-blur">
              {activeActivity.typeLabel}
            </span>

            {hasMultipleSlides && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={controls.previous}
                  className="grid h-10 w-10 place-items-center rounded-full border border-white/30 bg-white/15 transition hover:bg-white/25"
                  aria-label="Actividad anterior"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={controls.next}
                  className="grid h-10 w-10 place-items-center rounded-full border border-white/30 bg-white/15 transition hover:bg-white/25"
                  aria-label="Actividad siguiente"
                >
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>

          <div className="max-w-2xl space-y-4">
            {activeActivity.dateLabel && (
              <p className="inline-flex items-center gap-2 text-sm font-medium text-white/85">
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                {activeActivity.dateLabel}
              </p>
            )}

            <div className="space-y-3">
              <h3 className="text-3xl font-semibold leading-tight sm:text-4xl">
                {activeActivity.name}
              </h3>
              <p className="max-w-xl text-base leading-7 text-white/88">
                {activeActivity.description}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-white/90">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 backdrop-blur">
                <Users className="h-4 w-4" aria-hidden="true" />
                {activeActivity.capacityLabel}
              </span>
              <span className="rounded-full bg-white/15 px-3 py-1.5 font-semibold backdrop-blur">
                {activeActivity.priceLabel}
              </span>
            </div>

            <Link
              href={`/activities/join/${activeActivity.id}`}
              prefetch={true}
              className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-[#263832] transition hover:bg-white/90"
            >
              Ver actividad
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>

      {hasMultipleSlides && (
        <div className="flex flex-wrap gap-2" aria-label="Seleccionar actividad">
          {activities.map((activity, index) => (
            <button
              key={activity.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`h-2.5 rounded-full transition-all ${
                index === activeIndex
                  ? 'w-8 bg-primary'
                  : 'w-2.5 bg-muted-foreground/35 hover:bg-muted-foreground/55'
              }`}
              aria-label={`Mostrar ${activity.name}`}
              aria-current={index === activeIndex}
            />
          ))}
        </div>
      )}
    </section>
  );
}
