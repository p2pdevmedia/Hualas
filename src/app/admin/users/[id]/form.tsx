'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';

type ElevatedRole = 'PROFESSOR' | 'COUNTER' | 'ADMIN' | 'SUPER_ADMIN';

const ELEVATED_ROLE_LABELS: Record<ElevatedRole, string> = {
  PROFESSOR: 'Profesor',
  COUNTER: 'Contaduría',
  ADMIN: 'Administrador',
  SUPER_ADMIN: 'Super Admin',
};

type User = {
  id: string;
  name: string | null;
  lastName: string | null;
  email: string;
  role: string;
  roles: string[];
  dni: string | null;
  birthDate: string | null;
  gender: string | null;
  address: string | null;
  phone: string | null;
  nationality: string | null;
  maritalStatus: string | null;
  isActive: boolean;
  socialFeeActive: boolean;
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
  const [socialFeeActive, setSocialFeeActive] = useState(user.socialFeeActive);
  const [roles, setRoles] = useState<ElevatedRole[]>(
    user.roles.filter((r): r is ElevatedRole =>
      ['PROFESSOR', 'COUNTER', 'ADMIN', 'SUPER_ADMIN'].includes(r)
    )
  );
  const [observations, setObservations] = useState(user.observations ?? '');
  const [allergies, setAllergies] = useState(user.allergies ?? '');
  const [regularMedication, setRegularMedication] = useState(
    user.regularMedication ?? ''
  );
  const [relevantDiseases, setRelevantDiseases] = useState(
    user.relevantDiseases ?? ''
  );
  const [previousInjuries, setPreviousInjuries] = useState(
    user.previousInjuries ?? ''
  );
  const [physicalRestrictions, setPhysicalRestrictions] = useState(
    user.physicalRestrictions ?? ''
  );
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
        socialFeeActive,
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
      if (canEditRole) body.roles = roles;
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Request failed');
      setSuccess('Usuario actualizado');
      setTimeout(() => {
        router.push('/admin/users');
        router.refresh();
      }, 1000);
    } catch (e) {
      setError('No se pudo actualizar el usuario');
    }
  }

  return (
    <Form onSubmit={submit} className="space-y-3">
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
        Usuario activo
      </label>
      <div className="rounded-lg border bg-muted/20 p-4 text-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <p className="font-semibold">Cuota social</p>
            <p className="text-muted-foreground">
              Los usuarios nuevos quedan inactivos por defecto. Un pago aprobado
              que incluya cuota social la activa automáticamente.
            </p>
          </div>
          <span
            className={`w-fit rounded-full border px-3 py-1 text-xs font-medium ${
              socialFeeActive
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-slate-50 text-slate-700'
            }`}
          >
            {socialFeeActive ? 'Activa' : 'Inactiva'}
          </span>
        </div>
        <label className="mt-4 flex items-center gap-2 text-muted-foreground">
          <input
            type="checkbox"
            checked={socialFeeActive}
            onChange={(e) => setSocialFeeActive(e.target.checked)}
            className="accent-primary"
          />
          Mantener cuota social activa
        </label>
      </div>
      {canEditRole && (
        <fieldset className="rounded-lg border bg-muted/20 p-4 space-y-2">
          <legend className="px-1 text-sm font-semibold">
            Capacidades del usuario
          </legend>
          <p className="text-xs text-muted-foreground">
            Todo usuario es socio (MEMBER) por defecto. Marcá las capacidades
            adicionales que tenga; el usuario podrá cambiar de perfil para
            usarlas.
          </p>
          <div className="grid grid-cols-2 gap-2 pt-1">
            {(
              ['PROFESSOR', 'COUNTER', 'ADMIN', 'SUPER_ADMIN'] as ElevatedRole[]
            ).map((r) => {
              const checked = roles.includes(r);
              return (
                <label
                  key={r}
                  className="flex items-center gap-2 text-sm text-foreground"
                >
                  <input
                    type="checkbox"
                    className="accent-primary"
                    checked={checked}
                    onChange={(e) => {
                      setRoles((prev) =>
                        e.target.checked
                          ? Array.from(new Set([...prev, r]))
                          : prev.filter((x) => x !== r)
                      );
                    }}
                  />
                  {ELEVATED_ROLE_LABELS[r]}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}
      {error && <p className="text-destructive text-sm">{error}</p>}
      {success && <p className="text-success text-sm">{success}</p>}
      <Button type="submit" className="w-full">
        Guardar cambios
      </Button>
    </Form>
  );
}
