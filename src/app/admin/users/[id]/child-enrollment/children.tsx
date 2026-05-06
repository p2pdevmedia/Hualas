'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';

type Child = {
  id: string;
  name: string;
  lastName: string | null;
  documentType: string | null;
  documentNumber: string | null;
  documentFrontPhoto: string | null;
  documentBackPhoto: string | null;
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

export default function AdminChildrenManager({ userId }: { userId: string }) {
  const [children, setChildren] = useState<Child[]>([]);
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [documentFrontPhoto, setDocumentFrontPhoto] = useState('');
  const [documentBackPhoto, setDocumentBackPhoto] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [address, setAddress] = useState('');
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
    fetch(`/api/users/${userId}/children`)
      .then((res) => res.json())
      .then((data) => setChildren(data));
  }, [userId]);

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
        documentFrontPhoto,
        documentBackPhoto,
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
      setDocumentFrontPhoto('');
      setDocumentBackPhoto('');
      setBirthDate('');
      setAddress('');
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
    <div className="space-y-4">
      {children.length > 0 && (
        <div className="rounded-xl border bg-card p-4 shadow-sm space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Hijos registrados
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
                {c.documentFrontPhoto && c.documentBackPhoto && (
                  <span className="text-muted-foreground ml-2">
                    · DNI completo
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-3">
        <h2 className="text-base font-semibold">Agregar hijo</h2>
        <Form onSubmit={addChild} className="space-y-3">
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-sm text-muted-foreground space-y-1">
              <span>Foto delantera DNI</span>
              <input
                className={inputClass}
                type="file"
                accept="image/*"
                required={documentType === 'DNI'}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setDocumentFrontPhoto(await toDataUrl(file));
                }}
              />
            </label>
            <label className="text-sm text-muted-foreground space-y-1">
              <span>Foto trasera DNI</span>
              <input
                className={inputClass}
                type="file"
                accept="image/*"
                required={documentType === 'DNI'}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setDocumentBackPhoto(await toDataUrl(file));
                }}
              />
            </label>
          </div>
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
        </Form>
      </div>
    </div>
  );
}
