'use client';

import type { SiteSettings } from '@/types/site';

export default function Footer({
  settings,
}: {
  settings: SiteSettings | null;
}) {
  return (
    <footer
      className="flex flex-col items-center justify-center px-4 py-6 text-white text-center"
      style={{ backgroundColor: settings?.footerColor || '#1e293b' }}
    >
      <p className="text-2xl">💚</p>
      <p className="mt-2">
        ¡Seguinos en Instagram!
        <br />
        <a
          href="https://www.instagram.com/hualas_patagonico/"
          target="_blank"
          rel="noopener noreferrer"
        >
          @hualas_patagonico
        </a>
      </p>
      <p className="mt-2">
        Club Social y Deportivo Hualas Patagónico.
        <br />
        ⛰️San Martín de los Andes, Neuquén, Patagonia Argentina. 🇦🇷
      </p>
    </footer>
  );
}
