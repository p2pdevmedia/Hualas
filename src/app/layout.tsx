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

export async function generateMetadata() {
  const IPFS_HASH = 'QmToPhMQe1dqt7aVAoPumwkqyRhR2EjnvCmw1stPjCpvq3';
  return {
    title: 'Hualas Club',
    description: 'Club de montaña en San Martín de los Andes, Patagonia',
    icons: [{ url: `https://gateway.pinata.cloud/ipfs/${IPFS_HASH}` }],
  };
}

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen text-foreground flex flex-col font-body">
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
