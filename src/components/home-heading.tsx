'use client';

import { useTranslation } from './language-provider';

export default function HomeHeading() {
  const t = useTranslation();
  return <h1 className="mb-4 text-2xl font-bold">{t.home.welcome}</h1>;
}
