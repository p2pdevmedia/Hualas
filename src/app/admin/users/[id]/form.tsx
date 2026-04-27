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
  allergies: string | null;
  regularMedication: string | null;
  relevantDiseases: string | null;
  previousInjuries: string | null;
  physicalRestrictions: string | null;
  bloodGroup: string | null;
  primaryDoctor: string | null;
  doctorPhone: string | null;
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
  const [allergies, setAllergies] = useState(user.allergies ?? '');
  const [regularMedication, setRegularMedication] = useState(user.regularMedication ?? '');
  const [relevantDiseases, setRelevantDiseases] = useState(user.relevantDiseases ?? '');
  const [previousInjuries, setPreviousInjuries] = useState(user.previousInjuries ?? '');
  const [physicalRestrictions, setPhysicalRestrictions] = useState(user.physicalRestrictions ?? '');
  const [bloodGroup, setBloodGroup] = useState(user.bloodGroup ?? '');
  const [primaryDoctor, setPrimaryDoctor] = useState(user.primaryDoctor ?? '');
  const [doctorPhone, setDoctorPhone] = useState(user.doctorPhone ?? '');
  const router = useRouter();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { data: session } = useSession();
  const canEditRole = session?.user.role === 'SUPER_ADMIN';

  const inputClass =
    'w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary';

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
        allergies,
        regularMedication,
        relevantDiseases,
        previousInjuries,
        physicalRestrictions,
        bloodGroup,
        primaryDoctor,
        doctorPhone,
      };
      if (canEditRole) body.role = role;
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Request failed');
      setSuccess('Padre actualizado');
      setTimeout(() => {
        router.push('/admin/users');
        router.refresh();
      }, 1000);
    } catch (e) {
      setError('No se pudo actualizar el padre');
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
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
      <textarea
        className={`${inputClass} min-h-[80px] resize-y`}
        value={observations}
        onChange={(e) => setObservations(e.target.value)}
        placeholder="Observaciones"
      />

      {/* Medical Sheet */}
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

      <input
        className={inputClass}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        type="email"
      />
      <label className="text-sm flex items-center gap-2 text-muted-foreground">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="accent-primary"
        />
        Padre activo
      </label>
      {canEditRole && (
        <select
          className={inputClass}
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="ADMIN">ADMIN</option>
          <option value="MEMBER">MEMBER</option>
          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
        </select>
      )}
      {error && <p className="text-destructive text-sm">{error}</p>}
      {success && <p className="text-success text-sm">{success}</p>}
      <Button type="submit" className="w-full">
        Guardar cambios
      </Button>
    </form>
  );
}
