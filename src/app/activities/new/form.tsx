'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function CreateActivityForm() {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [image, setImage] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [frequency, setFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ONE_TIME'>('ONE_TIME');
  const router = useRouter();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          date,
          image,
          description,
          frequency,
          price: Number(price),
        }),
      });
      if (!res.ok) throw new Error('Request failed');
      setSuccess('Activity created');
      setName('');
      setDate('');
      setImage('');
      setDescription('');
      setPrice('');
      setFrequency('ONE_TIME');
      setTimeout(() => {
        router.push('/activities');
        router.refresh();
      }, 1000);
    } catch (e) {
      setError('Failed to create activity');
    }
  };

  const fieldClass =
    'w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-700 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-slate-200';

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-3xl border border-white/60 bg-white/70 p-6 shadow-lg shadow-slate-900/5 backdrop-blur"
    >
      <input
        type="text"
        placeholder="Nombre de la actividad"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className={fieldClass}
      />
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className={fieldClass}
      />
      <input
        type="url"
        placeholder="URL de la imagen"
        value={image}
        onChange={(e) => setImage(e.target.value)}
        className={fieldClass}
      />
      <select
        value={frequency}
        onChange={(e) =>
          setFrequency(
            e.target.value as 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ONE_TIME'
          )
        }
        className={fieldClass}
      >
        <option value="ONE_TIME">Un solo pago</option>
        <option value="DAILY">Diaria</option>
        <option value="WEEKLY">Semanal</option>
        <option value="MONTHLY">Mensual</option>
      </select>
      <textarea
        placeholder="Descripción"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className={`${fieldClass} min-h-[120px]`}
      />
      <input
        type="number"
        placeholder="Precio"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        className={fieldClass}
      />
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
      <Button type="submit" className="w-full shadow-lg shadow-emerald-500/30">
        Guardar
      </Button>
    </form>
  );
}
