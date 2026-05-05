'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';

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
  allergies: string | null;
  regularMedication: string | null;
  relevantDiseases: string | null;
  previousInjuries: string | null;
  physicalRestrictions: string | null;
  bloodGroup: string | null;
  primaryDoctor: string | null;
  doctorPhone: string | null;
  doctorCertificate: string | null;
};

export default function ProfileForm({
  user,
  returnTo,
}: {
  user: User;
  returnTo?: string | null;
}) {
  const [name, setName] = useState(user.name ?? '');
  const [lastName, setLastName] = useState(user.lastName ?? '');
  const [dni, setDni] = useState(user.dni ?? '');
  const [birthDate, setBirthDate] = useState(user.birthDate ?? '');
  const [gender, setGender] = useState(user.gender ?? '');
  const [address, setAddress] = useState(user.address ?? '');
  const [nationality, setNationality] = useState(user.nationality ?? '');
  const [maritalStatus, setMaritalStatus] = useState(user.maritalStatus ?? '');
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
  const [doctorCertificate, setDoctorCertificate] = useState(
    user.doctorCertificate ?? ''
  );
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const toDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const maxSize = 1280;
        const scale = Math.min(
          maxSize / image.width,
          maxSize / image.height,
          1
        );
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const context = canvas.getContext('2d');
        if (!context) {
          URL.revokeObjectURL(image.src);
          reject(new Error('No se pudo procesar la imagen'));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(image.src);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      image.onerror = () => {
        URL.revokeObjectURL(image.src);
        reject(new Error('No se pudo leer la imagen'));
      };
      image.src = URL.createObjectURL(file);
    });

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
          allergies,
          regularMedication,
          relevantDiseases,
          previousInjuries,
          physicalRestrictions,
          bloodGroup,
          primaryDoctor,
          doctorPhone,
          doctorCertificate,
          email,
          phone,
          ...(password ? { password } : {}),
        }),
      });
      if (!res.ok) throw new Error('Request failed');
      setSuccess('Perfil actualizado');
      setPassword('');
      setTimeout(() => {
        if (returnTo && returnTo.startsWith('/')) {
          router.push(returnTo);
          return;
        }
        router.refresh();
      }, 1000);
    } catch (e) {
      setError('No se pudo actualizar el perfil');
    }
  }

  return (
    <Form onSubmit={submit} className="space-y-3" autoComplete="on">
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Nombre</span>
          <input
            className={inputClass}
            name="given-name"
            autoComplete="given-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Apellido</span>
          <input
            className={inputClass}
            name="family-name"
            autoComplete="family-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </label>
      </div>
      <label className="space-y-1 text-sm">
        <span className="text-muted-foreground">DNI</span>
        <input
          className={inputClass}
          name="national-id"
          autoComplete="off"
          value={dni}
          onChange={(e) => setDni(e.target.value)}
        />
      </label>
      <label className="space-y-1 text-sm">
        <span className="text-muted-foreground">Fecha de nacimiento</span>
        <input
          className={inputClass}
          name="birth-date"
          autoComplete="bday"
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
        />
      </label>
      <label className="space-y-1 text-sm">
        <span className="text-muted-foreground">Género</span>
        <select
          className={inputClass}
          value={gender}
          onChange={(e) => setGender(e.target.value)}
        >
          <option value="">Seleccionar</option>
          <option value="FEMALE">Femenino</option>
          <option value="MALE">Masculino</option>
          <option value="NON_BINARY">No Binario</option>
          <option value="UNDISCLOSED">Prefiero no decirlo</option>
          <option value="OTHER">Otro</option>
        </select>
      </label>
      <label className="space-y-1 text-sm">
        <span className="text-muted-foreground">Domicilio</span>
        <input
          className={inputClass}
          name="street-address"
          autoComplete="street-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </label>
      <label className="space-y-1 text-sm">
        <span className="text-muted-foreground">Teléfono</span>
        <input
          className={inputClass}
          name="tel"
          type="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </label>
      <label className="space-y-1 text-sm">
        <span className="text-muted-foreground">Nacionalidad</span>
        <input
          className={inputClass}
          name="country"
          autoComplete="country-name"
          value={nationality}
          onChange={(e) => setNationality(e.target.value)}
        />
      </label>
      <label className="space-y-1 text-sm">
        <span className="text-muted-foreground">Estado civil</span>
        <input
          className={inputClass}
          name="marital-status"
          autoComplete="off"
          value={maritalStatus}
          onChange={(e) => setMaritalStatus(e.target.value)}
        />
      </label>

      {/* Medical Sheet */}
      <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
        <h3 className="text-sm font-semibold">Ficha médica</h3>
        <label className="space-y-1 text-sm block">
          <span className="text-muted-foreground">Alergias</span>
          <textarea
            className={`${inputClass} min-h-[72px] resize-y`}
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
          />
        </label>
        <label className="space-y-1 text-sm block">
          <span className="text-muted-foreground">Medicación habitual</span>
          <textarea
            className={`${inputClass} min-h-[72px] resize-y`}
            value={regularMedication}
            onChange={(e) => setRegularMedication(e.target.value)}
          />
        </label>
        <label className="space-y-1 text-sm block">
          <span className="text-muted-foreground">Enfermedades relevantes</span>
          <textarea
            className={`${inputClass} min-h-[72px] resize-y`}
            value={relevantDiseases}
            onChange={(e) => setRelevantDiseases(e.target.value)}
          />
        </label>
        <label className="space-y-1 text-sm block">
          <span className="text-muted-foreground">Lesiones previas</span>
          <textarea
            className={`${inputClass} min-h-[72px] resize-y`}
            value={previousInjuries}
            onChange={(e) => setPreviousInjuries(e.target.value)}
          />
        </label>
        <label className="space-y-1 text-sm block">
          <span className="text-muted-foreground">Restricciones físicas</span>
          <textarea
            className={`${inputClass} min-h-[72px] resize-y`}
            value={physicalRestrictions}
            onChange={(e) => setPhysicalRestrictions(e.target.value)}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Grupo sanguíneo</span>
          <input
            className={inputClass}
            name="blood-group"
            autoComplete="off"
            value={bloodGroup}
            onChange={(e) => setBloodGroup(e.target.value)}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Médico de cabecera</span>
          <input
            className={inputClass}
            name="doctor-name"
            autoComplete="off"
            value={primaryDoctor}
            onChange={(e) => setPrimaryDoctor(e.target.value)}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Teléfono médico</span>
          <input
            className={inputClass}
            name="doctor-tel"
            type="tel"
            autoComplete="tel"
            value={doctorPhone}
            onChange={(e) => setDoctorPhone(e.target.value)}
          />
        </label>
      </div>
      <label className="space-y-1 text-sm">
        <span className="text-muted-foreground">
          Certificado del médico (imagen)
        </span>
        <input
          className={inputClass}
          type="file"
          accept="image/*"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setDoctorCertificate(await toDataUrl(file));
          }}
        />
      </label>

      <label className="space-y-1 text-sm">
        <span className="text-muted-foreground">Email</span>
        <input
          className={inputClass}
          id="profile-email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="space-y-1 text-sm">
        <span className="text-muted-foreground">Nueva contraseña</span>
        <input
          className={inputClass}
          id="profile-new-password"
          name="new-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <input type="hidden" name="username" value={user.email} />
      {error && <p className="text-destructive text-sm">{error}</p>}
      {success && <p className="text-success text-sm">{success}</p>}
      <Button type="submit" className="w-full">
        Guardar cambios
      </Button>
    </Form>
  );
}
