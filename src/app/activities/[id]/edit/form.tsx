'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface EditActivityFormProps {
  activity: {
    id: string;
    name: string;
    date: string;
    image?: string | null;
    description?: string | null;
  };
}

export default function EditActivityForm({ activity }: EditActivityFormProps) {
  const [name, setName] = useState(activity.name);
  const [date, setDate] = useState(activity.date);
  const [image, setImage] = useState(activity.image || '');
  const [description, setDescription] = useState(activity.description || '');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`/api/activities/${activity.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, date, image, description }),
    });
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
        type="url"
        placeholder="URL de la imagen"
        value={image}
        onChange={(e) => setImage(e.target.value)}
        className="w-full border px-2 py-1"
      />
      <textarea
        placeholder="Descripción"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full border px-2 py-1"
      />
      <Button type="submit">Guardar</Button>
    </form>
  );
}
