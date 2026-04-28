import './globals.css';
import type { ReactNode } from 'react';
import type { Viewport } from 'next';
import { Cormorant_Garamond, DM_Sans, JetBrains_Mono } from 'next/font/google';
import Navbar from '@/components/navbar';
import Footer from '@/components/footer';
import Providers from '@/components/providers';
import { prisma } from '@/lib/prisma';
import { isMercadoPagoTestingEnvironment } from '@/lib/mercadopago';
import { cn } from '@/lib/utils';

const fontHeading = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  display: 'swap',
  variable: '--font-heading',
});

const fontBody = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-body',
});

const fontMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-mono',
});

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
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={cn(fontHeading.variable, fontBody.variable, fontMono.variable)}
    >
      <body className="min-h-screen text-foreground flex flex-col font-body antialiased">
        <Providers>
          {isMercadoPagoTestingEnvironment() ? (
            <div className="w-full bg-yellow-300 text-yellow-950 text-sm font-semibold text-center py-2 px-4">
              Mercado Pago en modo TESTING
            </div>
          ) : null}
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
