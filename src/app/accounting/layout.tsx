import Link from 'next/link';
import type { ReactNode } from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { Box, Flex, Text, Heading, Container } from '@radix-ui/themes';
import { authOptions } from '@/lib/auth';
import { isAccountingRole } from '@/lib/accounting';

const links = [
  { href: '/accounting', label: 'Resumen' },
  { href: '/accounting/movements', label: 'Movimientos' },
  { href: '/accounting/payments', label: 'Pagos MP' },
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
    <Container>
      <Box className="flex flex-col gap-6 py-6">
        <header className="space-y-3">
          <Box className="space-y-1">
            <Text size="2" weight="medium" color="cyan" className="uppercase tracking-[0.2em]">
              Contaduría
            </Text>
            <Heading size="9">Gestión financiera del club</Heading>
            <Text size="2" color="gray" className="max-w-3xl">
              Registra movimientos manuales, revisa pagos de Mercado Pago y genera
              reportes del período.
            </Text>
          </Box>

          <Flex gap="2" wrap="wrap">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                {link.label}
              </Link>
            ))}
          </Flex>
        </header>

        {children}
      </Box>
    </Container>
  );
}
