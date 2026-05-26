'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';

export default function ResetPasswordPage() {
  const token = useSearchParams().get('token') ?? '';
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? 'No se pudo actualizar la contraseña.');
        return;
      }

      setSuccess('Contraseña actualizada. Ya podés iniciar sesión.');
      setPassword('');
      setTimeout(() => router.push('/login'), 1200);
    } catch {
      setError('No se pudo actualizar la contraseña.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[65vh] max-w-md items-center px-4 py-12">
      <div className="w-full space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            Nueva contraseña
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Elegí una contraseña nueva para volver a ingresar a Hualas.
          </p>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          {!token ? (
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>El enlace de recuperación no es válido.</p>
              <Link href="/forgot-password" className="text-primary underline">
                Solicitar uno nuevo
              </Link>
            </div>
          ) : (
            <Form onSubmit={submit} className="space-y-4">
              <label className="space-y-1 text-sm block">
                <span className="text-muted-foreground">
                  Nueva contraseña
                </span>
                <div className="relative">
                  <input
                    className="w-full rounded-md border bg-background px-3 py-2 pr-10 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label="Mostrar contraseña"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </label>

              {error && <p className="text-sm text-destructive">{error}</p>}
              {success && <p className="text-sm text-success">{success}</p>}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Guardando...' : 'Guardar contraseña'}
              </Button>
            </Form>
          )}
        </div>
      </div>
    </main>
  );
}
