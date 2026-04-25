import './globals.css';
import type { ReactNode } from 'react';
import type { Viewport } from 'next';
import { Cormorant_Garamond, DM_Sans } from 'next/font/google';
import Navbar from '@/components/navbar';
import Footer from '@/components/footer';
import Providers from '@/components/providers';
import { prisma } from '@/lib/prisma';
import type { SiteSettings } from '@/types/site';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-heading',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

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
    description: 'Club de montaña en San Martín de los Andes, Patagonia',
    icons: iconUrl ? [{ url: iconUrl }] : undefined,
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const settings: SiteSettings | null = await prisma.siteSetting.findUnique({
    where: { id: 1 },
  });
  return (
    <html lang="es" className={`${cormorant.variable} ${dmSans.variable}`}>
      <body
        className="min-h-screen text-foreground flex flex-col font-body"
        style={{ backgroundColor: settings?.backgroundColor || undefined }}
      >
        <Providers>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer settings={settings} />
        </Providers>
      </body>
    </html>
  );
}
