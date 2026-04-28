'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import ProfessorPicker from '../professor-picker';

type ProfessorOption = {
  id: string;
  name: string | null;
  lastName: string | null;
  email: string;
};

interface CreateActivityFormProps {
  professors: ProfessorOption[];
  onSuccess?: (activityId: string) => void;
}

export default function CreateActivityForm({
  professors,
  onSuccess,
}: CreateActivityFormProps) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [image, setImage] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [capacity, setCapacity] = useState('');
  const [frequency, setFrequency] = useState<
    'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ONE_TIME'
  >('ONE_TIME');
  const [professorIds, setProfessorIds] = useState<string[]>([]);
  const router = useRouter();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const inputClass =
    'w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary';

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
          image: image || undefined,
          description: description || undefined,
          frequency,
          price: Number(price),
          capacity: capacity ? Number(capacity) : undefined,
          professorIds,
        }),
      });
      if (!res.ok) throw new Error('Request failed');
      const json = await res.json();
      setSuccess('Actividad creada');
      setName('');
      setDate('');
      setImage('');
      setDescription('');
      setPrice('');
      setCapacity('');
      setFrequency('ONE_TIME');
      setProfessorIds([]);
      onSuccess?.(json.id);
    } catch (e) {
      setError('No se pudo crear la actividad');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        placeholder="Nombre de la actividad"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className={inputClass}
        required
      />
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className={inputClass}
      />
      <input
        type="url"
        placeholder="URL de la imagen"
        value={image}
        onChange={(e) => setImage(e.target.value)}
        className={inputClass}
      />
      <select
        value={frequency}
        onChange={(e) =>
          setFrequency(
            e.target.value as 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ONE_TIME'
          )
        }
        className={inputClass}
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
        className={`${inputClass} min-h-[80px] resize-y`}
      />
      <input
        type="number"
        placeholder="Precio"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        className={inputClass}
      />
      <input
        type="number"
        min={1}
        placeholder="Cupo de inscripciones (opcional)"
        value={capacity}
        onChange={(e) => setCapacity(e.target.value)}
        className={inputClass}
      />
      <ProfessorPicker
        professors={professors}
        value={professorIds}
        onChange={setProfessorIds}
      />
      {error && <p className="text-destructive text-sm">{error}</p>}
      {success && <p className="text-success text-sm">{success}</p>}
      <Button type="submit" className="w-full">
        Guardar
      </Button>
    </form>
  );
}
