'use client';

import { useState } from 'react';

interface DescriptionFormProps {
  dayId: string;
  initialDescription: string | null;
}

export default function DescriptionForm({
  dayId,
  initialDescription,
}: DescriptionFormProps) {
  const [value, setValue] = useState(initialDescription ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const res = await fetch(`/api/activity-days/${dayId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: value }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || 'No se pudo guardar');
      }
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <textarea
        rows={8}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        placeholder="Describí esta sesión…"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setSaved(false);
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
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>
    </div>
  );
}
