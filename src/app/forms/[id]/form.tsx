'use client';

import { useState } from 'react';

export default function FormDisplay({ form }: { form: any }) {
  const [data, setData] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
      setSuccess('Form submitted');
      setData({});
    } catch (e) {
      setError('Submission failed');
    }
  };

  const fieldClass =
    'w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-700 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-slate-200';

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-3xl border border-white/60 bg-white/70 p-6 shadow-lg shadow-slate-900/5 backdrop-blur"
    >
      {form.fields.map((f: any) => (
        <div key={f.id} className="space-y-2">
          <label className="block text-sm font-semibold text-slate-800">
            {f.label}
            {f.required && <span className="ml-1 text-red-500">*</span>}
          </label>
          {f.type === 'text' && (
            <input
              className={fieldClass}
              value={data[f.id] || ''}
              onChange={(e) => handleChange(f.id, e.target.value)}
              required={f.required}
            />
          )}
          {f.type === 'number' && (
            <input
              type="number"
              className={fieldClass}
              value={data[f.id] || ''}
              onChange={(e) => handleChange(f.id, e.target.value)}
              required={f.required}
            />
          )}
          {f.type === 'select' && (
            <select
              className={fieldClass}
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
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50/80 p-3 text-sm text-red-600">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-sm text-emerald-600">
          {success}
        </p>
      )}
      <button
        type="submit"
        className="inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/30 transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
      >
        Enviar
      </button>
    </form>
  );
}
