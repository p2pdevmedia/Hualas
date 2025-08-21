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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {form.fields.map((f: any) => (
        <div key={f.id}>
          <label className="block mb-1">
            {f.label}
            {f.required && <span className="text-red-600 ml-1">*</span>}
          </label>
          {f.type === 'text' && (
            <input
              className="border p-2 w-full"
              value={data[f.id] || ''}
              onChange={(e) => handleChange(f.id, e.target.value)}
              required={f.required}
            />
          )}
          {f.type === 'number' && (
            <input
              type="number"
              className="border p-2 w-full"
              value={data[f.id] || ''}
              onChange={(e) => handleChange(f.id, e.target.value)}
              required={f.required}
            />
          )}
          {f.type === 'select' && (
            <select
              className="border p-2 w-full"
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
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {success && <p className="text-green-600 text-sm">{success}</p>}
      <button type="submit" className="px-4 py-2 bg-blue-600 text-white">
        Submit
      </button>
    </form>
  );
}
