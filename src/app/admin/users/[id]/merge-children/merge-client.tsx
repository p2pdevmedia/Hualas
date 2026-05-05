'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface ChildData {
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
  doctorCertificate: string | null;
  profilePhoto: string | null;
  observations: string | null;
  _count: {
    activityParticipants: number;
    socialFeePayments: number;
    pickupNotices: number;
  };
}

type ProfileFieldKey = keyof Omit<ChildData, 'id' | '_count'>;

const PROFILE_FIELDS: { key: ProfileFieldKey; label: string }[] = [
  { key: 'name', label: 'Nombre' },
  { key: 'lastName', label: 'Apellido' },
  { key: 'documentType', label: 'Tipo de documento' },
  { key: 'documentNumber', label: 'Número de documento' },
  { key: 'birthDate', label: 'Fecha de nacimiento' },
  { key: 'address', label: 'Dirección' },
  { key: 'gender', label: 'Género' },
  { key: 'nationality', label: 'Nacionalidad' },
  { key: 'maritalStatus', label: 'Estado civil' },
  { key: 'allergies', label: 'Alergias' },
  { key: 'regularMedication', label: 'Medicación habitual' },
  { key: 'relevantDiseases', label: 'Enfermedades relevantes' },
  { key: 'previousInjuries', label: 'Lesiones previas' },
  { key: 'physicalRestrictions', label: 'Restricciones físicas' },
  { key: 'bloodGroup', label: 'Grupo sanguíneo' },
  { key: 'primaryDoctor', label: 'Médico de cabecera' },
  { key: 'doctorPhone', label: 'Teléfono médico' },
  { key: 'observations', label: 'Observaciones' },
];

const GENDER_LABELS: Record<string, string> = {
  FEMALE: 'Femenino',
  MALE: 'Masculino',
  NON_BINARY: 'No binario',
  UNDISCLOSED: 'Prefiero no decir',
  OTHER: 'Otro',
};

function historyCount(child: ChildData) {
  return (
    child._count.activityParticipants +
    child._count.socialFeePayments +
    child._count.pickupNotices
  );
}

function displayValue(key: ProfileFieldKey, val: string | null): string {
  if (!val) return '—';
  if (key === 'birthDate') {
    return new Date(val).toLocaleDateString('es-AR');
  }
  if (key === 'gender') {
    return GENDER_LABELS[val] ?? val;
  }
  return val;
}

function childFullName(child: ChildData) {
  return [child.name, child.lastName].filter(Boolean).join(' ');
}

type Phase = 'select' | 'review';

export default function MergeChildrenClient({
  children,
  userId,
  userName,
}: {
  children: ChildData[];
  userId: string;
  userName: string;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [phase, setPhase] = useState<Phase>('select');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [survivorId, setSurvivorId] = useState<string | null>(null);
  const [fieldChoices, setFieldChoices] = useState<Record<string, 'survivor' | 'loser'>>({});
  const [loading, setLoading] = useState(false);

  function handleToggle(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return prev;
      return [...prev, id];
    });
  }

  function handleContinue() {
    if (selectedIds.length !== 2) return;
    const [idA, idB] = selectedIds;
    const childA = children.find((c) => c.id === idA)!;
    const childB = children.find((c) => c.id === idB)!;

    const autoSurvivorId =
      historyCount(childA) >= historyCount(childB) ? idA : idB;
    const autoLoserId = autoSurvivorId === idA ? idB : idA;

    setSurvivorId(autoSurvivorId);

    const survivor = autoSurvivorId === idA ? childA : childB;
    const loser = autoLoserId === idA ? childA : childB;

    const initialChoices: Record<string, 'survivor' | 'loser'> = {};
    for (const { key } of PROFILE_FIELDS) {
      const sVal = survivor[key];
      const lVal = loser[key];
      if (sVal && lVal && sVal !== lVal) {
        initialChoices[key] = 'survivor';
      }
    }

    setFieldChoices(initialChoices);
    setPhase('review');
  }

  function handleSwap() {
    if (!survivorId || selectedIds.length !== 2) return;
    const newSurvivorId = selectedIds.find((id) => id !== survivorId)!;
    setSurvivorId(newSurvivorId);
    setFieldChoices((prev) => {
      const flipped: Record<string, 'survivor' | 'loser'> = {};
      for (const [key, choice] of Object.entries(prev)) {
        flipped[key] = choice === 'survivor' ? 'loser' : 'survivor';
      }
      return flipped;
    });
  }

  async function handleMerge() {
    if (!survivorId || selectedIds.length !== 2) return;
    const loserId = selectedIds.find((id) => id !== survivorId)!;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/merge-children`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ survivorId, loserId, fieldChoices }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'No se pudo fusionar los hijos');
      }

      toast({ title: 'Hijos fusionados', description: 'La fusión se completó correctamente.' });
      router.push(`/admin/users/${userId}/view`);
      router.refresh();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'No se pudo fusionar',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  // ── Select phase ──────────────────────────────────────────────────────────
  if (phase === 'select') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fusionar Hijos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Seleccioná dos hijos de {userName} para fusionar. El historial del
            hijo que se elimine se transferirá al que quede.
          </p>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-3">
          <p className="text-sm font-medium">Seleccioná exactamente 2 hijos:</p>
          <ul className="divide-y divide-border">
            {children.map((child) => {
              const isSelected = selectedIds.includes(child.id);
              const total = historyCount(child);
              return (
                <li key={child.id}>
                  <button
                    type="button"
                    onClick={() => handleToggle(child.id)}
                    disabled={!isSelected && selectedIds.length >= 2}
                    className={`w-full flex items-center justify-between gap-4 py-3 px-2 rounded-lg text-left transition-colors ${
                      isSelected
                        ? 'bg-primary/10 border border-primary/30'
                        : 'hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed'
                    }`}
                  >
                    <div>
                      <span className="font-medium">{childFullName(child)}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {total}{' '}
                        {total === 1 ? 'registro de historial' : 'registros de historial'}
                      </span>
                    </div>
                    {isSelected && (
                      <span className="shrink-0 rounded-full bg-primary text-primary-foreground text-xs px-2 py-0.5 font-medium">
                        Seleccionado
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleContinue} disabled={selectedIds.length !== 2}>
            Continuar
          </Button>
          <Link
            href={`/admin/users/${userId}/view`}
            className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
          >
            Cancelar
          </Link>
        </div>
      </div>
    );
  }

  // ── Review phase ──────────────────────────────────────────────────────────
  const survivor = children.find((c) => c.id === survivorId)!;
  const loser = children.find((c) => selectedIds.includes(c.id) && c.id !== survivorId)!;

  const conflictFields = PROFILE_FIELDS.filter(({ key }) => {
    const sVal = survivor[key];
    const lVal = loser[key];
    return sVal && lVal && sVal !== lVal;
  });

  const autoFillFields = PROFILE_FIELDS.filter(({ key }) => {
    return !survivor[key] && loser[key];
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Revisar Fusión</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Confirmá los datos antes de fusionar. Esta acción no se puede deshacer.
        </p>
      </div>

      {/* Survivor selector */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <h2 className="text-base font-semibold">¿Cuál hijo queda?</h2>
        <div className="grid grid-cols-2 gap-3">
          {selectedIds.map((id) => {
            const child = children.find((c) => c.id === id)!;
            const isSurvivor = id === survivorId;
            const total = historyCount(child);
            return (
              <button
                key={id}
                type="button"
                onClick={() => { if (!isSurvivor) handleSwap(); }}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  isSurvivor
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted'
                }`}
              >
                <div className="font-medium">{childFullName(child)}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {total} {total === 1 ? 'registro' : 'registros'} de historial
                </div>
                {isSurvivor && (
                  <span className="mt-2 inline-block rounded-full bg-primary text-primary-foreground text-xs px-2 py-0.5 font-medium">
                    Queda este
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          El historial de{' '}
          <span className="font-medium">{childFullName(loser)}</span> se
          transferirá a{' '}
          <span className="font-medium">{childFullName(survivor)}</span>, y
          luego se borrará permanentemente.
        </p>
      </div>

      {/* Conflicting fields */}
      {conflictFields.length > 0 && (
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-semibold">Datos con conflicto</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Ambos hijos tienen valores distintos en estos campos. Elegí cuál
              conservar.
            </p>
          </div>
          <div className="space-y-4">
            {conflictFields.map(({ key, label }) => {
              const sVal = survivor[key];
              const lVal = loser[key];
              const choice = fieldChoices[key] ?? 'survivor';
              return (
                <div key={key} className="space-y-2">
                  <p className="text-sm font-medium">{label}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setFieldChoices((prev) => ({ ...prev, [key]: 'survivor' }))
                      }
                      className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                        choice === 'survivor'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted'
                      }`}
                    >
                      <div className="text-xs text-muted-foreground mb-1">
                        De {survivor.name}
                      </div>
                      <div>{displayValue(key, sVal as string | null)}</div>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFieldChoices((prev) => ({ ...prev, [key]: 'loser' }))
                      }
                      className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                        choice === 'loser'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted'
                      }`}
                    >
                      <div className="text-xs text-muted-foreground mb-1">
                        De {loser.name}
                      </div>
                      <div>{displayValue(key, lVal as string | null)}</div>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Auto-filled fields */}
      {autoFillFields.length > 0 && (
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-3">
          <div>
            <h2 className="text-base font-semibold">Datos que se copiarán</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Estos datos solo existen en {childFullName(loser)} y se copiarán
              a {childFullName(survivor)}.
            </p>
          </div>
          <ul className="space-y-1 text-sm">
            {autoFillFields.map(({ key, label }) => (
              <li
                key={key}
                className="flex items-center justify-between gap-2 rounded-md bg-muted/30 px-3 py-2"
              >
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">
                  {displayValue(key, loser[key] as string | null)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* History transfer summary */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-2">
        <h2 className="text-base font-semibold">Historial que se transfiere</h2>
        <p className="text-sm text-muted-foreground">
          De{' '}
          <span className="font-medium">{childFullName(loser)}</span> a{' '}
          <span className="font-medium">{childFullName(survivor)}</span>:
        </p>
        <ul className="text-sm space-y-1 mt-2">
          <li>
            • {loser._count.activityParticipants} inscripción
            {loser._count.activityParticipants !== 1 ? 'es' : ''} a actividades
          </li>
          <li>
            • {loser._count.socialFeePayments} pago
            {loser._count.socialFeePayments !== 1 ? 's' : ''} de cuota social
          </li>
          <li>
            • {loser._count.pickupNotices} aviso
            {loser._count.pickupNotices !== 1 ? 's' : ''} de retiro
          </li>
        </ul>
        <p className="text-xs text-muted-foreground mt-2">
          Si hay registros duplicados (ej: inscriptos a la misma actividad), se
          conserva el de {childFullName(survivor)} y se descarta el de{' '}
          {childFullName(loser)}.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setPhase('select')}
          disabled={loading}
          className="inline-flex h-9 items-center justify-center rounded-full border border-border px-4 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
        >
          Atrás
        </button>
        <Button variant="destructive" onClick={handleMerge} disabled={loading}>
          {loading ? 'Fusionando...' : 'Confirmar Fusión'}
        </Button>
        <Link
          href={`/admin/users/${userId}/view`}
          className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
        >
          Cancelar
        </Link>
      </div>
    </div>
  );
}
