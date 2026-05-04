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

const emptyForm = {
  name: '',
  lastName: '',
  documentType: '',
  documentNumber: '',
  documentFrontPhoto: '',
  documentBackPhoto: '',
  birthDate: '',
  address: '',
  sameAddress: false,
  gender: '',
  nationality: '',
  maritalStatus: '',
  relationshipDeclarationAccepted: false,
  allergies: '',
  regularMedication: '',
  relevantDiseases: '',
  previousInjuries: '',
  physicalRestrictions: '',
  bloodGroup: '',
  primaryDoctor: '',
  doctorPhone: '',
  observations: '',
};

export default function ChildrenManager({
  userAddress,
}: {
  userAddress: string;
}) {
  const [children, setChildren] = useState<Child[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const inputClass =
    'w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary';

  useEffect(() => {
    fetch('/api/children')
      .then((res) => res.json())
      .then((data) => setChildren(data));
  }, []);

  useEffect(() => {
    if (form.sameAddress) setForm((f) => ({ ...f, address: userAddress }));
  }, [form.sameAddress, userAddress]);

  const set = (key: keyof typeof emptyForm, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

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

  function startEdit(child: Child) {
    setEditingId(child.id);
    setForm({
      name: child.name,
      lastName: child.lastName ?? '',
      documentType: child.documentType ?? '',
      documentNumber: child.documentNumber ?? '',
      documentFrontPhoto: child.documentFrontPhoto ?? '',
      documentBackPhoto: child.documentBackPhoto ?? '',
      birthDate: child.birthDate
        ? new Date(child.birthDate).toISOString().slice(0, 10)
        : '',
      address: child.address ?? '',
      sameAddress: false,
      gender: child.gender ?? '',
      nationality: child.nationality ?? '',
      maritalStatus: child.maritalStatus ?? '',
      relationshipDeclarationAccepted: true,
      allergies: child.allergies ?? '',
      regularMedication: child.regularMedication ?? '',
      relevantDiseases: child.relevantDiseases ?? '',
      previousInjuries: child.previousInjuries ?? '',
      physicalRestrictions: child.physicalRestrictions ?? '',
      bloodGroup: child.bloodGroup ?? '',
      primaryDoctor: child.primaryDoctor ?? '',
      doctorPhone: child.doctorPhone ?? '',
      observations: child.observations ?? '',
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  const payload = () => ({
    name: form.name,
    lastName: form.lastName,
    documentType: form.documentType,
    documentNumber: form.documentNumber,
    documentFrontPhoto: form.documentFrontPhoto,
    documentBackPhoto: form.documentBackPhoto,
    birthDate: form.birthDate,
    address: form.address,
    gender: form.gender || undefined,
    nationality: form.nationality,
    maritalStatus: form.maritalStatus,
    allergies: form.allergies,
    regularMedication: form.regularMedication,
    relevantDiseases: form.relevantDiseases,
    previousInjuries: form.previousInjuries,
    physicalRestrictions: form.physicalRestrictions,
    bloodGroup: form.bloodGroup,
    primaryDoctor: form.primaryDoctor,
    doctorPhone: form.doctorPhone,
    observations: form.observations,
  });

  async function saveChild(e: React.FormEvent) {
    e.preventDefault();
    if (editingId) {
      const res = await fetch(`/api/children/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload()),
      });
      if (res.ok) {
        const updated = await res.json();
        setChildren(children.map((c) => (c.id === editingId ? updated : c)));
        cancelEdit();
      }
    } else {
      const res = await fetch('/api/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload()),
      });
      if (res.ok) {
        const child = await res.json();
        setChildren([...children, child]);
        setForm(emptyForm);
      }
    }
  }

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
      <h2 className="text-lg font-semibold tracking-tight">Infancias</h2>
      {children.length > 0 && (
        <ul className="space-y-1">
          {children.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between text-sm text-muted-foreground"
            >
              <span>
                {c.name} {c.lastName}
              </span>
              <button
                type="button"
                onClick={() => startEdit(c)}
                className="text-xs text-primary underline hover:no-underline"
              >
                Editar
              </button>
            </li>
          ))}
        </ul>
      )}
      <Form onSubmit={saveChild} className="space-y-3">
        {editingId && (
          <div className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2 text-sm">
            <span className="font-medium">Editando hijo</span>
            <button
              type="button"
              onClick={cancelEdit}
              className="text-xs text-muted-foreground underline hover:no-underline"
            >
              Cancelar
            </button>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <input
            className={inputClass}
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Nombre"
            required
          />
          <input
            className={inputClass}
            value={form.lastName}
            onChange={(e) => set('lastName', e.target.value)}
            placeholder="Apellido"
          />
        </div>
        <select
          className={inputClass}
          value={form.documentType}
          onChange={(e) => set('documentType', e.target.value)}
        >
          <option value="">Tipo de documento</option>
          <option value="DNI">DNI</option>
          <option value="PASAPORTE">Pasaporte</option>
          <option value="OTRO">Otro</option>
        </select>
        <input
          className={inputClass}
          value={form.documentNumber}
          onChange={(e) => set('documentNumber', e.target.value)}
          placeholder="Número / Código"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm text-muted-foreground space-y-1">
            <span>Foto delantera DNI</span>
            <input
              className={inputClass}
              type="file"
              accept="image/*"
              capture="environment"
              required={form.documentType === 'DNI' && !editingId && !form.documentFrontPhoto}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                set('documentFrontPhoto', await toDataUrl(file));
              }}
            />
            {editingId && form.documentFrontPhoto && (
              <span className="text-xs text-green-600">Foto cargada</span>
            )}
          </label>
          <label className="text-sm text-muted-foreground space-y-1">
            <span>Foto trasera DNI</span>
            <input
              className={inputClass}
              type="file"
              accept="image/*"
              capture="environment"
              required={form.documentType === 'DNI' && !editingId && !form.documentBackPhoto}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                set('documentBackPhoto', await toDataUrl(file));
              }}
            />
            {editingId && form.documentBackPhoto && (
              <span className="text-xs text-green-600">Foto cargada</span>
            )}
          </label>
        </div>
        <input
          className={inputClass}
          type="date"
          value={form.birthDate}
          onChange={(e) => set('birthDate', e.target.value)}
        />
        <input
          className={inputClass}
          value={form.address}
          onChange={(e) => set('address', e.target.value)}
          placeholder="Domicilio"
        />
        <label className="text-sm flex items-center gap-2 text-muted-foreground">
          <input
            type="checkbox"
            checked={form.sameAddress}
            onChange={(e) => set('sameAddress', e.target.checked)}
            className="accent-primary"
          />
          Mismo domicilio que el usuario
        </label>
        <select
          className={inputClass}
          value={form.gender}
          onChange={(e) => set('gender', e.target.value)}
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
          value={form.nationality}
          onChange={(e) => set('nationality', e.target.value)}
          placeholder="Nacionalidad"
        />
        <input
          className={inputClass}
          value={form.maritalStatus}
          onChange={(e) => set('maritalStatus', e.target.value)}
          placeholder="Estado Civil"
        />
        {!editingId && (
          <label className="text-sm flex items-start gap-2 text-muted-foreground">
            <input
              type="checkbox"
              checked={form.relationshipDeclarationAccepted}
              onChange={(e) =>
                set('relationshipDeclarationAccepted', e.target.checked)
              }
              className="accent-primary mt-0.5"
              required
            />
            <span>
              Declaro, bajo carácter de declaración jurada, que soy padre,
              madre o tutor legal del menor que estoy registrando.
            </span>
          </label>
        )}
        <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
          <h3 className="text-sm font-semibold">Ficha médica</h3>
          <textarea
            className={`${inputClass} min-h-[72px] resize-y`}
            value={form.allergies}
            onChange={(e) => set('allergies', e.target.value)}
            placeholder="Alergias"
          />
          <textarea
            className={`${inputClass} min-h-[72px] resize-y`}
            value={form.regularMedication}
            onChange={(e) => set('regularMedication', e.target.value)}
            placeholder="Medicación habitual"
          />
          <textarea
            className={`${inputClass} min-h-[72px] resize-y`}
            value={form.relevantDiseases}
            onChange={(e) => set('relevantDiseases', e.target.value)}
            placeholder="Enfermedades relevantes"
          />
          <textarea
            className={`${inputClass} min-h-[72px] resize-y`}
            value={form.previousInjuries}
            onChange={(e) => set('previousInjuries', e.target.value)}
            placeholder="Lesiones previas"
          />
          <textarea
            className={`${inputClass} min-h-[72px] resize-y`}
            value={form.physicalRestrictions}
            onChange={(e) => set('physicalRestrictions', e.target.value)}
            placeholder="Restricciones físicas"
          />
          <input
            className={inputClass}
            value={form.bloodGroup}
            onChange={(e) => set('bloodGroup', e.target.value)}
            placeholder="Grupo sanguíneo"
          />
          <input
            className={inputClass}
            value={form.primaryDoctor}
            onChange={(e) => set('primaryDoctor', e.target.value)}
            placeholder="Médico de cabecera"
          />
          <input
            className={inputClass}
            value={form.doctorPhone}
            onChange={(e) => set('doctorPhone', e.target.value)}
            placeholder="Teléfono médico"
          />
          <textarea
            className={`${inputClass} min-h-[72px] resize-y`}
            value={form.observations}
            onChange={(e) => set('observations', e.target.value)}
            placeholder="Observaciones"
          />
        </div>
        <Button type="submit" className="w-full">
          {editingId ? 'Guardar cambios' : 'Agregar hijo'}
        </Button>
      </Form>
    </div>
  );
}
