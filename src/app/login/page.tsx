'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Image from 'next/image';
import { Box, Container, Heading, Text, Flex } from '@radix-ui/themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/components/language-provider';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const t = useTranslation().auth;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await signIn('credentials', {
      email: email.toLowerCase(),
      password,
      redirect: false,
    });

    if (result?.ok) {
      router.push('/');
    } else {
      setError(t.invalidCredentials);
    }

    setLoading(false);
  }

  return (
    <Box className="min-h-screen flex items-center justify-center bg-gradient-to-r from-grass-50 to-sky-50 px-4 py-12">
      <Container maxWidth="2">
        <Box className="bg-white rounded-lg shadow-lg p-8">
          <Flex direction="column" gap="4">
            <Heading size="6" weight="bold" className="text-center">
              {t.signIn}
            </Heading>
            <Text size="2" className="text-gray-600 text-center">
              Ingresá a tu cuenta de Hualas
            </Text>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Box className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </Box>
              )}

              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
              />

              <Input
                label="Contraseña"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />

              <Button
                type="submit"
                variant="solid"
                className="w-full"
                disabled={loading}
                loading={loading}
              >
                {loading ? 'Iniciando...' : t.signIn}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2 text-gray-500 uppercase tracking-wide">
                  o
                </span>
              </div>
            </div>

            {/* Google Login */}
            <Button
              type="button"
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
              onClick={() => signIn('google', { callbackUrl: '/' })}
            >
              <Image src="/google.svg" alt="Google logo" width={18} height={18} />
              {t.signInWithGoogle}
            </Button>

            <Text size="2" className="text-center">
              ¿No tienes cuenta?{' '}
              <Link href="/register" className="text-grass-600 hover:text-grass-900 font-medium">
                Regístrate aquí
              </Link>
            </Text>
          </Flex>
        </Box>
      </Container>
    </Box>
  );
}
