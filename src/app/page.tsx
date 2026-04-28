'use client';

import Link from 'next/link';
import { Box, Container, Heading, Text, Flex } from '@radix-ui/themes';
import { Button } from '@/components/ui/button';
import { useSession } from 'next-auth/react';
import { useTranslation } from '@/components/language-provider';

export default function Home() {
  const { data: session } = useSession();
  const t = useTranslation();

  return (
    <Box className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <Box
        className="relative overflow-hidden"
        style={{
          height: '340px',
          background:
            'linear-gradient(135deg, #1C2117 0%, #3D5A3E 60%, #2a4a2c 100%)',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <Container maxWidth="4" mx="auto" className="h-full flex flex-col justify-end pb-10">
          <Text size="1" className="text-white/60 uppercase tracking-widest mb-3">
            📍 San Martín de los Andes · Neuquén, Patagonia
          </Text>
          <Heading size="7" weight="bold" className="text-white leading-tight mb-3">
            Explorá la Patagonia
            <br />
            con nosotros
          </Heading>
          <Text size="2" className="text-white/75 mb-7 max-w-md">
            Club de montaña. Escalada, trekking e infancias en el corazón de los
            Andes neuquinos.
          </Text>
          <Flex gap="3">
            <Link href="/activities">
              <Button variant="solid" size="2">
                Ver actividades
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="outline" size="2" className="border-white/70 text-white hover:bg-white/10">
                Conocer el club
              </Button>
            </Link>
          </Flex>
        </Container>
      </Box>

      {/* Features Section */}
      <Box className="bg-white py-12 px-4">
        <Container maxWidth="4" mx="auto">
          <Flex direction="column" gap="8">
            <Heading size="6" weight="bold" className="text-center">
              Nuestros Servicios
            </Heading>

            <Flex gap="6" className="grid grid-cols-1 md:grid-cols-3">
              {/* Feature 1 */}
              <Box className="text-center">
                <Text size="5" className="mb-3">⛰️</Text>
                <Heading size="4" weight="bold" className="mb-2">
                  Montaña
                </Heading>
                <Text size="2" className="text-gray-600">
                  Expediciones y travesías en los Andes patagónicos para todos los
                  niveles.
                </Text>
              </Box>

              {/* Feature 2 */}
              <Box className="text-center">
                <Text size="5" className="mb-3">🧗</Text>
                <Heading size="4" weight="bold" className="mb-2">
                  Escalada
                </Heading>
                <Text size="2" className="text-gray-600">
                  Cursos y salidas de escalada en roca con instructores
                  certificados.
                </Text>
              </Box>

              {/* Feature 3 */}
              <Box className="text-center">
                <Text size="5" className="mb-3">🌿</Text>
                <Heading size="4" weight="bold" className="mb-2">
                  Infancias
                </Heading>
                <Text size="2" className="text-gray-600">
                  Actividades especiales para niñas, niños y adolescentes en la
                  naturaleza.
                </Text>
              </Box>
            </Flex>
          </Flex>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box className="bg-grass-50 py-8 px-4 flex-grow flex items-center justify-center">
        <Container maxWidth="4" mx="auto" className="text-center">
          <Heading size="6" weight="bold" className="mb-4">
            ¿Listo para unirte?
          </Heading>
          {!session ? (
            <Link href="/register">
              <Button variant="solid" size="3" color="grass">
                Registrarse Ahora
              </Button>
            </Link>
          ) : (
            <Link href="/activities">
              <Button variant="solid" size="3" color="grass">
                Explorar Actividades
              </Button>
            </Link>
          )}
        </Container>
      </Box>
    </Box>
  );
}
