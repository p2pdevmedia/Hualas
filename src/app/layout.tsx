import type { Metadata } from 'next';
import { Theme } from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';
import './globals.css';
import type { ReactNode } from 'react';
import type { Viewport } from 'next';
import Navbar from '@/components/navbar';
import Footer from '@/components/footer';
import Providers from '@/components/providers';
import { isMercadoPagoTestingEnvironment } from '@/lib/mercadopago';

export const dynamic = 'force-dynamic';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'Hualas Club',
  description: 'Club de montaña en San Martín de los Andes, Patagonia',
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen text-foreground flex flex-col font-body">
        <Theme appearance="light" accentColor="grass" grayColor="mauve">
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
        </Theme>
      </body>
    </html>
  );
}
