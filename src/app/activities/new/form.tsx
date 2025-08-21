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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        placeholder="Nombre de la actividad"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full border px-2 py-1"
      />
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="w-full border px-2 py-1"
      />
      <input
        type="url"
        placeholder="URL de la imagen"
        value={image}
        onChange={(e) => setImage(e.target.value)}
        className="w-full border px-2 py-1"
      />
      <select
        value={frequency}
        onChange={(e) =>
          setFrequency(
            e.target.value as 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ONE_TIME'
          )
        }
        className="w-full border px-2 py-1"
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
        className="w-full border px-2 py-1"
      />
      <input
        type="number"
        placeholder="Precio"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        className="w-full border px-2 py-1"
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {success && <p className="text-green-600 text-sm">{success}</p>}
      <Button type="submit">Guardar</Button>
    </form>
  );
}
