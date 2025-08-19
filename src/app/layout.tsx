import './globals.css';
import type { ReactNode } from 'react';
import Navbar from '@/components/navbar';
import Providers from '@/components/providers';

export const metadata = {
  title: 'Hualas Club',
  description: 'Club Hualas management app',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground">
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
