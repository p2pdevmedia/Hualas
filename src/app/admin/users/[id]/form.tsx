'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

type User = { id: string; name: string | null; email: string; role: string };

export default function EditUserForm({ user }: { user: User }) {
  const [name, setName] = useState(user.name ?? '');
  const [role, setRole] = useState(user.role);
  const router = useRouter();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, role }),
      });
      if (!res.ok) throw new Error('Request failed');
      setSuccess('User updated');
      setTimeout(() => {
        router.push('/admin/users');
        router.refresh();
      }, 1000);
    } catch (e) {
      setError('Failed to update user');
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2 max-w-sm">
      <input
        className="w-full border px-2 py-1"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
      />
      <select
        className="w-full border px-2 py-1"
        value={role}
        onChange={(e) => setRole(e.target.value)}
      >
        <option value="ADMIN">ADMIN</option>
        <option value="MEMBER">MEMBER</option>
      </select>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {success && <p className="text-green-600 text-sm">{success}</p>}
      <Button type="submit" className="w-full">
        Save
      </Button>
    </form>
  );
}
