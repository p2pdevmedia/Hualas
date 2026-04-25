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
  allergies: string | null;
  regularMedication: string | null;
  relevantDiseases: string | null;
  previousInjuries: string | null;
  physicalRestrictions: string | null;
  bloodGroup: string | null;
  primaryDoctor: string | null;
  doctorPhone: string | null;
  observations: string | null;
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
  const [allergies, setAllergies] = useState('');
  const [regularMedication, setRegularMedication] = useState('');
  const [relevantDiseases, setRelevantDiseases] = useState('');
  const [previousInjuries, setPreviousInjuries] = useState('');
  const [physicalRestrictions, setPhysicalRestrictions] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [primaryDoctor, setPrimaryDoctor] = useState('');
  const [doctorPhone, setDoctorPhone] = useState('');
  const [observations, setObservations] = useState('');

  const inputClass =
    'w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary';

  useEffect(() => {
    fetch('/api/children')
      .then((res) => res.json())
      .then((data) => setChildren(data));
  }, []);

  useEffect(() => {
    if (sameAddress) setAddress(userAddress);
  }, [sameAddress, userAddress]);

  async function addChild(e: React.FormEvent) {
    e.preventDefault();
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
        allergies,
        regularMedication,
        relevantDiseases,
        previousInjuries,
        physicalRestrictions,
        bloodGroup,
        primaryDoctor,
        doctorPhone,
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
      setSameAddress(false);
      setGender('');
      setNationality('');
      setMaritalStatus('');
      setAllergies('');
      setRegularMedication('');
      setRelevantDiseases('');
      setPreviousInjuries('');
      setPhysicalRestrictions('');
      setBloodGroup('');
      setPrimaryDoctor('');
      setDoctorPhone('');
      setObservations('');
    }
  }

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
      <h2 className="text-lg font-semibold tracking-tight">Hijos</h2>
      {children.length > 0 && (
        <ul className="space-y-1">
          {children.map((c) => (
            <li key={c.id} className="text-sm text-muted-foreground">
              {c.name} {c.lastName}
            </li>
          ))}
        </ul>
      )}
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
        <label className="text-sm flex items-center gap-2 text-muted-foreground">
          <input
            type="checkbox"
            checked={sameAddress}
            onChange={(e) => setSameAddress(e.target.checked)}
            className="accent-primary"
          />
          Mismo domicilio que el usuario
        </label>
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
        <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
          <h3 className="text-sm font-semibold">Ficha médica</h3>
          <textarea
            className={`${inputClass} min-h-[72px] resize-y`}
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
            placeholder="Alergias"
          />
          <textarea
            className={`${inputClass} min-h-[72px] resize-y`}
            value={regularMedication}
            onChange={(e) => setRegularMedication(e.target.value)}
            placeholder="Medicación habitual"
          />
          <textarea
            className={`${inputClass} min-h-[72px] resize-y`}
            value={relevantDiseases}
            onChange={(e) => setRelevantDiseases(e.target.value)}
            placeholder="Enfermedades relevantes"
          />
          <textarea
            className={`${inputClass} min-h-[72px] resize-y`}
            value={previousInjuries}
            onChange={(e) => setPreviousInjuries(e.target.value)}
            placeholder="Lesiones previas"
          />
          <textarea
            className={`${inputClass} min-h-[72px] resize-y`}
            value={physicalRestrictions}
            onChange={(e) => setPhysicalRestrictions(e.target.value)}
            placeholder="Restricciones físicas"
          />
          <input
            className={inputClass}
            value={bloodGroup}
            onChange={(e) => setBloodGroup(e.target.value)}
            placeholder="Grupo sanguíneo"
          />
          <input
            className={inputClass}
            value={primaryDoctor}
            onChange={(e) => setPrimaryDoctor(e.target.value)}
            placeholder="Médico de cabecera"
          />
          <input
            className={inputClass}
            value={doctorPhone}
            onChange={(e) => setDoctorPhone(e.target.value)}
            placeholder="Teléfono médico"
          />
          <textarea
            className={`${inputClass} min-h-[72px] resize-y`}
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            placeholder="Observaciones"
          />
        </div>
        <Button type="submit" className="w-full">
          Agregar hijo
        </Button>
      </form>
    </div>
  );
}
