'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

type Child = { id: string; name: string; birthDate: string | null };

export default function AdminChildrenManager({ userId }: { userId: string }) {
  const [children, setChildren] = useState<Child[]>([]);
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');

  useEffect(() => {
    fetch(`/api/users/${userId}/children`)
      .then((res) => res.json())
      .then((data) => setChildren(data));
  }, [userId]);

  async function addChild(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/users/${userId}/children`, {
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
    <div className="space-y-2 max-w-sm">
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
