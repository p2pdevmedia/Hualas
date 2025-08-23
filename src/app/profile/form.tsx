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
          dni,
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

  return (
    <form onSubmit={submit} className="space-y-2 max-w-sm">
      <input
        className="w-full border px-2 py-1"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nombre"
      />
      <input
        className="w-full border px-2 py-1"
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
        placeholder="Apellido"
      />
      <input
        className="w-full border px-2 py-1"
        value={dni}
        onChange={(e) => setDni(e.target.value)}
        placeholder="DNI"
      />
      <input
        className="w-full border px-2 py-1"
        type="date"
        value={birthDate}
        onChange={(e) => setBirthDate(e.target.value)}
        placeholder="Fecha de nacimiento"
      />
      <select
        className="w-full border px-2 py-1"
        value={gender}
        onChange={(e) => setGender(e.target.value)}
      >
        <option value="">Género</option>
        <option value="FEMALE">Femenino</option>
        <option value="MALE">Masculino</option>
        <option value="NON_BINARY">No Binario</option>
        <option value="UNDISCLOSED">Prefiero no decirlo</option>
        <option value="OTHER">Otro</option>
      </select>
      <input
        className="w-full border px-2 py-1"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="Domicilio"
      />
      <input
        className="w-full border px-2 py-1"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Teléfono"
      />
      <input
        className="w-full border px-2 py-1"
        value={nationality}
        onChange={(e) => setNationality(e.target.value)}
        placeholder="Nacionalidad"
      />
      <input
        className="w-full border px-2 py-1"
        value={maritalStatus}
        onChange={(e) => setMaritalStatus(e.target.value)}
        placeholder="Estado Civil"
      />
      <input
        className="w-full border px-2 py-1"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        className="w-full border px-2 py-1"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="New password"
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {success && <p className="text-green-600 text-sm">{success}</p>}
      <Button type="submit" className="w-full">
        Save
      </Button>
    </form>
  );
}
