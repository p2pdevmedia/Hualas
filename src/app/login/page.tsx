'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="p-4 max-w-sm mx-auto space-y-2">
      <input
        className="w-full border px-2 py-1"
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="w-full border px-2 py-1"
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button
        className="w-full"
        onClick={() =>
          signIn('credentials', {
            email,
            password,
            callbackUrl: '/',
          })
        }
      >
        Sign in
      </Button>
    </div>
  );
}
