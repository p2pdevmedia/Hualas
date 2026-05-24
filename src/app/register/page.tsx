'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { registerSchema } from '@/lib/validations/auth';
import { useTranslation } from '@/components/language-provider';
import { Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();
  const t = useTranslation().auth;

  const getSafeReturnTo = () => {
    const returnTo = new URLSearchParams(window.location.search).get(
      'returnTo'
    );

    return returnTo?.startsWith('/') && !returnTo.startsWith('//')
      ? returnTo
      : null;
  };

  const inputClass =
    'w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');
    const parsed = registerSchema.safeParse({ email, password, name });
    if (!parsed.success) {
      setError('Invalid data');
      return;
    }
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) throw new Error('Request failed');

      const loginRes = await signIn('credentials', {
        email: parsed.data.email.toLowerCase(),
        password: parsed.data.password,
        redirect: false,
      });

      if (loginRes?.error) {
        setSuccess(
          'Registro exitoso. Iniciá sesión para completar tu perfil obligatorio.'
        );
        router.push('/login');
        return;
      }

      const returnTo = getSafeReturnTo();
      setSuccess(
        returnTo
          ? 'Registro exitoso. Te llevamos al pago de la cuota social.'
          : 'Registro exitoso. Te llevamos a completar tu perfil.'
      );
      setEmail('');
      setPassword('');
      setName('');
      router.push(returnTo ?? '/profile?onboarding=1');
    } catch (e) {
      setError('Registration failed');
    }
  }

  return (
    <div className="flex min-h-[65vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Crear cuenta</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Registrate en Hualas Patagónico
          </p>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <Form onSubmit={submit} className="space-y-3" autoComplete="on">
            <input
              className={inputClass}
              id="register-name"
              name="name"
              placeholder="Nombre completo"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              className={inputClass}
              id="register-email"
              name="email"
              type="email"
              placeholder="Email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <div className="relative">
              <input
                className={`${inputClass} pr-10`}
                id="register-password"
                name="password"
                placeholder="Contraseña"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={t.showPassword}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            {success && <p className="text-success text-sm">{success}</p>}
            <Button type="submit" className="w-full">
              Registrarse
            </Button>
            <input type="hidden" name="auth-type" value="register" />
          </Form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-2 text-muted-foreground uppercase tracking-wide">
                o
              </span>
            </div>
          </div>

          <Button
            className="w-full flex items-center justify-center gap-2 bg-white border border-border text-foreground hover:bg-muted"
            onClick={() =>
              signIn('google', {
                callbackUrl: getSafeReturnTo() ?? '/profile?onboarding=1',
              })
            }
          >
            <Image src="/google.svg" alt="Google logo" width={18} height={18} />
            Registrarse con Google
          </Button>
        </div>
      </div>
    </div>
  );
}
