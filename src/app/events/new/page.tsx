'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function CreateEventPage() {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !date) {
      setError('Por favor, complete todos los campos.');
      setSuccess('');
      return;
    }
    console.log({ name, date });
    setError('');
    setSuccess('Evento creado exitosamente.');
    setName('');
    setDate('');
  };

  return (
    <main className="p-4">
      <h1 className="mb-4 text-2xl font-bold">Crear evento</h1>
      {error && <p className="mb-2 text-red-600">{error}</p>}
      {success && <p className="mb-2 text-green-600">{success}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Nombre del evento"
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
        <Button type="submit">Guardar</Button>
      </form>
    </main>
  );
}
