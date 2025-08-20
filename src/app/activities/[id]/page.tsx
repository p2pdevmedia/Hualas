'use client';

import { Button } from '@/components/ui/button';

export default function ActivityPage() {
  const activity = {
    name: 'Nombre de la actividad',
    date: '2024-01-01',
    image: 'https://via.placeholder.com/300',
    description: 'Descripción de la actividad.',
  };

  const handleSignup = () => {
    console.log('Usuario inscrito en la actividad');
  };

  return (
    <main className="p-4">
      <h1 className="mb-4 text-2xl font-bold">{activity.name}</h1>
      <img
        src={activity.image}
        alt={activity.name}
        className="mb-4 max-w-full"
      />
      <p className="mb-2">Fecha: {activity.date}</p>
      <p className="mb-4">{activity.description}</p>
      <Button onClick={handleSignup}>Inscribirse</Button>
    </main>
  );
}

