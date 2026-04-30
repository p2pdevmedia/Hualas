import Link from 'next/link';
import type { ReactNode } from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { isAccountingRole } from '@/lib/accounting';

const links = [
  { href: '/accounting', label: 'Resumen' },
  { href: '/accounting/social-fee', label: 'Cuota social' },
  { href: '/accounting/movements', label: 'Movimientos' },
  { href: '/accounting/payments', label: 'Pagos MP' },
  { href: '/accounting/manual-payments', label: 'Pagos manuales' },
  { href: '/accounting/reports', label: 'Reportes' },
] as const;

export default async function AccountingLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!isAccountingRole(session?.user?.role)) {
    redirect('/');
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
      <header className="space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
            Contaduría
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            Gestión financiera del club
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Registra movimientos manuales, revisa pagos de Mercado Pago y
            transferencias bancarias, y genera reportes del período.
          </p>
        </div>

        <nav className="flex flex-wrap gap-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>

      {children}
    </div>
  );
}
