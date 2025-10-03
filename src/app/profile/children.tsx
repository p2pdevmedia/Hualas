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
};

export default function ChildrenManager({
  userAddress,
}: {
  userAddress: string;
}) {
  const [children, setChildren] = useState<Child[]>([]);
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [address, setAddress] = useState('');
  const [sameAddress, setSameAddress] = useState(false);
  const [gender, setGender] = useState('');
  const [nationality, setNationality] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [contact, setContact] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const fieldClass =
    'w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-700 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-slate-200';

  useEffect(() => {
    fetch('/api/children')
      .then((res) => res.json())
      .then((data) => setChildren(data));
  }, []);

  useEffect(() => {
    if (sameAddress) {
      setAddress(userAddress);
    }
  }, [sameAddress, userAddress]);

  async function addChild(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    if (!name || !lastName || !documentType || !documentNumber || !birthDate) {
      setFormError('Completá todos los campos obligatorios.');
      return;
    }
    const res = await fetch('/api/children', {
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
          observations: contact || undefined,
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
      setSameAddress(false);
      setGender('');
      setNationality('');
      setMaritalStatus('');
      setContact('');
      setFormSuccess('Participante agregado correctamente.');
    } else {
      setFormError('No se pudo guardar el participante.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-900">
          Información de participantes
        </h2>
        <p className="text-sm text-slate-500">
          Registrá a tus hijas e hijos para inscribirlos rápidamente en las
          actividades.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {children.map((c) => (
          <div
            key={c.id}
            className="rounded-3xl border border-white/60 bg-white/70 p-4 shadow-lg shadow-slate-900/5 backdrop-blur"
          >
            <p className="text-sm font-semibold text-slate-900">
              {c.name} {c.lastName ?? ''}
            </p>
            {c.documentNumber && (
              <p className="text-xs text-slate-500">
                {c.documentType}: {c.documentNumber}
              </p>
            )}
            {c.birthDate && (
              <p className="text-xs text-slate-500">
                Nacimiento: {c.birthDate}
              </p>
            )}
          </div>
        ))}
        {children.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-300/70 bg-white/60 p-6 text-sm text-slate-500 backdrop-blur">
            Todavía no registraste participantes.
          </div>
        )}
      </div>
      <form
        onSubmit={addChild}
        className="space-y-4 rounded-3xl border border-white/60 bg-white/70 p-6 shadow-lg shadow-slate-900/5 backdrop-blur"
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
          <select
            className={fieldClass}
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
          >
            <option value="">Tipo de documento</option>
            <option value="DNI">DNI</option>
            <option value="PASAPORTE">Pasaporte</option>
            <option value="OTRO">Otro</option>
          </select>
          <input
            className={fieldClass}
            value={documentNumber}
            onChange={(e) => setDocumentNumber(e.target.value)}
            placeholder="Número / Código"
          />
          <input
            className={fieldClass}
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            placeholder="Fecha de nacimiento"
          />
          <input
            className={fieldClass}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Domicilio"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={sameAddress}
            onChange={(e) => setSameAddress(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span>Mismo domicilio que el usuario</span>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
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
            className={fieldClass}
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Contacto de emergencia"
          />
        </div>
        {formError && (
          <p className="rounded-xl border border-red-200 bg-red-50/80 p-3 text-sm text-red-600">
            {formError}
          </p>
        )}
        {formSuccess && (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-sm text-emerald-600">
            {formSuccess}
          </p>
        )}
        <Button type="submit" className="w-full shadow-lg shadow-emerald-500/30">
          Agregar participante
        </Button>
      </form>
    </div>
  );
}
