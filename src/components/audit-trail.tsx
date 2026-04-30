'use client';

import { cn } from '@/lib/utils';

export type AuditTrailEntry = {
  title: string;
  by: string;
  at: string;
  comment?: string | null;
  variant?: 'default' | 'approved' | 'rejected';
};

type AuditTrailProps = {
  entries: AuditTrailEntry[];
  className?: string;
};

export default function AuditTrail({ entries, className }: AuditTrailProps) {
  if (entries.length === 0) {
    return (
      <p className={cn('text-sm text-muted-foreground', className)}>
        Sin movimientos registrados.
      </p>
    );
  }

  return (
    <ol className={cn('space-y-3', className)}>
      {entries.map((entry, index) => (
        <li key={`${entry.at}-${index}`} className="relative pl-4">
          <span className="absolute left-0 top-2 h-2.5 w-2.5 rounded-full bg-primary" />
          <div className="rounded-xl border bg-muted/20 p-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">{entry.title}</span>
              <span
                className={cn(
                  'rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
                  entry.variant === 'approved' &&
                    'border-emerald-200 bg-emerald-100 text-emerald-700',
                  entry.variant === 'rejected' &&
                    'border-rose-200 bg-rose-100 text-rose-700',
                  entry.variant === 'default' &&
                    'border-slate-200 bg-slate-100 text-slate-600'
                )}
              >
                {entry.by}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {new Date(entry.at).toLocaleString('es-AR', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </p>
            {entry.comment ? (
              <p className="mt-2 text-sm text-foreground">{entry.comment}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
