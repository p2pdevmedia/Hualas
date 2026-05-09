import Link from 'next/link';
import { cn } from '@/lib/utils';

type MovementTab = {
  href: string;
  label: string;
  description: string;
  active: boolean;
};

export default function MovementTabs({
  active,
}: {
  active: 'history' | 'activities';
}) {
  const tabs: MovementTab[] = [
    {
      href: '/accounting/movements',
      label: 'Historial',
      description: 'Todos los movimientos y pagos',
      active: active === 'history',
    },
    {
      href: '/accounting/movements/activities',
      label: 'Actividades',
      description: 'Resumen contable por actividad',
      active: active === 'activities',
    },
  ];

  return (
    <nav
      className="grid gap-2 sm:grid-cols-2"
      aria-label="Secciones de movimientos"
    >
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          prefetch={true}
          className={cn(
            'rounded-2xl border p-4 transition-colors hover:bg-muted/50',
            tab.active
              ? 'border-primary bg-primary/10 text-primary shadow-sm'
              : 'bg-card text-foreground'
          )}
          aria-current={tab.active ? 'page' : undefined}
        >
          <span className="block text-sm font-semibold">{tab.label}</span>
          <span className="mt-1 block text-xs text-muted-foreground">
            {tab.description}
          </span>
        </Link>
      ))}
    </nav>
  );
}
