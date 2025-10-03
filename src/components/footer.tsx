'use client';

import type { SiteSettings } from '@/types/site';
import { Instagram, Youtube } from 'lucide-react';

export default function Footer({
  settings,
}: {
  settings: SiteSettings | null;
}) {
  const footerStyle = settings?.footerColor
    ? { backgroundColor: `${settings.footerColor}e6` }
    : undefined;
  return (
    <footer
      className="border-t border-white/60 bg-white/80 text-slate-600 backdrop-blur"
      style={footerStyle}
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-6 px-4 py-10 text-center sm:px-6">
        <div className="inline-flex items-center gap-3 rounded-full bg-white/70 px-4 py-2 text-sm font-semibold text-emerald-600 shadow-sm">
          <span className="text-lg">💚</span>
          <span>Seguinos en nuestras redes</span>
        </div>
        <div className="flex flex-col items-center gap-3 text-slate-500 sm:flex-row sm:gap-6">
          <a
            href="https://www.instagram.com/hualas_patagonico/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-4 py-2 text-sm font-medium transition hover:border-emerald-400 hover:text-emerald-600"
            aria-label="Instagram"
          >
            <Instagram className="h-4 w-4" />
            <span>@hualas_patagonico</span>
          </a>
          <a
            href="https://youtube.com/@escuelademontanahualas?si=j8VEKHbe9IRhXsw4"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-4 py-2 text-sm font-medium transition hover:border-emerald-400 hover:text-emerald-600"
            aria-label="YouTube"
          >
            <Youtube className="h-4 w-4" />
            <span>@escuelademontanahualas</span>
          </a>
        </div>
        <p className="max-w-xl text-sm text-slate-500">
          Club Social y Deportivo Hualas Patagónico.<br />
          ⛰️ San Martín de los Andes, Neuquén, Patagonia Argentina. 🇦🇷
        </p>
      </div>
    </footer>
  );
}
