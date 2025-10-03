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
      setTimeout(() => router.push('/'), 1000);
    }
  };

  return (
    <div className="p-4 max-w-sm mx-auto space-y-2">
      <form onSubmit={submit} className="space-y-2">
        <input
          className="w-full border px-2 py-1"
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
            className="w-full border px-2 py-1 pr-8"
            id="login-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={t.showPassword}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        {error && (
          <p className="text-red-500 text-sm">{t[error as keyof typeof t]}</p>
        )}
        {success && <p className="text-green-600 text-sm">{success}</p>}
        <Button
          type="submit"
          className="w-full bg-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded"
        >
          {t.signIn}
        </Button>
        <input type="hidden" name="auth-type" value="login" />
      </form>
      <Button
        className="w-full flex items-center justify-center bg-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded"
        onClick={() => signIn('google', { callbackUrl: '/' })}
      >
        <Image
          src="/google.svg"
          alt="Google logo"
          width={20}
          height={20}
          className="mr-2"
        />
        {t.signInWithGoogle}
      </Button>
    </div>
  );
}
