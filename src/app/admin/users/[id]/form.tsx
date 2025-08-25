'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';

type User = {
  id: string;
  name: string | null;
  lastName: string | null;
  email: string;
  role: string;
  dni: string | null;
  birthDate: string | null;
  gender: string | null;
  address: string | null;
  phone: string | null;
  nationality: string | null;
  maritalStatus: string | null;
  isActive: boolean;
  observations: string | null;
};

export default function EditUserForm({ user }: { user: User }) {
  const [name, setName] = useState(user.name ?? '');
  const [lastName, setLastName] = useState(user.lastName ?? '');
  const [dni, setDni] = useState(user.dni ?? '');
  const [birthDate, setBirthDate] = useState(user.birthDate ?? '');
  const [gender, setGender] = useState(user.gender ?? '');
  const [address, setAddress] = useState(user.address ?? '');
  const [phone, setPhone] = useState(user.phone ?? '');
  const [nationality, setNationality] = useState(user.nationality ?? '');
  const [maritalStatus, setMaritalStatus] = useState(user.maritalStatus ?? '');
  const [email, setEmail] = useState(user.email);
  const [isActive, setIsActive] = useState(user.isActive);
  const [role, setRole] = useState(user.role);
  const [observations, setObservations] = useState(user.observations ?? '');
  const router = useRouter();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { data: session } = useSession();
  const canEditRole = session?.user.role === 'SUPER_ADMIN';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const body: any = {
        name,
        lastName,
        dni: dni || null,
        birthDate,
        gender: gender || undefined,
        address,
        phone,
        nationality,
        maritalStatus,
        email,
        isActive,
        observations,
      };
      if (canEditRole) body.role = role;
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Request failed');
      setSuccess('User updated');
      setTimeout(() => {
        router.push('/admin/users');
        router.refresh();
      }, 1000);
    } catch (e) {
      setError('Failed to update user');
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
      <textarea
        className="w-full border px-2 py-1"
        value={observations}
        onChange={(e) => setObservations(e.target.value)}
        placeholder="Observaciones"
      />
      <input
        className="w-full border px-2 py-1"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <label className="text-sm flex items-center space-x-1">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        <span>Active</span>
      </label>
      {canEditRole && (
        <select
          className="w-full border px-2 py-1"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="ADMIN">ADMIN</option>
          <option value="MEMBER">MEMBER</option>
          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
        </select>
      )}
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {success && <p className="text-green-600 text-sm">{success}</p>}
      <Button type="submit" className="w-full">
        Save
      </Button>
    </form>
  );
}
