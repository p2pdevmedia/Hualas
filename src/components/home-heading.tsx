'use client';

import Link from 'next/link';
import { useTranslation } from './language-provider';
import { buttonVariants } from './ui/button';
import { cn } from '@/lib/utils';

export default function HomeHeading() {
  const t = useTranslation();
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-600 px-8 py-12 text-white shadow-2xl shadow-slate-900/30">
      <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-emerald-400/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 left-12 h-40 w-40 rounded-full bg-sky-400/40 blur-3xl" />
      <div className="relative max-w-2xl space-y-4">
        <span className="inline-flex items-center rounded-full bg-white/10 px-4 py-1 text-sm font-medium text-emerald-200">
          Club de montaña y aventura
        </span>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {t.home.welcome}
        </h1>
        <p className="text-base text-slate-200 sm:text-lg">
          Disfrutá de experiencias inolvidables en la Patagonia argentina con una
          comunidad apasionada por la naturaleza y el deporte al aire libre.
        </p>
        <div className="flex flex-wrap gap-3 pt-4">
          <Link
            href="/register"
            className={cn(
              buttonVariants({ variant: 'secondary', size: 'lg' }),
              'shadow-xl shadow-slate-900/20'
            )}
          >
            Explorar actividades
          </Link>
          <Link
            href="/contact"
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'lg' }),
              'border border-white/20 text-white hover:bg-white/10 hover:text-white focus-visible:ring-white/40'
            )}
          >
            Conversemos
          </Link>
        </div>
      </div>
    </section>
  );
}
