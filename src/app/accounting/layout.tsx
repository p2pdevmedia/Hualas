import Link from 'next/link';
import type { ReactNode } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { gateAccounting } from '@/lib/role-guards';

const links = [
  { href: '/accounting', label: 'Resumen' },
  { href: '/accounting/social-fee', label: 'Cuota social' },
  { href: '/accounting/debt-by-family', label: 'Deuda familiar' },
  { href: '/accounting/movements', label: 'Movimientos' },
  { href: '/accounting/professors', label: 'Profesores' },
  { href: '/accounting/reports', label: 'Reportes' },
] as const;

export default async function AccountingLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const block = gateAccounting(session);
  if (block) {
    return <div className="mx-auto max-w-6xl px-4 py-10">{block}</div>;
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
              prefetch={true}
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
