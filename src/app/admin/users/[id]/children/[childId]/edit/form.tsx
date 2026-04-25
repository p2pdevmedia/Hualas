'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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

export default function EditChildForm({
  userId,
  child,
}: {
  userId: string;
  child: Child;
}) {
  const router = useRouter();
  const [name, setName] = useState(child.name);
  const [lastName, setLastName] = useState(child.lastName ?? '');
  const [documentType, setDocumentType] = useState(child.documentType ?? '');
  const [documentNumber, setDocumentNumber] = useState(
    child.documentNumber ?? ''
  );
  const [birthDate, setBirthDate] = useState(child.birthDate ?? '');
  const [address, setAddress] = useState(child.address ?? '');
  const [gender, setGender] = useState(child.gender ?? '');
  const [nationality, setNationality] = useState(child.nationality ?? '');
  const [maritalStatus, setMaritalStatus] = useState(child.maritalStatus ?? '');
  const [allergies, setAllergies] = useState(child.allergies ?? '');
  const [regularMedication, setRegularMedication] = useState(
    child.regularMedication ?? ''
  );
  const [relevantDiseases, setRelevantDiseases] = useState(
    child.relevantDiseases ?? ''
  );
  const [previousInjuries, setPreviousInjuries] = useState(
    child.previousInjuries ?? ''
  );
  const [physicalRestrictions, setPhysicalRestrictions] = useState(
    child.physicalRestrictions ?? ''
  );
  const [bloodGroup, setBloodGroup] = useState(child.bloodGroup ?? '');
  const [primaryDoctor, setPrimaryDoctor] = useState(child.primaryDoctor ?? '');
  const [doctorPhone, setDoctorPhone] = useState(child.doctorPhone ?? '');
  const [observations, setObservations] = useState(child.observations ?? '');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const inputClass =
    'w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/users/${userId}/children/${child.id}`, {
        method: 'PUT',
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

      if (!res.ok) throw new Error('Request failed');

      setSuccess('Hijo actualizado');
      setTimeout(() => {
        router.push(`/admin/users/${userId}/view`);
        router.refresh();
      }, 900);
    } catch (e) {
      setError('No se pudo actualizar el hijo');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
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
      </div>
      <textarea
        className={`${inputClass} min-h-[100px] resize-y`}
        value={observations}
        onChange={(e) => setObservations(e.target.value)}
        placeholder="Observaciones"
      />
      {error && <p className="text-destructive text-sm">{error}</p>}
      {success && <p className="text-success text-sm">{success}</p>}
      <div className="flex gap-3">
        <Button type="submit" className="flex-1">
          Guardar cambios
        </Button>
        <Link
          href={`/admin/users/${userId}/view`}
          className="inline-flex flex-1 items-center justify-center rounded-full border border-border px-5 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
