'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const inputClass =
    'w-full rounded-lg border bg-white px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary font-body';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes('@')) { setStatus('error'); return; }
    setStatus('success');
    setName(''); setEmail(''); setPhone(''); setMessage('');
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-12 space-y-3">
        <div className="text-4xl">✅</div>
        <h3 className="font-heading text-xl font-semibold">¡Mensaje enviado!</h3>
        <p className="text-sm text-muted-foreground font-body">Nos pondremos en contacto pronto.</p>
        <button onClick={() => setStatus('idle')} className="text-sm text-primary underline underline-offset-4 font-body mt-2">
          Enviar otro mensaje
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
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
        placeholder="Teléfono (opcional)"
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
        <p className="text-destructive text-sm font-body">Por favor ingresá un email válido.</p>
      )}
      <Button type="submit" className="w-full">Enviar mensaje</Button>
    </form>
  );
}
