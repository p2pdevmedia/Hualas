'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ACTIVITY_CART_STORAGE_KEY, ActivityCartItem } from '@/lib/cart';
import RegisterButton from '@/components/register-button';
import GroupScheduleCalendar from './group-schedule-calendar';
import PersonPicker, { Avatar } from './person-picker';
import { formatAmount } from '@/lib/accounting';

type Group = {
  id: string;
  name: string;
  minAge: number | null;
  maxAge: number | null;
  professors: string[];
};
type Session = {
  id: string;
  date: string;
  schedule: string;
  activityGroupId: string | null;
  sportIcon: string | null;
};
type Child = {
  id: string;
  name: string;
  lastName: string | null;
  documentNumber: string | null;
  birthDate: string | null;
  address: string | null;
};

type ChildProfileModalProps = {
  child: Child;
  missingFields: string[];
  onClose: () => void;
  onSaved: (child: Child) => void;
};

function getMissingChildFields(child: Child): string[] {
  const missing: string[] = [];
  if (!child.name?.trim()) missing.push('nombre del menor');
  if (!child.lastName?.trim()) missing.push('apellido del menor');
  if (!child.documentNumber?.trim()) missing.push('DNI del menor');
  if (!child.birthDate) missing.push('fecha de nacimiento del menor');
  if (!child.address?.trim()) missing.push('dirección del menor');
  return missing;
}

function toDateInputValue(value: string | null) {
  if (!value) return '';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';

  return parsed.toISOString().split('T')[0];
}

function ChildProfileModal({
  child,
  missingFields,
  onClose,
  onSaved,
}: ChildProfileModalProps) {
  const [name, setName] = useState(child.name);
  const [lastName, setLastName] = useState(child.lastName ?? '');
  const [documentNumber, setDocumentNumber] = useState(
    child.documentNumber ?? ''
  );
  const [birthDate, setBirthDate] = useState(toDateInputValue(child.birthDate));
  const [address, setAddress] = useState(child.address ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const inputClass =
    'w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsSaving(true);

    try {
      const res = await fetch(`/api/children/${child.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          lastName,
          documentNumber,
          birthDate: birthDate || null,
          address,
        }),
      });

      if (!res.ok) {
        throw new Error('No se pudieron guardar los datos');
      }

      const updated = await res.json();
      onSaved({
        id: updated.id,
        name: updated.name,
        lastName: updated.lastName ?? null,
        documentNumber: updated.documentNumber ?? null,
        birthDate: updated.birthDate
          ? new Date(updated.birthDate).toISOString()
          : null,
        address: updated.address ?? null,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudieron guardar los datos'
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="child-profile-modal-title"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border bg-card p-6 shadow-xl">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Datos del menor
          </p>
          <h2
            id="child-profile-modal-title"
            className="text-xl font-semibold tracking-tight"
          >
            Completar datos de {child.name}
          </h2>
          <p className="text-sm text-muted-foreground">
            Cargá los datos obligatorios para poder inscribir a este menor en la
            actividad.
          </p>
        </div>

        {missingFields.length > 0 && (
          <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Faltan: {missingFields.join(', ')}.
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-medium">Nombre</span>
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
              <span className="font-medium">Apellido</span>
              <input
                className={inputClass}
                name="family-name"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </label>
          </div>

          <label className="space-y-1 text-sm block">
            <span className="font-medium">DNI del menor</span>
            <input
              className={inputClass}
              name="document-number"
              autoComplete="off"
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
              required
            />
          </label>

          <label className="space-y-1 text-sm block">
            <span className="font-medium">Fecha de nacimiento</span>
            <input
              className={inputClass}
              name="birth-date"
              autoComplete="bday"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              required
            />
          </label>

          <label className="space-y-1 text-sm block">
            <span className="font-medium">Dirección</span>
            <input
              className={inputClass}
              name="street-address"
              autoComplete="street-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </label>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-md border px-4 py-2 text-sm hover:bg-muted disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {isSaving ? 'Guardando…' : 'Guardar datos'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function calculateAge(birthDate: Date, referenceDate: Date): number {
  let age = referenceDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = referenceDate.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && referenceDate.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age;
}

function getReferenceDate(activityStartDate?: string | null) {
  const today = new Date();
  const parsedActivityDate = activityStartDate
    ? new Date(activityStartDate)
    : null;

  return parsedActivityDate &&
    !Number.isNaN(parsedActivityDate.getTime()) &&
    parsedActivityDate > today
    ? parsedActivityDate
    : today;
}

function getPersonAge(
  birthDate: string | null | undefined,
  activityStartDate?: string | null
) {
  if (!birthDate) return null;

  const parsedBirthDate = new Date(birthDate);
  if (Number.isNaN(parsedBirthDate.getTime())) return null;

  return calculateAge(parsedBirthDate, getReferenceDate(activityStartDate));
}

function formatSessionLabel(session: Session | null) {
  if (!session) return undefined;
  const date = new Date(session.date);
  const label = date.toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  return `${label} · ${session.schedule}`;
}

function isGroupEligibleForAge(group: Group, age: number | null) {
  if (age === null) return true;
  if (group.minAge !== null && age < group.minAge) return false;
  if (group.maxAge !== null && age > group.maxAge) return false;
  return true;
}

function getGroupAgeError(
  group: Group | undefined,
  birthDate: string | null | undefined,
  activityStartDate?: string | null
) {
  if (!group || (group.minAge === null && group.maxAge === null)) return null;
  if (!birthDate) return null;

  const age = getPersonAge(birthDate, activityStartDate);
  if (age === null) return null;

  if (group.minAge !== null && age < group.minAge) {
    return `La persona seleccionada tiene ${age} año${age === 1 ? '' : 's'} y este grupo requiere al menos ${group.minAge}.`;
  }

  if (group.maxAge !== null && age > group.maxAge) {
    return `La persona seleccionada tiene ${age} año${age === 1 ? '' : 's'} y este grupo admite hasta ${group.maxAge}.`;
  }

  return null;
}

export default function JoinEnrollmentPanel({
  activity,
  groups,
  sessions,
  isFull,
  hasCapacity,
  remainingSpots,
  userBirthDate,
  userPhone,
  selfMissingFields,
  activityStartDate,
}: {
  activity: {
    id: string;
    name: string;
    price: number;
    activityType: 'ANNUAL' | 'TEMPORARY';
  };
  groups: Group[];
  sessions: Session[];
  isFull: boolean;
  hasCapacity: boolean;
  remainingSpots: number | null;
  userBirthDate?: string | null;
  userPhone?: string | null;
  selfMissingFields?: string[];
  activityStartDate?: string | null;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const isMember = (session?.user as any)?.role === 'MEMBER';
  const userId = (session?.user as any)?.id as string | undefined;

  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedActivityDayId, setSelectedActivityDayId] = useState('');
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [childModalId, setChildModalId] = useState<string | null>(null);

  useEffect(() => {
    if (session && isMember) {
      fetch('/api/children')
        .then((res) => res.json())
        .then((data: any[]) =>
          setChildren(
            data.map((c) => ({
              id: c.id,
              name: c.name,
              lastName: c.lastName ?? null,
              documentNumber: c.documentNumber ?? null,
              birthDate: c.birthDate
                ? new Date(c.birthDate).toISOString()
                : null,
              address: c.address ?? null,
            }))
          )
        );
    }
  }, [session, isMember]);

  const people = useMemo(() => {
    if (!session) return [];
    return [
      {
        id: 'self',
        label: 'Para mí',
        birthDate: userBirthDate ?? null,
        photoUrl: userId ? `/api/users/${userId}/photo` : '',
      },
      ...children.map((c) => ({
        id: c.id,
        label: [c.name, c.lastName].filter(Boolean).join(' '),
        birthDate: c.birthDate,
        photoUrl: `/api/children/${c.id}/photo`,
      })),
    ];
  }, [session, children, userBirthDate, userId]);

  const effectivePersonId =
    people.length === 1 ? people[0].id : selectedPersonId;
  const selectedPerson = people.find((p) => p.id === effectivePersonId) ?? null;
  const selectedPersonAge = useMemo(
    () => getPersonAge(selectedPerson?.birthDate ?? null, activityStartDate),
    [selectedPerson?.birthDate, activityStartDate]
  );
  const eligibleGroups = useMemo(
    () =>
      groups.filter((group) => isGroupEligibleForAge(group, selectedPersonAge)),
    [groups, selectedPersonAge]
  );
  const eligibleGroupIds = useMemo(
    () => new Set(eligibleGroups.map((group) => group.id)),
    [eligibleGroups]
  );
  const eligibleSessions = useMemo(() => {
    if (activity.activityType === 'TEMPORARY') {
      return sessions.filter(
        (activitySession) =>
          !activitySession.activityGroupId ||
          eligibleGroupIds.has(activitySession.activityGroupId)
      );
    }

    return sessions.filter(
      (activitySession) =>
        activitySession.activityGroupId &&
        eligibleGroupIds.has(activitySession.activityGroupId)
    );
  }, [activity.activityType, sessions, eligibleGroupIds]);
  const selectedActivityDay =
    sessions.find(
      (activitySession) => activitySession.id === selectedActivityDayId
    ) ?? null;
  const effectiveGroupId =
    activity.activityType === 'TEMPORARY'
      ? (selectedActivityDay?.activityGroupId ?? selectedGroupId)
      : selectedGroupId;
  const selectedGroup = groups.find((g) => g.id === effectiveGroupId);

  const childMissingFields = useMemo(() => {
    if (!effectivePersonId || effectivePersonId === 'self') return [];
    const child = children.find((c) => c.id === effectivePersonId);
    if (!child) return [];
    return getMissingChildFields(child);
  }, [effectivePersonId, children]);

  const missingFields = useMemo(() => {
    if (!effectivePersonId) return [];
    if (effectivePersonId === 'self') return selfMissingFields ?? [];
    const parentMissingFields = !userPhone?.trim() ? ['tu teléfono'] : [];
    return [...childMissingFields, ...parentMissingFields];
  }, [effectivePersonId, selfMissingFields, childMissingFields, userPhone]);

  const selectedChild =
    effectivePersonId && effectivePersonId !== 'self'
      ? (children.find((c) => c.id === effectivePersonId) ?? null)
      : null;
  const modalChild = childModalId
    ? (children.find((c) => c.id === childModalId) ?? null)
    : null;

  useEffect(() => {
    if (selectedGroupId && !eligibleGroupIds.has(selectedGroupId)) {
      setSelectedGroupId('');
      setSelectedActivityDayId('');
    }
  }, [selectedGroupId, eligibleGroupIds]);

  useEffect(() => {
    if (
      selectedActivityDayId &&
      !eligibleSessions.some(
        (activitySession) => activitySession.id === selectedActivityDayId
      )
    ) {
      setSelectedActivityDayId('');
    }
  }, [eligibleSessions, selectedActivityDayId]);

  const groupAgeError = useMemo(
    () =>
      getGroupAgeError(
        selectedGroup,
        selectedPerson?.birthDate ?? null,
        activityStartDate
      ),
    [selectedGroup, selectedPerson?.birthDate, activityStartDate]
  );

  const profileIncomplete = missingFields.length > 0;
  const needsPersonSelection = Boolean(
    session && people.length > 1 && !selectedPersonId
  );
  const needsSessionSelection =
    activity.activityType === 'TEMPORARY' &&
    eligibleSessions.length > 0 &&
    !selectedActivityDayId;
  const needsGroupSelection =
    activity.activityType === 'ANNUAL' &&
    eligibleGroups.length > 0 &&
    !selectedGroupId;
  const hasNoEligibleGroups = groups.length > 0 && eligibleGroups.length === 0;
  const canRegister =
    !isFull &&
    !needsPersonSelection &&
    !needsSessionSelection &&
    !needsGroupSelection &&
    !hasNoEligibleGroups &&
    !profileIncomplete &&
    !groupAgeError;

  const joinReturnTo = `/activities/join/${activity.id}`;
  const missingProfileTargets = useMemo(() => {
    if (!session) return [];

    const targets: Array<{ key: string; label: string; href: string }> = [];
    if ((selfMissingFields?.length ?? 0) > 0) {
      targets.push({
        key: 'self',
        label: 'tu perfil',
        href: `/profile?returnTo=${encodeURIComponent(joinReturnTo)}&onboarding=1`,
      });
    }

    for (const child of children) {
      if (getMissingChildFields(child).length === 0) continue;

      targets.push({
        key: child.id,
        label: `${child.name}${child.lastName ? ` ${child.lastName}` : ''}`,
        href: `/profile/children/${child.id}/edit?returnTo=${encodeURIComponent(joinReturnTo)}`,
      });
    }

    return targets;
  }, [session, selfMissingFields, children, joinReturnTo]);
  const firstMissingProfileTarget = missingProfileTargets[0] ?? null;

  const handleChildSaved = (updatedChild: Child) => {
    setChildren((currentChildren) =>
      currentChildren.map((child) =>
        child.id === updatedChild.id ? updatedChild : child
      )
    );
    setChildModalId(null);
  };

  const handleRegister = () => {
    if (!session) {
      router.push('/login');
      return;
    }
    if (!effectivePersonId) return;
    const personLabel = selectedPerson?.label ?? 'Para mí';
    const item: ActivityCartItem = {
      activityId: activity.id,
      activityName: activity.name,
      price: activity.price,
      target: effectivePersonId,
      targetLabel: personLabel,
      groupId: effectiveGroupId || undefined,
      groupName: selectedGroup?.name,
      activityDayId:
        activity.activityType === 'TEMPORARY'
          ? selectedActivityDayId || undefined
          : undefined,
      activityDayLabel:
        activity.activityType === 'TEMPORARY'
          ? formatSessionLabel(selectedActivityDay)
          : undefined,
    };
    const raw = window.localStorage.getItem(ACTIVITY_CART_STORAGE_KEY);
    const existing = raw ? (JSON.parse(raw) as ActivityCartItem[]) : [];
    const deduped = existing.filter(
      (entry) =>
        !(entry.activityId === item.activityId && entry.target === item.target)
    );
    window.localStorage.setItem(
      ACTIVITY_CART_STORAGE_KEY,
      JSON.stringify([...deduped, item])
    );
    router.push('/activities/cart');
  };

  return (
    <div className="space-y-4 lg:grid lg:grid-cols-[1fr_auto] lg:items-start lg:gap-8">
      {modalChild && (
        <ChildProfileModal
          child={modalChild}
          missingFields={getMissingChildFields(modalChild)}
          onClose={() => setChildModalId(null)}
          onSaved={handleChildSaved}
        />
      )}
      {firstMissingProfileTarget && (
        <div className="sticky top-20 z-30 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm lg:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="font-semibold">Hay datos pendientes</p>
              <p>
                Para completar inscripciones, actualizá los datos obligatorios
                de{' '}
                {missingProfileTargets.map((target) => target.label).join(', ')}
                .
              </p>
            </div>
            <Link
              href={firstMissingProfileTarget.href}
              prefetch={true}
              className="inline-flex h-9 shrink-0 items-center justify-center rounded-full bg-amber-700 px-4 text-xs font-semibold text-white transition-colors hover:bg-amber-800"
            >
              Completar datos
            </Link>
          </div>
        </div>
      )}

      {session && people.length > 1 && (
        <div className="rounded-xl border bg-card p-5 lg:col-start-1">
          <PersonPicker
            people={people}
            value={selectedPersonId}
            onChange={setSelectedPersonId}
          />
        </div>
      )}

      {(groups.length > 0 ||
        (activity.activityType === 'TEMPORARY' && sessions.length > 0)) && (
        <div className="lg:col-span-2">
          <GroupScheduleCalendar
            activityType={activity.activityType}
            groups={eligibleGroups}
            sessions={eligibleSessions}
            selectedGroupId={selectedGroupId}
            selectedSessionId={selectedActivityDayId}
            onGroupChange={setSelectedGroupId}
            onSessionChange={setSelectedActivityDayId}
            selectedPersonBirthDate={selectedPerson?.birthDate}
            selectedPersonAge={selectedPersonAge}
            isPersonSelected={Boolean(effectivePersonId)}
            activityStartDate={activityStartDate}
          />
        </div>
      )}

      <div className="space-y-4 rounded-xl border bg-card p-5 sm:w-64 lg:col-start-2 lg:sticky lg:top-6">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-body">
            Inscripción
          </p>
          <p className="font-heading text-2xl font-semibold">
            {formatAmount(activity.price)}
          </p>
          {hasCapacity && (
            <p
              className={`text-xs font-body ${isFull ? 'text-destructive' : 'text-muted-foreground'}`}
            >
              {isFull
                ? 'Cupo completo'
                : `${remainingSpots} lugares disponibles`}
            </p>
          )}
        </div>

        {session && people.length === 1 && (
          <div className="flex items-center gap-3">
            <Avatar src={people[0].photoUrl} name={people[0].label} />
            <p className="text-sm font-medium">{people[0].label}</p>
          </div>
        )}

        {isFull ? (
          <div className="rounded-md border border-dashed border-border px-4 py-3 text-sm text-muted-foreground font-body">
            No hay cupos disponibles en este momento.
          </div>
        ) : needsPersonSelection ? (
          <div className="rounded-md border border-dashed border-border px-4 py-3 text-sm text-muted-foreground font-body">
            Seleccioná para quién es la actividad.
          </div>
        ) : needsSessionSelection ? (
          <div className="rounded-md border border-dashed border-border px-4 py-3 text-sm text-muted-foreground font-body">
            Seleccioná una sesión en el calendario para continuar.
          </div>
        ) : needsGroupSelection ? (
          <div className="rounded-md border border-dashed border-border px-4 py-3 text-sm text-muted-foreground font-body">
            Seleccioná un grupo en el calendario para continuar.
          </div>
        ) : hasNoEligibleGroups ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 font-body space-y-2">
            <p className="font-medium">
              No hay grupos disponibles para esta edad
            </p>
            <p>
              Seleccioná otra persona del grupo familiar o consultá con
              administración.
            </p>
          </div>
        ) : profileIncomplete ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 font-body space-y-2">
            <p className="font-medium">Hay datos pendientes</p>
            <p>Faltan: {missingFields.join(', ')}.</p>
            {effectivePersonId === 'self' ? (
              <Link
                href={`/profile?returnTo=${encodeURIComponent(joinReturnTo)}&onboarding=1`}
                prefetch={true}
                className="underline underline-offset-4 hover:text-amber-900"
              >
                Ir a mi perfil
              </Link>
            ) : (
              <div className="space-y-2">
                {childMissingFields.length > 0 && selectedChild && (
                  <button
                    type="button"
                    onClick={() => setChildModalId(selectedChild.id)}
                    className="underline underline-offset-4 hover:text-amber-900"
                  >
                    Completar datos del menor
                  </button>
                )}
                {!userPhone?.trim() && (
                  <div>
                    <Link
                      href={`/profile?returnTo=${encodeURIComponent(joinReturnTo)}&onboarding=1`}
                      prefetch={true}
                      className="underline underline-offset-4 hover:text-amber-900"
                    >
                      Completar mi teléfono
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : groupAgeError ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 font-body space-y-2">
            <p className="font-medium">La edad no coincide con el grupo</p>
            <p>{groupAgeError}</p>
          </div>
        ) : (
          <RegisterButton onClick={handleRegister} disabled={!canRegister} />
        )}
      </div>
    </div>
  );
}
