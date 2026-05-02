'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { registerSchema } from '@/lib/validations/auth';

export default function NewUserForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const inputClass =
    'w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    const parsed = registerSchema.safeParse({ name, email, password });
    if (!parsed.success) {
      setError('Revisá los datos ingresados');
      return;
    }

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'No se pudo crear el usuario');
      }

      setSuccess('Usuario creado');
      setTimeout(() => {
        router.push('/admin/users');
        router.refresh();
      }, 900);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo crear el usuario'
      );
    }
  }

  return (
    <Form onSubmit={submit} className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium">Nombre</label>
        <input
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre completo"
          required
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Email</label>
        <input
          className={inputClass}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="usuario@correo.com"
          required
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Contraseña inicial</label>
        <input
          className={inputClass}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 6 caracteres"
          required
        />
      </div>

      <p className="text-xs text-muted-foreground">
        El usuario se crea como socio miembro. Luego podés editar sus datos
        desde el listado.
      </p>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-success">{success}</p>}

      <div className="flex flex-wrap gap-2">
        <Button type="submit">Crear usuario</Button>
        <Button asChild variant="outline" type="button">
          <Link href="/admin/users">Cancelar</Link>
        </Button>
      </div>
    </Form>
  );
}
