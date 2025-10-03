'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/components/language-provider';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();
  const t = useTranslation().auth;

  const submit = async () => {
    setError('');
    setSuccess('');
    const res = await signIn('credentials', {
      email: email.toLowerCase(),
      password,
      redirect: false,
    });
    if (res?.error) {
      setError('invalidCredentials');
    } else {
      setSuccess('Login successful');
      setTimeout(() => router.push('/'), 1000);
    }
  };

  const fieldClass =
    'w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-700 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-slate-200';

  return (
    <div className="mx-auto max-w-md space-y-6 rounded-3xl border border-white/60 bg-white/70 p-8 shadow-lg shadow-slate-900/5 backdrop-blur">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">{t.signIn}</h1>
        <p className="text-sm text-slate-500">
          Accedé a tu cuenta para gestionar tus actividades y notificaciones.
        </p>
      </div>
      <div className="space-y-3">
        <input
          className={fieldClass}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div className="relative">
          <input
            className={`${fieldClass} pr-10`}
            type={showPassword ? 'text' : 'password'}
            placeholder="Contraseña"
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
          {t[error as keyof typeof t]}
        </p>
      )}
      {success && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-sm text-emerald-600">
          {success}
        </p>
      )}
      <div className="space-y-3">
        <Button onClick={submit} className="w-full shadow-lg shadow-emerald-500/30">
          {t.signIn}
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
          {t.signInWithGoogle}
        </Button>
      </div>
    </div>
  );
}
