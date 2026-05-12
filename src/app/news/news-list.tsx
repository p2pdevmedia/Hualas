'use client';

import { Pencil, Save, X } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

type NewsMediaItem = {
  id: string;
  type: 'IMAGE' | 'VIDEO';
  fileName: string | null;
};

type ActivityOption = {
  id: string;
  name: string;
};

export type NewsListItem = {
  id: string;
  title: string;
  body: string;
  scope: 'CLUB' | 'ACTIVITY';
  activityId: string | null;
  scopeLabel: string;
  createdAtLabel: string;
  creatorLabel: string;
  isRead: boolean;
  media: NewsMediaItem[];
};

type NewsReadState = Record<string, boolean>;

type NewsListProps = {
  items: NewsListItem[];
  canEdit?: boolean;
  activities?: ActivityOption[];
};

const BATCH_DELAY_MS = 350;

export default function NewsList({
  items,
  canEdit = false,
  activities = [],
}: NewsListProps) {
  const router = useRouter();
  const [readState, setReadState] = useState<NewsReadState>(() =>
    Object.fromEntries(items.map((item) => [item.id, item.isRead]))
  );
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editScope, setEditScope] = useState<'CLUB' | 'ACTIVITY'>('CLUB');
  const [submittingEditId, setSubmittingEditId] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [updatedId, setUpdatedId] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementsRef = useRef(new Map<string, HTMLElement>());
  const queuedIdsRef = useRef(new Set<string>());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readStateRef = useRef(readState);
  const firstActivityId = useMemo(() => activities[0]?.id ?? '', [activities]);

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

  function startEditing(item: NewsListItem) {
    setEditingId(item.id);
    setEditScope(item.scope);
    setEditError(null);
    setUpdatedId(null);
  }

  async function handleEditSubmit(
    item: NewsListItem,
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setSubmittingEditId(item.id);
    setEditError(null);
    setUpdatedId(null);

    const formData = new FormData(event.currentTarget);
    formData.set('scope', editScope);
    if (editScope === 'CLUB') {
      formData.delete('activityId');
    }

    try {
      const response = await fetch(`/api/news/${item.id}`, {
        method: 'PUT',
        body: formData,
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setEditError(data.error ?? 'No se pudo actualizar la noticia');
        return;
      }

      setEditingId(null);
      setUpdatedId(item.id);
      router.refresh();
    } catch {
      setEditError('No se pudo conectar con el servidor');
    } finally {
      setSubmittingEditId(null);
    }
  }

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

            {canEdit && (
              <div className="mt-3 flex justify-end">
                {editingId === item.id ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setEditError(null);
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-muted"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                    Cancelar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => startEditing(item)}
                    className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-muted"
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    Editar
                  </button>
                )}
              </div>
            )}

            <p className="mt-2 text-sm text-muted-foreground">
              Publicado por {item.creatorLabel}
            </p>

            {editingId === item.id ? (
              <form
                onSubmit={(event) => handleEditSubmit(item, event)}
                className="mt-4 space-y-4 border-t pt-4"
              >
                {editError && (
                  <p className="text-sm font-medium text-red-700">
                    {editError}
                  </p>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-1 text-sm font-medium">
                    Título
                    <input
                      name="title"
                      maxLength={160}
                      required
                      defaultValue={item.title}
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    />
                  </label>
                  <fieldset className="space-y-2 text-sm font-medium">
                    <legend>Destinatarios</legend>
                    <label className="flex items-center gap-2 rounded-lg border px-3 py-2 font-normal">
                      <input
                        type="radio"
                        name="scopeChoice"
                        checked={editScope === 'CLUB'}
                        onChange={() => setEditScope('CLUB')}
                      />
                      Para todo el club
                    </label>
                    <label className="flex items-center gap-2 rounded-lg border px-3 py-2 font-normal">
                      <input
                        type="radio"
                        name="scopeChoice"
                        checked={editScope === 'ACTIVITY'}
                        onChange={() => setEditScope('ACTIVITY')}
                        disabled={activities.length === 0}
                      />
                      Por actividad
                    </label>
                  </fieldset>
                </div>

                {editScope === 'ACTIVITY' && (
                  <label className="block space-y-1 text-sm font-medium">
                    Actividad
                    <select
                      name="activityId"
                      required
                      defaultValue={item.activityId ?? firstActivityId}
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    >
                      {activities.map((activity) => (
                        <option key={activity.id} value={activity.id}>
                          {activity.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <label className="block space-y-1 text-sm font-medium">
                  Texto de la noticia
                  <textarea
                    name="body"
                    required
                    rows={6}
                    defaultValue={item.body}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  />
                </label>

                <button
                  type="submit"
                  disabled={submittingEditId === item.id}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save className="h-4 w-4" aria-hidden="true" />
                  {submittingEditId === item.id
                    ? 'Guardando...'
                    : 'Guardar cambios'}
                </button>
              </form>
            ) : (
              <>
                {updatedId === item.id && (
                  <p className="mt-3 text-sm font-medium text-green-700">
                    Noticia actualizada.
                  </p>
                )}
                <div className="mt-4 whitespace-pre-wrap leading-7 text-foreground/90">
                  {item.body}
                </div>
              </>
            )}

            {editingId !== item.id && item.media.length > 0 && (
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
