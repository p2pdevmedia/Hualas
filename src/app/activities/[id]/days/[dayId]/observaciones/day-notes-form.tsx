'use client';

import { useEffect, useState } from 'react';
import { saveOrQueueProfessorMutation } from '@/lib/offline/professor-workflow';

async function saveDayField(
  dayId: string,
  field: 'planificacion' | 'devolucion',
  value: string
): Promise<{ savedLocally: boolean }> {
  return saveOrQueueProfessorMutation({
    url: `/api/activity-days/${dayId}`,
    method: 'PATCH',
    body: { [field]: value },
    dedupeKey: `activity-day:${dayId}:${field}`,
  });
}

function NoteCard({
  label,
  placeholder,
  initialValue,
  onSave,
}: {
  label: string;
  placeholder: string;
  initialValue: string;
  onSave: (value: string) => Promise<{ savedLocally: boolean }>;
}) {
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedLocally, setSavedLocally] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onSynced = () => {
      if (savedLocally) setSavedLocally(false);
    };
    window.addEventListener('hualas-mutations-synced', onSynced);
    return () =>
      window.removeEventListener('hualas-mutations-synced', onSynced);
  }, [savedLocally]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setSavedLocally(false);
    setError('');
    try {
      const result = await onSave(value);
      if (result.savedLocally) {
        setSavedLocally(true);
      } else {
        setSaved(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </h2>
      <textarea
        rows={5}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setSaved(false);
          setSavedLocally(false);
        }}
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
        {saved && (
          <span className="text-sm text-green-600 dark:text-green-400">
            Guardado
          </span>
        )}
        {savedLocally && (
          <span className="text-sm text-amber-600 dark:text-amber-400">
            Guardado localmente · se enviará al reconectar
          </span>
        )}
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>
    </div>
  );
}

interface DayNotesFormProps {
  dayId: string;
  initialPlanificacion: string | null;
  initialDevolucion: string | null;
}

export default function DayNotesForm({
  dayId,
  initialPlanificacion,
  initialDevolucion,
}: DayNotesFormProps) {
  return (
    <div className="space-y-4">
      <NoteCard
        label="Planificación"
        placeholder="Describí lo que planificaste para esta sesión…"
        initialValue={initialPlanificacion ?? ''}
        onSave={(value) => saveDayField(dayId, 'planificacion', value)}
      />
      <NoteCard
        label="Observación"
        placeholder="Anotá observaciones sobre cómo resultó la sesión…"
        initialValue={initialDevolucion ?? ''}
        onSave={(value) => saveDayField(dayId, 'devolucion', value)}
      />
    </div>
  );
}
