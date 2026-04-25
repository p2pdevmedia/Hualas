'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function FormDisplay({ form }: { form: any }) {
  const [data, setData] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const inputClass =
    'w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary';

  const handleChange = (id: string, value: string) => {
    setData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/forms/${form.id}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });
      if (!res.ok) throw new Error('Request failed');
      setSuccess('Formulario enviado');
      setData({});
    } catch (e) {
      setError('No se pudo enviar el formulario');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {form.fields.map((f: any) => (
        <div key={f.id} className="space-y-1">
          <label className="block text-sm font-medium">
            {f.label}
            {f.required && <span className="text-destructive ml-1">*</span>}
          </label>
          {f.type === 'text' && (
            <input
              className={inputClass}
              value={data[f.id] || ''}
              onChange={(e) => handleChange(f.id, e.target.value)}
              required={f.required}
            />
          )}
          {f.type === 'number' && (
            <input
              type="number"
              className={inputClass}
              value={data[f.id] || ''}
              onChange={(e) => handleChange(f.id, e.target.value)}
              required={f.required}
            />
          )}
          {f.type === 'select' && (
            <select
              className={inputClass}
              value={data[f.id] || ''}
              onChange={(e) => handleChange(f.id, e.target.value)}
              required={f.required}
            >
              <option value=""></option>
              {Array.isArray(f.options) &&
                f.options.map((opt: string) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
            </select>
          )}
        </div>
      ))}
      {error && <p className="text-destructive text-sm">{error}</p>}
      {success && <p className="text-success text-sm">{success}</p>}
      <Button type="submit" className="w-full">
        Enviar
      </Button>
    </form>
  );
}
