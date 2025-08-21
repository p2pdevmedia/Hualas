'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function CreateActivityForm() {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [frequency, setFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ONE_TIME'>('ONE_TIME');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name', name);
    formData.append('date', date);
    formData.append('description', description);
    formData.append('frequency', frequency);
    formData.append('price', price);
    if (image) {
      formData.append('image', image);
    }
    await fetch('/api/activities', {
      method: 'POST',
      body: formData,
    });
    setName('');
    setDate('');
    setImage(null);
    setDescription('');
    setPrice('');
    setFrequency('ONE_TIME');
    router.push('/activities');
    router.refresh();
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
        type="file"
        accept="image/*"
        onChange={(e) => setImage(e.target.files?.[0] || null)}
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
      <Button type="submit">Guardar</Button>
    </form>
  );
}
