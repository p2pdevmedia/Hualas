'use client';

import type { SiteSettings } from '@/types/site';
import { Instagram, Youtube } from 'lucide-react';

export default function Footer({ settings }: { settings: SiteSettings | null }) {
  return (
    <footer
      className="px-4 py-8 text-white"
      style={{ backgroundColor: settings?.footerColor || '#1e293b' }}
    >
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-lg font-semibold">Club Hualas Patagónico</p>
          <div className="flex flex-wrap justify-center gap-6">
            <a
              href="https://www.instagram.com/hualas_patagonico/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 opacity-80 transition-opacity hover:opacity-100"
              aria-label="Instagram"
            >
              <Instagram className="h-5 w-5" />
              <span className="text-sm">@hualas_patagonico</span>
            </a>
            <a
              href="https://youtube.com/@escuelademontanahualas?si=j8VEKHbe9IRhXsw4"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 opacity-80 transition-opacity hover:opacity-100"
              aria-label="YouTube"
            >
              <Youtube className="h-5 w-5" />
              <span className="text-sm">@escuelademontanahualas</span>
            </a>
          </div>
          <p className="text-sm opacity-60">
            San Martín de los Andes, Neuquén, Argentina 🇦🇷
          </p>
        </div>
      </div>
    </footer>
  );
}
