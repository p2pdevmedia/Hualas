'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useMemo, useState } from 'react';

type ActivityOption = {
  id: string;
  name: string;
};

type CreateNewsFormProps = {
  activities: ActivityOption[];
};

export default function CreateNewsForm({ activities }: CreateNewsFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<'CLUB' | 'ACTIVITY'>('CLUB');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const firstActivityId = useMemo(() => activities[0]?.id ?? '', [activities]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    formData.set('scope', scope);
    if (scope === 'CLUB') {
      formData.delete('activityId');
    }

    try {
      const response = await fetch('/api/news', {
        method: 'POST',
        body: formData,
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? 'No se pudo crear la noticia');
        return;
      }

      event.currentTarget.reset();
      setScope('CLUB');
      setOpen(false);
      setMessage('Noticia creada y notificaciones enviadas.');
      router.refresh();
    } catch {
      setError('No se pudo conectar con el servidor');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Noticias institucionales</h2>
          <p className="text-sm text-muted-foreground">
            Creá novedades para todo el club o para personas vinculadas a una
            actividad.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90"
        >
          {open ? 'Cerrar' : 'Crear noticia'}
        </button>
      </div>

      {message && (
        <p className="mt-3 text-sm font-medium text-green-700">{message}</p>
      )}
      {error && (
        <p className="mt-3 text-sm font-medium text-red-700">{error}</p>
      )}

      {open && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4 border-t pt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm font-medium">
              Título
              <input
                name="title"
                maxLength={160}
                required
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                placeholder="Ej: Asamblea anual del club"
              />
            </label>
            <fieldset className="space-y-2 text-sm font-medium">
              <legend>Destinatarios</legend>
              <label className="flex items-center gap-2 rounded-lg border px-3 py-2 font-normal">
                <input
                  type="radio"
                  name="scopeChoice"
                  checked={scope === 'CLUB'}
                  onChange={() => setScope('CLUB')}
                />
                Para todo el club
              </label>
              <label className="flex items-center gap-2 rounded-lg border px-3 py-2 font-normal">
                <input
                  type="radio"
                  name="scopeChoice"
                  checked={scope === 'ACTIVITY'}
                  onChange={() => setScope('ACTIVITY')}
                  disabled={activities.length === 0}
                />
                Por actividad
              </label>
            </fieldset>
          </div>

          {scope === 'ACTIVITY' && (
            <label className="block space-y-1 text-sm font-medium">
              Actividad
              <select
                name="activityId"
                required
                defaultValue={firstActivityId}
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
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              placeholder="Escribí el comunicado, indicaciones, fechas o información importante..."
            />
          </label>

          <label className="block space-y-1 text-sm font-medium">
            Imágenes o videos
            <input
              name="media"
              type="file"
              accept="image/*,video/*"
              multiple
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
            <span className="block text-xs font-normal text-muted-foreground">
              Hasta 6 archivos. Imágenes hasta 8 MB y videos hasta 80 MB cada
              uno.
            </span>
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Publicando...' : 'Publicar noticia'}
          </button>
        </form>
      )}
    </div>
  );
}
