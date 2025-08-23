'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

type Child = {
  id: string;
  name: string;
  lastName: string | null;
  documentType: string | null;
  documentNumber: string | null;
  birthDate: string | null;
  address: string | null;
  gender: string | null;
  nationality: string | null;
  maritalStatus: string | null;
  observations: string | null;
};

export default function AdminChildrenManager({ userId }: { userId: string }) {
  const [children, setChildren] = useState<Child[]>([]);
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [address, setAddress] = useState('');
  const [gender, setGender] = useState('');
  const [nationality, setNationality] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [observations, setObservations] = useState('');

  useEffect(() => {
    fetch(`/api/users/${userId}/children`)
      .then((res) => res.json())
      .then((data) => setChildren(data));
  }, [userId]);

  async function addChild(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/users/${userId}/children`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        lastName,
        documentType,
        documentNumber,
        birthDate,
        address,
        gender: gender || undefined,
        nationality,
        maritalStatus,
        observations,
      }),
    });
    if (res.ok) {
      const child = await res.json();
      setChildren([...children, child]);
      setName('');
      setLastName('');
      setDocumentType('');
      setDocumentNumber('');
      setBirthDate('');
      setAddress('');
      setGender('');
      setNationality('');
      setMaritalStatus('');
      setObservations('');
    }
  }

  return (
    <div className="space-y-2 max-w-sm">
      <ul className="list-disc pl-4">
        {children.map((c) => (
          <li key={c.id}>{c.name}</li>
        ))}
      </ul>
      <form onSubmit={addChild} className="space-y-2">
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
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value)}
          placeholder="Tipo de documento"
        />
        <input
          className="w-full border px-2 py-1"
          value={documentNumber}
          onChange={(e) => setDocumentNumber(e.target.value)}
          placeholder="Número / Código"
        />
        <input
          className="w-full border px-2 py-1"
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          placeholder="Fecha de nacimiento"
        />
        <input
          className="w-full border px-2 py-1"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Domicilio"
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
        <Button type="submit" className="w-full">
          Agregar hijo
        </Button>
      </form>
    </div>
  );
}
