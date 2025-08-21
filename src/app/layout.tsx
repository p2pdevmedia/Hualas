import './globals.css';
import type { ReactNode } from 'react';
import Navbar from '@/components/navbar';
import Footer from '@/components/footer';
import Providers from '@/components/providers';
import { prisma } from '@/lib/prisma';
import type { SiteSettings } from '@/types/site';

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
      <body
        className="min-h-screen text-foreground flex flex-col"
        style={{ backgroundColor: settings?.backgroundColor || undefined }}
      >
        <Providers>
          <Navbar settings={settings} />
          <main className="flex-1">{children}</main>
          <Footer settings={settings} />
        </Providers>
      </body>
    </html>
  );
}
