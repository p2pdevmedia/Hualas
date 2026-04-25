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

  const inputClass =
    'w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary';

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
    <div className="space-y-4">
      {children.length > 0 && (
        <div className="rounded-xl border bg-card p-4 shadow-sm space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Menores registrados
          </h2>
          <ul className="divide-y divide-border">
            {children.map((c) => (
              <li key={c.id} className="py-2 text-sm">
                <span className="font-medium">
                  {c.name} {c.lastName}
                </span>
                {c.documentType && (
                  <span className="text-muted-foreground ml-2">
                    · {c.documentType} {c.documentNumber}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-3">
        <h2 className="text-base font-semibold">Agregar menor</h2>
        <form onSubmit={addChild} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre"
              required
            />
            <input
              className={inputClass}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Apellido"
            />
          </div>
          <select
            className={inputClass}
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
          >
            <option value="">Tipo de documento</option>
            <option value="DNI">DNI</option>
            <option value="PASAPORTE">Pasaporte</option>
            <option value="OTRO">Otro</option>
          </select>
          <input
            className={inputClass}
            value={documentNumber}
            onChange={(e) => setDocumentNumber(e.target.value)}
            placeholder="Número / Código"
          />
          <input
            className={inputClass}
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />
          <input
            className={inputClass}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Domicilio"
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
          <textarea
            className={`${inputClass} min-h-[80px] resize-y`}
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            placeholder="Observaciones"
          />
          <Button type="submit" className="w-full">
            Agregar menor
          </Button>
        </form>
      </div>
    </div>
  );
}
