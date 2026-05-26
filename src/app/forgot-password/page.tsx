'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import {
  CLUB_CONTACT_EMAIL,
  CLUB_WHATSAPP_DISPLAY,
  CLUB_WHATSAPP_URL,
} from '@/lib/club-contact';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    setResetUrl(null);
    setSubmitting(true);

    try {
      const response = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        resetUrl?: string;
      };

      if (!response.ok) {
        setError(data.error ?? 'No se pudo iniciar la recuperación.');
        return;
      }

      setMessage(
        data.message ??
          'Si el email corresponde a una cuenta activa, se generó una solicitud de recuperación.'
      );
      setResetUrl(data.resetUrl ?? null);
    } catch {
      setError('No se pudo iniciar la recuperación.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[65vh] max-w-md items-center px-4 py-12">
      <div className="w-full space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            Recuperar contraseña
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Ingresá el email de tu cuenta. Si necesitás ayuda, escribinos por
            WhatsApp al {CLUB_WHATSAPP_DISPLAY} o por mail a{' '}
            {CLUB_CONTACT_EMAIL}.
          </p>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <Form onSubmit={submit} className="space-y-4">
            <label className="space-y-1 text-sm block">
              <span className="text-muted-foreground">Email</span>
              <input
                className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {message && (
              <div className="space-y-3 rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                <p>{message}</p>
                <p>
                  Por seguridad, el club confirma la recuperación por contacto
                  directo.
                </p>
                <div className="flex flex-wrap gap-3">
                  <a
                    href={CLUB_WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline"
                  >
                    WhatsApp
                  </a>
                  <a
                    href={`mailto:${CLUB_CONTACT_EMAIL}`}
                    className="font-medium text-primary hover:underline"
                  >
                    Email
                  </a>
                </div>
                {resetUrl && (
                  <Link
                    href={resetUrl}
                    className="block font-medium text-primary hover:underline"
                  >
                    Abrir enlace de prueba local
                  </Link>
                )}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Enviando...' : 'Solicitar recuperación'}
            </Button>
          </Form>
        </div>

        <div className="text-center">
          <Link href="/login" className="text-sm text-primary hover:underline">
            Volver a iniciar sesión
          </Link>
        </div>
      </div>
    </main>
  );
}
