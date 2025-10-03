'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
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
  const t = useTranslation().auth;

  async function submit() {
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
      setSuccess('Registration successful');
      setEmail('');
      setPassword('');
      setName('');
    } catch (e) {
      setError('Registration failed');
    }
  }

  const fieldClass =
    'w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-700 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-slate-200';

  return (
    <div className="mx-auto max-w-md space-y-6 rounded-3xl border border-white/60 bg-white/70 p-8 shadow-lg shadow-slate-900/5 backdrop-blur">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Crear cuenta</h1>
        <p className="text-sm text-slate-500">
          Unite a la comunidad Hualas para descubrir actividades y gestionar tu
          participación.
        </p>
      </div>
      <div className="space-y-3">
        <input
          className={fieldClass}
          placeholder="Nombre completo"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className={fieldClass}
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div className="relative">
          <input
            className={`${fieldClass} pr-10`}
            placeholder="Contraseña"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={t.showPassword}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50/80 p-3 text-sm text-red-600">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-sm text-emerald-600">
          {success}
        </p>
      )}
      <div className="space-y-3">
        <Button onClick={submit} className="w-full shadow-lg shadow-emerald-500/30">
          Registrarme
        </Button>
        <Button
          onClick={() => signIn('google', { callbackUrl: '/' })}
          variant="secondary"
          className="w-full justify-center gap-3"
        >
          <Image
            src="/google.svg"
            alt="Google logo"
            width={20}
            height={20}
            className="h-5 w-5"
          />
          Registrarme con Google
        </Button>
      </div>
    </div>
  );
}
