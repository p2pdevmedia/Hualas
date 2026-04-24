'use client';

import { useTranslation } from './language-provider';

export default function HomeHeading() {
  const t = useTranslation();
  return (
    <div className="mb-8 py-6 text-center">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t.home.welcome}</h1>
      <p className="mt-2 text-muted-foreground">San Martín de los Andes · Patagonia Argentina ⛰️</p>
    </div>
  );
}
