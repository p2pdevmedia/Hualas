'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Image from 'next/image';
import { Box, Container, Heading, Text, Flex } from '@radix-ui/themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { registerSchema } from '@/lib/validations/auth';
import { useTranslation } from '@/components/language-provider';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const t = useTranslation().auth;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const parsed = registerSchema.safeParse({ email, password, name });
    if (!parsed.success) {
      setError('Datos inválidos');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      if (res.ok) {
        setSuccess('Registro exitoso');
        setName('');
        setEmail('');
        setPassword('');
        setTimeout(() => router.push('/login?registered=true'), 1500);
      } else {
        const data = await res.json();
        setError(data.message || 'Error al registrarse');
      }
    } catch (err) {
      setError('Error de conexión');
    }

    setLoading(false);
  }

  return (
    <Box className="min-h-screen flex items-center justify-center bg-gradient-to-r from-grass-50 to-sky-50 px-4 py-12">
      <Container maxWidth="2">
        <Box className="bg-white rounded-lg shadow-lg p-8">
          <Flex direction="column" gap="4">
            <Heading size="6" weight="bold" className="text-center">
              Crear Cuenta
            </Heading>
            <Text size="2" className="text-gray-600 text-center">
              Únete a la comunidad de Hualas
            </Text>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Box className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </Box>
              )}

              {success && (
                <Box className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                  {success}
                </Box>
              )}

              <Input
                label="Nombre Completo"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Juan Pérez"
                required
              />

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
                {loading ? 'Registrando...' : 'Crear Cuenta'}
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

            {/* Google Signup */}
            <Button
              type="button"
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
              onClick={() => signIn('google', { callbackUrl: '/' })}
            >
              <Image
                src="/google.svg"
                alt="Google logo"
                width={18}
                height={18}
              />
              Registrarse con Google
            </Button>

            <Text size="2" className="text-center">
              ¿Ya tienes cuenta?{' '}
              <Link
                href="/login"
                className="text-grass-600 hover:text-grass-900 font-medium"
              >
                Inicia sesión
              </Link>
            </Text>
          </Flex>
        </Box>
      </Container>
    </Box>
  );
}
