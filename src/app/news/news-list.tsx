'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';

type NewsMediaItem = {
  id: string;
  type: 'IMAGE' | 'VIDEO';
  fileName: string | null;
};

export type NewsListItem = {
  id: string;
  title: string;
  body: string;
  scopeLabel: string;
  createdAtLabel: string;
  creatorLabel: string;
  isRead: boolean;
  media: NewsMediaItem[];
};

type NewsReadState = Record<string, boolean>;

type NewsListProps = {
  items: NewsListItem[];
};

const BATCH_DELAY_MS = 350;

export default function NewsList({ items }: NewsListProps) {
  const [readState, setReadState] = useState<NewsReadState>(() =>
    Object.fromEntries(items.map((item) => [item.id, item.isRead]))
  );
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementsRef = useRef(new Map<string, HTMLElement>());
  const queuedIdsRef = useRef(new Set<string>());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readStateRef = useRef(readState);

  useEffect(() => {
    setReadState((current) => ({
      ...current,
      ...Object.fromEntries(
        items.map((item) => [item.id, Boolean(current[item.id] || item.isRead)])
      ),
    }));
  }, [items]);

  useEffect(() => {
    readStateRef.current = readState;
  }, [readState]);

  const flushQueue = useCallback(async () => {
    timerRef.current = null;
    const ids = Array.from(queuedIdsRef.current).filter(
      (id) => !readStateRef.current[id]
    );
    queuedIdsRef.current.clear();

    if (ids.length === 0) return;

    setPendingIds((current) => {
      const next = new Set(current);
      ids.forEach((id) => next.add(id));
      return next;
    });
    setError(null);

    try {
      const response = await fetch('/api/news/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newsIds: ids }),
      });

      if (!response.ok) throw new Error('No se pudo marcar como leída');

      const data = (await response.json()) as { readableIds?: string[] };
      const markedIds = data.readableIds ?? ids;

      setReadState((current) => ({
        ...current,
        ...Object.fromEntries(markedIds.map((id) => [id, true])),
      }));
    } catch (err) {
      console.error('[news] mark read failed', err);
      setError(
        'No pudimos actualizar el estado de lectura. Probá actualizar la página.'
      );
    } finally {
      setPendingIds((current) => {
        const next = new Set(current);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    }
  }, []);

  const queueRead = useCallback(
    (id: string) => {
      if (readStateRef.current[id]) return;
      queuedIdsRef.current.add(id);

      if (!timerRef.current) {
        timerRef.current = setTimeout(flushQueue, BATCH_DELAY_MS);
      }
    },
    [flushQueue]
  );

  const registerArticle = useCallback(
    (id: string) => (node: HTMLElement | null) => {
      const previous = elementsRef.current.get(id);
      if (previous) observerRef.current?.unobserve(previous);

      if (!node) {
        elementsRef.current.delete(id);
        return;
      }

      elementsRef.current.set(id, node);
      observerRef.current?.observe(node);
    },
    []
  );

  useEffect(() => {
    observerRef.current?.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = entry.target.getAttribute('data-news-id');
          if (!id) return;
          queueRead(id);
          observerRef.current?.unobserve(entry.target);
        });
      },
      { threshold: 0.55 }
    );

    elementsRef.current.forEach((element) =>
      observerRef.current?.observe(element)
    );

    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, [queueRead]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  return (
    <section className="space-y-4" aria-label="Listado de noticias">
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {items.map((item) => {
        const isRead = readState[item.id] ?? item.isRead;
        const isPending = pendingIds.has(item.id);

        return (
          <article
            id={item.id}
            key={item.id}
            ref={registerArticle(item.id)}
            data-news-id={item.id}
            className="scroll-mt-24 rounded-2xl border bg-card p-5 shadow-sm"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {item.scopeLabel}
                  </span>
                  {!isRead && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      {isPending ? 'Marcando…' : 'No leído'}
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-semibold tracking-tight">
                  {item.title}
                </h2>
              </div>
              <p className="text-sm text-muted-foreground">
                {item.createdAtLabel}
              </p>
            </div>

            <p className="mt-2 text-sm text-muted-foreground">
              Publicado por {item.creatorLabel}
            </p>

            <div className="mt-4 whitespace-pre-wrap leading-7 text-foreground/90">
              {item.body}
            </div>

            {item.media.length > 0 && (
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {item.media.map((media) => {
                  const src = `/api/news/${media.id}/media`;
                  return media.type === 'IMAGE' ? (
                    <div
                      key={media.id}
                      className="relative aspect-video overflow-hidden rounded-xl border bg-muted"
                    >
                      <Image
                        src={src}
                        alt={media.fileName ?? item.title}
                        fill
                        unoptimized
                        className="object-cover"
                        sizes="(min-width: 768px) 50vw, 100vw"
                      />
                    </div>
                  ) : (
                    <video
                      key={media.id}
                      src={src}
                      controls
                      className="aspect-video w-full rounded-xl border bg-black"
                    >
                      Tu navegador no puede reproducir este video.
                    </video>
                  );
                })}
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
}
