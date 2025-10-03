'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

type User = {
  name: string | null;
  lastName: string | null;
  dni: string | null;
  birthDate: string | null;
  gender: string | null;
  address: string | null;
  nationality: string | null;
  maritalStatus: string | null;
  email: string;
  phone: string | null;
};

export default function ProfileForm({ user }: { user: User }) {
  const [name, setName] = useState(user.name ?? '');
  const [lastName, setLastName] = useState(user.lastName ?? '');
  const [dni, setDni] = useState(user.dni ?? '');
  const [birthDate, setBirthDate] = useState(user.birthDate ?? '');
  const [gender, setGender] = useState(user.gender ?? '');
  const [address, setAddress] = useState(user.address ?? '');
  const [nationality, setNationality] = useState(user.nationality ?? '');
  const [maritalStatus, setMaritalStatus] = useState(user.maritalStatus ?? '');
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          lastName,
          dni: dni || null,
          birthDate,
          gender: gender || undefined,
          address,
          nationality,
          maritalStatus,
          email,
          phone,
          ...(password ? { password } : {}),
        }),
      });
      if (!res.ok) throw new Error('Request failed');
      setSuccess('Profile updated');
      setPassword('');
      setTimeout(() => router.refresh(), 1000);
    } catch (e) {
      setError('Failed to update profile');
    }
  }

  const fieldClass =
    'w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-700 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-slate-200';

  return (
    <form
      onSubmit={submit}
      className="space-y-6 rounded-3xl border border-white/60 bg-white/70 p-6 shadow-lg shadow-slate-900/5 backdrop-blur"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <input
          className={fieldClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre"
        />
        <input
          className={fieldClass}
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Apellido"
        />
        <input
          className={fieldClass}
          value={dni}
          onChange={(e) => setDni(e.target.value)}
          placeholder="DNI"
        />
        <input
          className={fieldClass}
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          placeholder="Fecha de nacimiento"
        />
        <select
          className={fieldClass}
          value={gender}
          onChange={(e) => setGender(e.target.value)}
        >
          <option value="">Género</option>
          <option value="FEMALE">Femenino</option>
          <option value="MALE">Masculino</option>
          <option value="NON_BINARY">No binario</option>
          <option value="UNDISCLOSED">Prefiero no decirlo</option>
          <option value="OTHER">Otro</option>
        </select>
        <input
          className={fieldClass}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Domicilio"
        />
        <input
          className={fieldClass}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Teléfono"
        />
        <input
          className={fieldClass}
          value={nationality}
          onChange={(e) => setNationality(e.target.value)}
          placeholder="Nacionalidad"
        />
        <input
          className={fieldClass}
          value={maritalStatus}
          onChange={(e) => setMaritalStatus(e.target.value)}
          placeholder="Estado civil"
        />
        <input
          className={`${fieldClass} sm:col-span-2`}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          type="email"
        />
        <input
          className={`${fieldClass} sm:col-span-2`}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Nueva contraseña"
        />
      </div>
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50/80 p-3 text-sm text-red-600">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-sm text-emerald-600">
          {success}
        </p>
      )}
      <Button type="submit" className="w-full shadow-lg shadow-emerald-500/30">
        Guardar cambios
      </Button>
    </form>
  );
}
