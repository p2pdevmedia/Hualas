'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

type Child = { id: string; name: string; birthDate: string | null };

export default function ChildrenManager() {
  const [children, setChildren] = useState<Child[]>([]);
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');

  useEffect(() => {
    fetch('/api/children')
      .then((res) => res.json())
      .then((data) => setChildren(data));
  }, []);

  async function addChild(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/children', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, birthDate }),
    });
    if (res.ok) {
      const child = await res.json();
      setChildren([...children, child]);
      setName('');
      setBirthDate('');
    }
  }

  return (
    <div className="mt-6 space-y-2 max-w-sm">
      <h2 className="text-xl font-semibold">Hijos</h2>
      <ul className="list-disc pl-4">
        {children.map((c) => (
          <li key={c.id}>{c.name}</li>
        ))}
      </ul>
      <form onSubmit={addChild} className="space-y-2">
        <input
          className="w-full border px-2 py-1"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre"
        />
        <input
          className="w-full border px-2 py-1"
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          placeholder="Fecha de nacimiento"
        />
        <Button type="submit" className="w-full">
          Agregar hijo
        </Button>
      </form>
    </div>
  );
}
