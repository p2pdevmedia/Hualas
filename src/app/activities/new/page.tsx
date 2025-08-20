'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function CreateActivityPage() {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [image, setImage] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log({ name, date, image, description });
    setName('');
    setDate('');
    setImage('');
    setDescription('');
  };

  return (
    <main className="p-4">
      <h1 className="mb-4 text-2xl font-bold">Crear actividad</h1>
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
    </main>
  );
}
