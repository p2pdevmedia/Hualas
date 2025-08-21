import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import CreateActivityForm from './form';


import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function CreateActivityPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/');
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [image, setImage] = useState('');
  const [description, setDescription] = useState('');
  const [paymentType, setPaymentType] = useState('ONE_TIME');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, date, image, description, paymentType }),
    });
    setName('');
    setDate('');
    setImage('');
    setDescription('');
    setPaymentType('ONE_TIME');
    router.push('/activities');
    router.refresh();
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
        <select
          value={paymentType}
          onChange={(e) => setPaymentType(e.target.value)}
          className="w-full border px-2 py-1"
        >
          <option value="ONE_TIME">Pago único</option>
          <option value="MONTHLY">Mensual</option>
          <option value="WEEKLY">Semanal</option>
          <option value="DAILY">Diario</option>
        </select>
        <Button type="submit">Guardar</Button>
      </form>

    </main>
  );
}
