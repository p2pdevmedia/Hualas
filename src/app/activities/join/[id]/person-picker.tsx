'use client';

import { useState } from 'react';
import Image from 'next/image';

type PersonOption = {
  id: string;
  label: string;
  photoUrl: string;
  missingFields?: string[];
};

export function Avatar({ src, name }: { src: string; name: string }) {
  const [error, setError] = useState(false);
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  if (error || !src) {
    return (
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
        {initials}
      </div>
    );
  }

  return (
    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full">
      <Image
        src={src}
        alt={name}
        fill
        unoptimized
        className="object-cover"
        onError={() => setError(true)}
      />
    </div>
  );
}

export default function PersonPicker({
  people,
  value,
  onChange,
}: {
  people: PersonOption[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-wide text-muted-foreground font-body">
        Para quién
      </p>
      <div className="flex flex-wrap gap-2">
        {people.map((person) => {
          const selected = value === person.id;
          return (
            <button
              key={person.id}
              type="button"
              onClick={() => onChange(person.id)}
              className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                selected
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-background hover:bg-muted/40'
              }`}
            >
              <Avatar src={person.photoUrl} name={person.label} />
              <span className={selected ? 'font-semibold' : 'font-medium'}>
                {person.label}
              </span>
              {(person.missingFields?.length ?? 0) > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                  Datos pendientes
                </span>
              )}
              {selected && (
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
