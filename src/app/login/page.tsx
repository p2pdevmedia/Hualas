'use client';

import { FormEvent, useState } from 'react';
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

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
      setTimeout(() => router.push('/my-activities'), 1000);
    }
  };

  const inputClass =
    'w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary';

  return (
    <div className="flex min-h-[65vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight">{t.signIn}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ingresá a tu cuenta de Hualas
          </p>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <form onSubmit={submit} className="space-y-3">
            <input
              className={inputClass}
              id="login-email"
              name="email"
              type="email"
              autoComplete="username"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <div className="relative">
              <input
                className={`${inputClass} pr-10`}
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Contraseña"
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
            {error && (
              <p className="text-red-500 text-sm">
                {t[error as keyof typeof t]}
              </p>
            )}
            {success && <p className="text-green-600 text-sm">{success}</p>}
            <Button type="submit" className="w-full">
              {t.signIn}
            </Button>
            <input type="hidden" name="auth-type" value="login" />
          </form>

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
            onClick={() => signIn('google', { callbackUrl: '/my-activities' })}
          >
            <Image src="/google.svg" alt="Google logo" width={18} height={18} />
            {t.signInWithGoogle}
          </Button>
        </div>
      </div>
    </div>
  );
}
