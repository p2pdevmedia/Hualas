import './globals.css';
import type { ReactNode } from 'react';
import type { Viewport } from 'next';
import Navbar from '@/components/navbar';
import Footer from '@/components/footer';
import Providers from '@/components/providers';
import { prisma } from '@/lib/prisma';
import type { SiteSettings } from '@/types/site';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export async function generateMetadata() {
  const settings = await prisma.siteSetting.findUnique({ where: { id: 1 } });
  const iconUrl = settings?.favicon
    ? `https://gateway.pinata.cloud/ipfs/${settings.favicon}`
    : undefined;
  return {
    title: 'Hualas Club',
    description: 'Club Hualas management app',
    icons: iconUrl ? [{ url: iconUrl }] : undefined,
  };
}

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const settings: SiteSettings | null = await prisma.siteSetting.findUnique({
    where: { id: 1 },
  });
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-100 text-slate-900 antialiased">
        <Providers>
          <div className="relative flex min-h-screen flex-col overflow-hidden">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,118,110,0.08),_transparent_55%)]" />
            <div className="pointer-events-none absolute -top-48 -right-32 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-sky-200/40 blur-3xl" />
            <div className="relative flex min-h-screen flex-col">
              <Navbar />
              <main className="flex-1">
                <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">{children}</div>
              </main>
              <Footer settings={settings} />
            </div>
            <a
              href="https://wa.me/5491151298250"
              target="_blank"
              rel="noopener noreferrer"
              className="group fixed bottom-6 right-6 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-xl shadow-emerald-500/30 transition-all hover:translate-y-[-2px] hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2"
              aria-label="Contactar por WhatsApp"
            >
              <span className="text-base">💬</span>
              <span className="hidden sm:inline">WhatsApp</span>
            </a>
          </div>
        </Providers>
      </body>
    </html>
  );
}
