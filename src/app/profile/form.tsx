'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

type User = {
  name: string | null;
  lastName: string | null;
  profilePhoto?: string | null;
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

  const inputClass =
    'w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary';

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
      setSuccess('Perfil actualizado');
      setPassword('');
      setTimeout(() => router.refresh(), 1000);
    } catch (e) {
      setError('No se pudo actualizar el perfil');
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3" autoComplete="on">
      <div className="grid grid-cols-2 gap-3">
        <input
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre"
        />
        <input
          className={inputClass}
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Apellido"
        />
      </div>
      <input
        className={inputClass}
        value={dni}
        onChange={(e) => setDni(e.target.value)}
        placeholder="DNI"
      />
      <input
        className={inputClass}
        type="date"
        value={birthDate}
        onChange={(e) => setBirthDate(e.target.value)}
      />
      <select
        className={inputClass}
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
        className={inputClass}
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="Domicilio"
      />
      <input
        className={inputClass}
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Teléfono"
      />
      <input
        className={inputClass}
        value={nationality}
        onChange={(e) => setNationality(e.target.value)}
        placeholder="Nacionalidad"
      />
      <input
        className={inputClass}
        value={maritalStatus}
        onChange={(e) => setMaritalStatus(e.target.value)}
        placeholder="Estado Civil"
      />
      <input
        className={inputClass}
        id="profile-email"
        name="email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        className={inputClass}
        id="profile-new-password"
        name="new-password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Nueva contraseña"
      />
      <input type="hidden" name="username" value={user.email} />
      {error && <p className="text-destructive text-sm">{error}</p>}
      {success && <p className="text-success text-sm">{success}</p>}
      <Button type="submit" className="w-full">
        Guardar cambios
      </Button>
    </form>
  );
}
