import './globals.css';
import type { ReactNode } from 'react';
import type { Viewport } from 'next';
import Navbar from '@/components/navbar';
import Footer from '@/components/footer';
import Providers from '@/components/providers';
import { prisma } from '@/lib/prisma';
import type { SiteSettings } from '@/types/site';

export const dynamic = 'force-dynamic';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export async function generateMetadata() {
  const settings = await getSiteSettings();
  const iconUrl = settings?.favicon
    ? `https://gateway.pinata.cloud/ipfs/${settings.favicon}`
    : undefined;
  return {
    title: 'Hualas Club',
    description: 'Club de montaña en San Martín de los Andes, Patagonia',
    icons: iconUrl ? [{ url: iconUrl }] : undefined,
  };
}

async function getSiteSettings() {
  try {
    return await prisma.siteSetting.findUnique({ where: { id: 1 } });
  } catch {
    return null;
  }
}

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const settings: SiteSettings | null = await getSiteSettings();

  return (
    <html lang="es">
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
