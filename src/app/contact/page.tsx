'use client';

import { useState } from 'react';
import { Box, Container, Heading, Text, Flex } from '@radix-ui/themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    // In a real app, you'd send this to an API
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setSubmitted(true);
    setName('');
    setEmail('');
    setMessage('');
    setLoading(false);

    setTimeout(() => setSubmitted(false), 3000);
  }

  return (
    <Box className="min-h-screen bg-gradient-to-r from-grass-50 to-sky-50 py-8">
      <Container maxWidth="5" px="4">
        <Flex direction="column" gap="8" mb="8">
          <Flex direction="column" gap="2" align="center">
            <Text size="1" className="uppercase tracking-widest text-gray-600">
              Contacto
            </Text>
            <Heading size="8" weight="bold" className="text-center">
              Hablemos
            </Heading>
            <Text size="3" className="text-gray-600 text-center max-w-2xl">
              ¿Tenés alguna consulta sobre nuestras actividades o querés sumarte
              al club? Escribinos.
            </Text>
          </Flex>
        </Flex>

        <Flex gap="6" className="grid grid-cols-1 md:grid-cols-2">
          {/* Left Column - Info */}
          <Flex direction="column" gap="6">
            <Flex direction="column" gap="4">
              <Box>
                <Flex gap="2" mb="2">
                  <Text size="4">📍</Text>
                  <Flex direction="column">
                    <Text weight="medium">Ubicación</Text>
                    <Text size="2" className="text-gray-600">
                      San Martín de los Andes, Neuquén, Argentina
                    </Text>
                  </Flex>
                </Flex>
              </Box>

              <Box>
                <Flex gap="2" mb="2">
                  <Text size="4">📸</Text>
                  <Flex direction="column">
                    <Text weight="medium">Instagram</Text>
                    <a
                      href="https://www.instagram.com/hualas_patagonico"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-grass-600 hover:text-grass-900 underline underline-offset-2"
                    >
                      @hualas_patagonico
                    </a>
                  </Flex>
                </Flex>
              </Box>

              <Box>
                <Flex gap="2" mb="2">
                  <Text size="4">✉️</Text>
                  <Flex direction="column">
                    <Text weight="medium">Email general</Text>
                    <a
                      href="mailto:Info@clubhualas.com.ar"
                      className="text-grass-600 hover:text-grass-900 underline underline-offset-2"
                    >
                      Info@clubhualas.com.ar
                    </a>
                  </Flex>
                </Flex>
              </Box>

              <Box>
                <Flex gap="2" mb="2">
                  <Text size="4">💰</Text>
                  <Flex direction="column">
                    <Text weight="medium">Tesorería</Text>
                    <a
                      href="mailto:tesoreria@clubhualas.com.ar"
                      className="text-grass-600 hover:text-grass-900 underline underline-offset-2"
                    >
                      tesoreria@clubhualas.com.ar
                    </a>
                  </Flex>
                </Flex>
              </Box>
            </Flex>

            {/* Embedded Map */}
            <Box className="rounded-xl overflow-hidden border border-gray-200 h-52">
              <iframe
                title="San Martín de los Andes"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d47685.15!2d-71.3586!3d-40.1569!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9610be21a87b3b29%3A0x3f3d5fc3f3da0c0!2sSan%20Mart%C3%ADn%20de%20los%20Andes%2C%20Neuqu%C3%A9n!5e0!3m2!1ses!2sar!4v1"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </Box>
          </Flex>

          {/* Right Column - Form */}
          <Box className="bg-white rounded-lg shadow-lg p-8">
            <Heading size="5" weight="bold" className="mb-6">
              Envianos un mensaje
            </Heading>

            {submitted && (
              <Box className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
                ¡Mensaje enviado! Nos pondremos en contacto pronto.
              </Box>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Nombre"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
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

              <Textarea
                label="Mensaje"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tu mensaje aquí..."
                rows={6}
                required
              />

              <Button
                type="submit"
                variant="solid"
                className="w-full"
                disabled={loading}
                loading={loading}
              >
                {loading ? 'Enviando...' : 'Enviar Mensaje'}
              </Button>
            </form>
          </Box>
        </Flex>
      </Container>
    </Box>
  );
}
