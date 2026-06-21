'use client';

import Link from 'next/link';
import {
  CLUB_CONTACT_EMAIL,
  CLUB_WHATSAPP_DISPLAY,
  CLUB_WHATSAPP_URL,
} from '@/lib/club-contact';

export default function Footer() {
  return (
    <footer className="px-4 py-8 text-white bg-[#393f45]">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-col items-center gap-8 text-center">
          <p className="text-lg font-semibold">Club Hualas Patagónico</p>

          {/* Links */}
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <Link
              href="/"
              className="opacity-80 hover:opacity-100 transition-opacity"
            >
              Inicio
            </Link>
            <Link
              href="/contact"
              className="opacity-80 hover:opacity-100 transition-opacity"
            >
              Contacto
            </Link>
            <Link
              href="/faq"
              className="opacity-80 hover:opacity-100 transition-opacity"
            >
              Preguntas Frecuentes
            </Link>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <a
              href={CLUB_WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-80 hover:opacity-100 transition-opacity"
            >
              WhatsApp {CLUB_WHATSAPP_DISPLAY}
            </a>
            <a
              href={`mailto:${CLUB_CONTACT_EMAIL}`}
              className="opacity-80 hover:opacity-100 transition-opacity"
            >
              {CLUB_CONTACT_EMAIL}
            </a>
          </div>

          {/* Social Media */}
          <div className="flex flex-wrap justify-center gap-6">
            <a
              href="https://www.instagram.com/hualas_patagonico/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 opacity-80 transition-opacity hover:opacity-100"
              aria-label="Instagram"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4.1" />
                <circle
                  cx="17.2"
                  cy="6.8"
                  r="1"
                  fill="currentColor"
                  stroke="none"
                />
              </svg>
              <span className="text-sm">@hualas_patagonico</span>
            </a>
            <a
              href="https://youtube.com/@escuelademontanahualas?si=j8VEKHbe9IRhXsw4"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 opacity-80 transition-opacity hover:opacity-100"
              aria-label="YouTube"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="currentColor"
              >
                <path d="M21.8 8.2c-.2-.8-.8-1.4-1.6-1.6C18.6 6.2 12 6.2 12 6.2s-6.6 0-8.2.4c-.8.2-1.4.8-1.6 1.6-.4 1.6-.4 3.9-.4 3.9s0 2.3.4 3.9c.2.8.8 1.4 1.6 1.6 1.6.4 8.2.4 8.2.4s6.6 0 8.2-.4c.8-.2 1.4-.8 1.6-1.6.4-1.6.4-3.9.4-3.9s0-2.3-.4-3.9ZM10.1 15.1v-6l5.2 3-5.2 3Z" />
              </svg>
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
