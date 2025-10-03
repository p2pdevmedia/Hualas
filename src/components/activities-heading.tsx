'use client';

import { useTranslation } from './language-provider';

export default function ActivitiesHeading() {
  const t = useTranslation();
  return (
    <div className="space-y-1">
      <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
        {t.nav.activities}
      </h1>
      <p className="text-sm text-slate-500">
        Gestioná las propuestas disponibles y mantené informada a la comunidad.
      </p>
    </div>
  );
}
