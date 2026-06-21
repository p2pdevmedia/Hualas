'use client';

import { useState } from 'react';
import NextImage from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import type { Child } from '@prisma/client';

interface ChildEditFormProps {
  child: Child;
  returnTo: string;
}

export default function ChildEditForm({ child, returnTo }: ChildEditFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState(child.name);
  const [lastName, setLastName] = useState(child.lastName ?? '');
  const [documentFrontPhoto, setDocumentFrontPhoto] = useState(
    child.documentFrontPhoto ?? ''
  );
  const [documentBackPhoto, setDocumentBackPhoto] = useState(
    child.documentBackPhoto ?? ''
  );
  const [birthDate, setBirthDate] = useState(
    child.birthDate ? child.birthDate.toISOString().split('T')[0] : ''
  );
  const [documentType, setDocumentType] = useState(child.documentType ?? '');
  const [documentNumber, setDocumentNumber] = useState(
    child.documentNumber ?? ''
  );
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
  const [doctorCertificate, setDoctorCertificate] = useState(
    child.doctorCertificate ?? ''
  );
  const [observations, setObservations] = useState(child.observations ?? '');

  const inputClass =
    'w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary';

  const toDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const image = new window.Image();
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/children/${child.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          lastName,
          documentFrontPhoto,
          documentBackPhoto,
          birthDate: birthDate || null,
          documentType,
          documentNumber,
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
          doctorCertificate: doctorCertificate || undefined,
          observations,
        }),
      });

      if (res.ok) {
        router.push(returnTo);
      }
    } catch (error) {
      console.error('Error updating child:', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Nombre</span>
          <input
            className={inputClass}
            name="given-name"
            autoComplete="given-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
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
        <span className="text-muted-foreground">Tipo de documento</span>
        <select
          className={inputClass}
          name="document-type"
          autoComplete="off"
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value)}
        >
          <option value="">Seleccionar</option>
          <option value="DNI">DNI</option>
          <option value="PASAPORTE">Pasaporte</option>
          <option value="OTRO">Otro</option>
        </select>
      </label>

      <label className="space-y-1 text-sm">
        <span className="text-muted-foreground">Número / Código</span>
        <input
          className={inputClass}
          name="document-number"
          autoComplete="off"
          value={documentNumber}
          onChange={(e) => setDocumentNumber(e.target.value)}
        />
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="space-y-1 text-sm block">
            <span className="text-muted-foreground">Foto delantera DNI</span>
            <input
              className={inputClass}
              type="file"
              accept="image/*"
              required={!documentFrontPhoto}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setDocumentFrontPhoto(await toDataUrl(file));
              }}
            />
          </label>
          {documentFrontPhoto && (
            <div className="rounded-lg border bg-muted/20 p-2">
              <div className="relative h-44 w-full overflow-hidden rounded-md">
                <NextImage
                  src={documentFrontPhoto}
                  alt="Foto delantera actual del documento"
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <label className="space-y-1 text-sm block">
            <span className="text-muted-foreground">Foto trasera DNI</span>
            <input
              className={inputClass}
              type="file"
              accept="image/*"
              required={!documentBackPhoto}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setDocumentBackPhoto(await toDataUrl(file));
              }}
            />
          </label>
          {documentBackPhoto && (
            <div className="rounded-lg border bg-muted/20 p-2">
              <div className="relative h-44 w-full overflow-hidden rounded-md">
                <NextImage
                  src={documentBackPhoto}
                  alt="Foto trasera actual del documento"
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
            </div>
          )}
        </div>
      </div>

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
        <span className="text-muted-foreground">Género</span>
        <select
          className={inputClass}
          name="sex"
          autoComplete="sex"
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
        <label className="space-y-1 text-sm block">
          <span className="text-muted-foreground">Certificado médico</span>
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
        {doctorCertificate && (
          <div className="space-y-2">
            <span className="text-sm text-muted-foreground">
              Certificado actual
            </span>
            <div className="rounded-lg border bg-muted/20 p-2">
              <div className="relative h-56 w-full overflow-hidden rounded-md bg-background">
                <NextImage
                  src={doctorCertificate}
                  alt="Certificado médico actual"
                  fill
                  unoptimized
                  className="object-contain"
                />
              </div>
            </div>
          </div>
        )}
        <label className="space-y-1 text-sm block">
          <span className="text-muted-foreground">Observaciones</span>
          <textarea
            className={`${inputClass} min-h-[72px] resize-y`}
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
          />
        </label>
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
      </Button>
    </form>
  );
}
