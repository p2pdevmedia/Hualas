'use client';

import { useTranslation } from './language-provider';

export default function ActivitiesHeading() {
  const t = useTranslation();
  return <h1 className="text-2xl font-bold">{t.nav.activities}</h1>;
}
