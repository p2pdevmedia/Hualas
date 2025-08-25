'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { registerSchema } from '@/lib/validations/auth';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

  return (
    <div className="p-4 max-w-sm mx-auto space-y-2">
      <input
        className="w-full border px-2 py-1"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        className="w-full border px-2 py-1"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <div className="space-y-1">
        <input
          className="w-full border px-2 py-1"
          placeholder="Password"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <label className="text-sm flex items-center space-x-1">
          <input
            type="checkbox"
            checked={showPassword}
            onChange={() => setShowPassword(!showPassword)}
          />
          <span>Show password</span>
        </label>
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {success && <p className="text-green-600 text-sm">{success}</p>}
      <Button className="w-full" onClick={submit}>
        Register
      </Button>
      <Button
        className="w-full"
        onClick={() => signIn('google', { callbackUrl: '/' })}
      >
        Register with Google
      </Button>
    </div>
  );
}
