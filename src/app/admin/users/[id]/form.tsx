'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';

type User = {
  id: string;
  name: string | null;
  lastName: string | null;
  email: string;
  role: string;
};

export default function EditUserForm({ user }: { user: User }) {
  const [name, setName] = useState(user.name ?? '');
  const [lastName, setLastName] = useState(user.lastName ?? '');
  const [role, setRole] = useState(user.role);
  const router = useRouter();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { data: session } = useSession();
  const canEditRole = session?.user.role === 'SUPER_ADMIN';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const body: any = { name, lastName };
      if (canEditRole) body.role = role;
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
        placeholder="Nombre"
      />
      <input
        className="w-full border px-2 py-1"
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
        placeholder="Apellido"
      />
      {canEditRole && (
        <select
          className="w-full border px-2 py-1"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="ADMIN">ADMIN</option>
          <option value="MEMBER">MEMBER</option>
          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
        </select>
      )}
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {success && <p className="text-green-600 text-sm">{success}</p>}
      <Button type="submit" className="w-full">
        Save
      </Button>
    </form>
  );
}
