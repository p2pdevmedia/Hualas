'use client';

import type { SiteSettings } from '@/types/site';
import { Instagram, Youtube } from 'lucide-react';

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
      <p className="mt-2">¡Seguinos en nuestras redes!</p>
      <div className="mt-2 flex flex-col items-center gap-2">
        <a
          href="https://www.instagram.com/hualas_patagonico/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2"
          aria-label="Instagram"
        >
          <Instagram />
          <span>@hualas_patagonico</span>
        </a>
        <a
          href="https://youtube.com/@escuelademontanahualas?si=j8VEKHbe9IRhXsw4"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2"
          aria-label="YouTube"
        >
          <Youtube />
          <span>@escuelademontanahualas</span>
        </a>
      </div>
      <p className="mt-2">
        Club Social y Deportivo Hualas Patagónico.
        <br />
        ⛰️San Martín de los Andes, Neuquén, Patagonia Argentina. 🇦🇷
      </p>
    </footer>
  );
}
