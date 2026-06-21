'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';

const SOUTH_AMERICA_NATIONALITIES = [
  'Argentina',
  'Brasil',
  'Chile',
  'Bolivia',
  'Paraguay',
  'Uruguay',
  'Perú',
  'Ecuador',
  'Colombia',
  'Venezuela',
  'Guyana',
  'Surinam',
];

const NATIONALITY_SEARCH_OPTIONS = [
  'Alemania',
  'Australia',
  'Austria',
  'Bélgica',
  'Bolivia',
  'Canadá',
  'China',
  'Colombia',
  'Corea del Sur',
  'Costa Rica',
  'Cuba',
  'Dinamarca',
  'Ecuador',
  'Egipto',
  'El Salvador',
  'España',
  'Estados Unidos',
  'Finlandia',
  'Francia',
  'Grecia',
  'Guatemala',
  'Haití',
  'Honduras',
  'India',
  'Indonesia',
  'Italia',
  'Japón',
  'México',
  'Nicaragua',
  'Noruega',
  'Nueva Zelanda',
  'Países Bajos',
  'Panamá',
  'Paraguay',
  'Perú',
  'Polonia',
  'Portugal',
  'Reino Unido',
  'República Dominicana',
  'Suecia',
  'Suiza',
  'Uruguay',
  'Venezuela',
  'Vietnam',
  'Sudáfrica',
  'Turquía',
  'Rusia',
  'Ucrania',
  'Irlanda',
  'Islandia',
  'Marruecos',
  'Argelia',
  'Nigeria',
  'Kenia',
  'Chile',
  'Brasil',
  'Argentina',
  'Filipinas',
  'Tailandia',
  'Pakistán',
  'Bangladés',
  'Arabia Saudita',
  'Emiratos Árabes Unidos',
  'Israel',
  'Líbano',
  'Qatar',
  'Singapur',
  'Malasia',
  'Rumania',
  'Hungría',
  'Chequia',
  'Eslovaquia',
  'Croacia',
  'Serbia',
  'Eslovenia',
  'Bulgaria',
  'Ucrania',
  'Kazajistán',
  'Armenia',
  'Georgia',
  'Azerbaiyán',
  'Luxemburgo',
  'Mónaco',
  'Andorra',
  'Liechtenstein',
  'Malta',
  'Chipre',
  'Estonia',
  'Letonia',
  'Lituania',
  'Bielorrusia',
  'Camboya',
  'Laos',
  'Myanmar',
  'Nepal',
  'Sri Lanka',
  'Mongolia',
  'Corea del Norte',
  'Taiwán',
  'Hong Kong',
  'Macao',
];

export default function AddChildForm({ userAddress }: { userAddress: string }) {
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [documentFrontPhoto, setDocumentFrontPhoto] = useState('');
  const [documentBackPhoto, setDocumentBackPhoto] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [address, setAddress] = useState('');
  const [sameAddress, setSameAddress] = useState(false);
  const [gender, setGender] = useState('');
  const [nationality, setNationality] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [relationshipDeclarationAccepted, setRelationshipDeclarationAccepted] =
    useState(false);
  const [allergies, setAllergies] = useState('');
  const [regularMedication, setRegularMedication] = useState('');
  const [relevantDiseases, setRelevantDiseases] = useState('');
  const [previousInjuries, setPreviousInjuries] = useState('');
  const [physicalRestrictions, setPhysicalRestrictions] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [primaryDoctor, setPrimaryDoctor] = useState('');
  const [doctorPhone, setDoctorPhone] = useState('');
  const [doctorCertificate, setDoctorCertificate] = useState('');
  const [observations, setObservations] = useState('');
  const [nationalityMode, setNationalityMode] = useState<
    'unset' | 'common' | 'search'
  >('unset');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const inputClass =
    'w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary';

  const labelClass = 'text-sm font-medium text-foreground';
  const inputModeClass =
    'w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary';
  const nationalityIsCommon = SOUTH_AMERICA_NATIONALITIES.includes(nationality);
  const requiredMark = <span className="text-destructive">*</span>;

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

  const handleSameAddress = (checked: boolean) => {
    setSameAddress(checked);
    if (checked) {
      setAddress(userAddress);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!relationshipDeclarationAccepted) {
      setError('Debes aceptar la declaración de relación');
      return;
    }

    try {
      const trimmed = (value: string) => value.trim();
      const res = await fetch('/api/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmed(name),
          lastName: trimmed(lastName),
          documentType: trimmed(documentType),
          documentNumber: trimmed(documentNumber),
          documentFrontPhoto,
          documentBackPhoto,
          birthDate: trimmed(birthDate),
          address: trimmed(address),
          gender,
          nationality: trimmed(nationality),
          maritalStatus: trimmed(maritalStatus),
          allergies: trimmed(allergies),
          regularMedication: trimmed(regularMedication),
          relevantDiseases: trimmed(relevantDiseases),
          previousInjuries: trimmed(previousInjuries),
          physicalRestrictions: trimmed(physicalRestrictions),
          bloodGroup: trimmed(bloodGroup),
          primaryDoctor: trimmed(primaryDoctor),
          doctorPhone: trimmed(doctorPhone),
          doctorCertificate: doctorCertificate || undefined,
          observations: trimmed(observations),
        }),
      });

      if (!res.ok) throw new Error('Request failed');
      setSuccess('Hijo/a agregado correctamente');
      setTimeout(() => router.push('/profile/children'), 1500);
    } catch (e) {
      setError('No se pudo agregar el hijo/a');
    }
  }

  return (
    <Form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="child-name" className={labelClass}>
            Nombre {requiredMark}
          </label>
          <input
            id="child-name"
            className={inputClass}
            name="given-name"
            autoComplete="given-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="child-last-name" className={labelClass}>
            Apellido {requiredMark}
          </label>
          <input
            id="child-last-name"
            className={inputClass}
            name="family-name"
            autoComplete="family-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="child-document-type" className={labelClass}>
          Tipo de documento {requiredMark}
        </label>
        <select
          id="child-document-type"
          className={inputClass}
          name="document-type"
          autoComplete="off"
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value)}
          required
        >
          <option value="">Seleccioná una opción</option>
          <option value="DNI">DNI</option>
          <option value="PASAPORTE">Pasaporte</option>
          <option value="OTRO">Otro</option>
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="child-document-number" className={labelClass}>
          Número / Código {requiredMark}
        </label>
        <input
          id="child-document-number"
          className={inputClass}
          name="document-number"
          autoComplete="off"
          value={documentNumber}
          onChange={(e) => setDocumentNumber(e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="child-doc-front" className={labelClass}>
            Foto delantera DNI {requiredMark}
          </label>
          <input
            id="child-doc-front"
            className={inputClass}
            type="file"
            accept="image/*"
            required
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setDocumentFrontPhoto(await toDataUrl(file));
            }}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="child-doc-back" className={labelClass}>
            Foto trasera DNI {requiredMark}
          </label>
          <input
            id="child-doc-back"
            className={inputClass}
            type="file"
            accept="image/*"
            required
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setDocumentBackPhoto(await toDataUrl(file));
            }}
          />
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="child-birth-date" className={labelClass}>
          Fecha de nacimiento {requiredMark}
        </label>
        <input
          id="child-birth-date"
          className={inputClass}
          name="birth-date"
          autoComplete="bday"
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="child-address" className={labelClass}>
          Domicilio {requiredMark}
        </label>
        <input
          id="child-address"
          className={inputClass}
          name="street-address"
          autoComplete="street-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
        />
      </div>

      <label className="text-sm flex items-center gap-2 text-muted-foreground">
        <input
          type="checkbox"
          checked={sameAddress}
          onChange={(e) => handleSameAddress(e.target.checked)}
          className="accent-primary"
        />
        Mismo domicilio que el usuario
      </label>

      <div className="space-y-1">
        <label htmlFor="child-gender" className={labelClass}>
          Género {requiredMark}
        </label>
        <select
          id="child-gender"
          className={inputClass}
          name="sex"
          autoComplete="sex"
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          required
        >
          <option value="">Seleccioná una opción</option>
          <option value="FEMALE">Femenino</option>
          <option value="MALE">Masculino</option>
          <option value="NON_BINARY">No Binario</option>
          <option value="UNDISCLOSED">Prefiero no decirlo</option>
          <option value="OTHER">Otro</option>
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="child-nationality" className={labelClass}>
          Nacionalidad {requiredMark}
        </label>
        <select
          id="child-nationality"
          className={inputClass}
          value={
            nationalityMode === 'search'
              ? '__search__'
              : nationalityMode === 'common' && nationalityIsCommon
                ? nationality
                : ''
          }
          onChange={(e) => {
            if (e.target.value === '__search__') {
              setNationalityMode('search');
              return;
            }

            setNationalityMode('common');
            setNationality(e.target.value);
          }}
          required
        >
          <option value="">Seleccioná una opción</option>
          {SOUTH_AMERICA_NATIONALITIES.map((country) => (
            <option key={country} value={country}>
              {country}
            </option>
          ))}
          <option value="__search__">Otra nacionalidad, buscar...</option>
        </select>
        {nationalityMode === 'search' && (
          <div className="space-y-1">
            <input
              id="child-nationality-search"
              className={inputModeClass}
              list="child-nationality-options"
              placeholder="Escribí la nacionalidad"
              value={nationality}
              onChange={(e) => setNationality(e.target.value)}
              required
            />
            <datalist id="child-nationality-options">
              {NATIONALITY_SEARCH_OPTIONS.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="child-marital-status" className={labelClass}>
          Estado Civil {requiredMark}
        </label>
        <input
          id="child-marital-status"
          className={inputClass}
          name="marital-status"
          autoComplete="off"
          value={maritalStatus}
          onChange={(e) => setMaritalStatus(e.target.value)}
          required
        />
      </div>

      <label className="text-sm flex items-start gap-2 text-muted-foreground">
        <input
          type="checkbox"
          checked={relationshipDeclarationAccepted}
          onChange={(e) => setRelationshipDeclarationAccepted(e.target.checked)}
          className="accent-primary mt-0.5"
          required
        />
        <span>
          Declaro, bajo carácter de declaración jurada, que soy padre, madre o
          tutor legal del menor que estoy registrando. {requiredMark}
        </span>
      </label>

      <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
        <h3 className="text-sm font-semibold">Ficha médica</h3>

        <div className="space-y-1">
          <label htmlFor="child-allergies" className={labelClass}>
            Alergias {requiredMark}
          </label>
          <textarea
            id="child-allergies"
            className={`${inputClass} min-h-[72px] resize-y`}
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="child-medication" className={labelClass}>
            Medicación habitual {requiredMark}
          </label>
          <textarea
            id="child-medication"
            className={`${inputClass} min-h-[72px] resize-y`}
            value={regularMedication}
            onChange={(e) => setRegularMedication(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="child-diseases" className={labelClass}>
            Enfermedades relevantes {requiredMark}
          </label>
          <textarea
            id="child-diseases"
            className={`${inputClass} min-h-[72px] resize-y`}
            value={relevantDiseases}
            onChange={(e) => setRelevantDiseases(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="child-injuries" className={labelClass}>
            Lesiones previas {requiredMark}
          </label>
          <textarea
            id="child-injuries"
            className={`${inputClass} min-h-[72px] resize-y`}
            value={previousInjuries}
            onChange={(e) => setPreviousInjuries(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="child-restrictions" className={labelClass}>
            Restricciones físicas {requiredMark}
          </label>
          <textarea
            id="child-restrictions"
            className={`${inputClass} min-h-[72px] resize-y`}
            value={physicalRestrictions}
            onChange={(e) => setPhysicalRestrictions(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="child-blood-group" className={labelClass}>
            Grupo sanguíneo {requiredMark}
          </label>
          <input
            id="child-blood-group"
            className={inputClass}
            name="blood-group"
            autoComplete="off"
            value={bloodGroup}
            onChange={(e) => setBloodGroup(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="child-doctor" className={labelClass}>
            Médico de cabecera {requiredMark}
          </label>
          <input
            id="child-doctor"
            className={inputClass}
            name="doctor-name"
            autoComplete="off"
            value={primaryDoctor}
            onChange={(e) => setPrimaryDoctor(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="child-doctor-phone" className={labelClass}>
            Teléfono médico {requiredMark}
          </label>
          <input
            id="child-doctor-phone"
            className={inputClass}
            name="doctor-tel"
            type="tel"
            autoComplete="tel"
            value={doctorPhone}
            onChange={(e) => setDoctorPhone(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="child-doctor-cert" className={labelClass}>
            Certificado del médico (imagen)
          </label>
          <input
            id="child-doctor-cert"
            className={inputClass}
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setDoctorCertificate(await toDataUrl(file));
            }}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="child-observations" className={labelClass}>
            Observaciones {requiredMark}
          </label>
          <textarea
            id="child-observations"
            className={`${inputClass} min-h-[72px] resize-y`}
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            required
          />
        </div>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}
      {success && <p className="text-success text-sm">{success}</p>}
      <Button type="submit" className="w-full">
        Agregar hijo/a
      </Button>
    </Form>
  );
}
