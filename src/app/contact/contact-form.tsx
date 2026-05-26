'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { CLUB_CONTACT_EMAIL } from '@/lib/club-contact';

export default function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'prepared' | 'error'>('idle');

  const inputClass =
    'w-full rounded-lg border bg-white px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary font-body';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes('@')) {
      setStatus('error');
      return;
    }

    const subject = encodeURIComponent(`Consulta web de ${name || 'Hualas'}`);
    const body = encodeURIComponent(
      [
        `Nombre: ${name}`,
        `Email: ${email}`,
        phone ? `Telefono: ${phone}` : null,
        '',
        message,
      ]
        .filter(Boolean)
        .join('\n')
    );
    window.location.href = `mailto:${CLUB_CONTACT_EMAIL}?subject=${subject}&body=${body}`;
    setStatus('prepared');
    setName('');
    setEmail('');
    setPhone('');
    setMessage('');
  }

  if (status === 'prepared') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-12 space-y-3">
        <div className="text-4xl">✉</div>
        <h3 className="font-heading text-xl font-semibold">
          Email preparado
        </h3>
        <p className="text-sm text-muted-foreground font-body">
          Se abrió tu aplicación de correo para enviarlo a {CLUB_CONTACT_EMAIL}.
        </p>
        <button
          onClick={() => setStatus('idle')}
          className="text-sm text-link underline underline-offset-4 font-body mt-2"
        >
          Enviar otro mensaje
        </button>
      </div>
    );
  }

  return (
    <Form onSubmit={submit} className="space-y-4">
      <input
        className={inputClass}
        placeholder="Nombre"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <input
        className={inputClass}
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        className={inputClass}
        type="tel"
        placeholder="Telefono o WhatsApp (opcional)"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <textarea
        className={`${inputClass} min-h-[120px] resize-y`}
        placeholder="Tu mensaje..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        required
      />
      {status === 'error' && (
        <p className="text-destructive text-sm font-body">
          Por favor ingresá un email válido.
        </p>
      )}
      <Button type="submit" className="w-full">
        Preparar email
      </Button>
    </Form>
  );
}
