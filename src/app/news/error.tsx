'use client';

export default function NewsError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-destructive">
          Noticias
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          No pudimos abrir la página de noticias
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Ocurrió un problema al cargar los comunicados. Probá de nuevo y, si el
          error continúa, avisale a administración.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90"
        >
          Reintentar
        </button>
      </div>
    </main>
  );
}
