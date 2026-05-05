'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ACTIVITY_CART_STORAGE_KEY, ActivityCartItem } from '@/lib/cart';
import RegisterButton from '@/components/register-button';
import GroupScheduleCalendar from './group-schedule-calendar';
import PersonPicker, { Avatar } from './person-picker';

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

function getMissingChildFields(
  child: Child,
  parentPhone: string | null
): string[] {
  const missing: string[] = [];
  if (!child.name?.trim()) missing.push('nombre del menor');
  if (!child.lastName?.trim()) missing.push('apellido del menor');
  if (!child.documentNumber?.trim()) missing.push('DNI del menor');
  if (!child.birthDate) missing.push('fecha de nacimiento del menor');
  if (!child.address?.trim()) missing.push('dirección del menor');
  if (!parentPhone?.trim()) missing.push('tu teléfono');
  return missing;
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

function getGroupAgeError(
  group: Group | undefined,
  birthDate: string | null | undefined,
  activityStartDate?: string | null
) {
  if (!group || (group.minAge === null && group.maxAge === null)) return null;
  if (!birthDate) return null;

  const parsedBirthDate = new Date(birthDate);
  if (Number.isNaN(parsedBirthDate.getTime())) return null;

  const today = new Date();
  const parsedActivityDate = activityStartDate
    ? new Date(activityStartDate)
    : null;
  const referenceDate =
    parsedActivityDate &&
    !Number.isNaN(parsedActivityDate.getTime()) &&
    parsedActivityDate > today
      ? parsedActivityDate
      : today;
  const age = calculateAge(parsedBirthDate, referenceDate);

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
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState('');

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
  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  const missingFields = useMemo(() => {
    if (!effectivePersonId) return [];
    if (effectivePersonId === 'self') return selfMissingFields ?? [];
    const child = children.find((c) => c.id === effectivePersonId);
    if (!child) return [];
    return getMissingChildFields(child, userPhone ?? null);
  }, [effectivePersonId, selfMissingFields, children, userPhone]);

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
  const needsGroupSelection = groups.length > 0 && !selectedGroupId;
  const canRegister =
    !isFull &&
    !needsPersonSelection &&
    !needsGroupSelection &&
    !profileIncomplete &&
    !groupAgeError;

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
      groupId: selectedGroupId || undefined,
      groupName: selectedGroup?.name,
    };
    const raw = window.localStorage.getItem(ACTIVITY_CART_STORAGE_KEY);
    const existing = raw ? (JSON.parse(raw) as ActivityCartItem[]) : [];
    const deduped = existing.filter(
      (entry) =>
        !(
          entry.activityId === item.activityId &&
          entry.target === item.target &&
          (entry.groupId ?? '') === (item.groupId ?? '')
        )
    );
    window.localStorage.setItem(
      ACTIVITY_CART_STORAGE_KEY,
      JSON.stringify([...deduped, item])
    );
    router.push('/activities/cart');
  };

  return (
    <div className="space-y-4 lg:grid lg:grid-cols-[1fr_auto] lg:items-start lg:gap-8">
      {groups.length > 0 && (
        <div className="lg:col-span-2">
          <GroupScheduleCalendar
            activityType={activity.activityType}
            groups={groups}
            sessions={sessions}
            selectedGroupId={selectedGroupId}
            onGroupChange={setSelectedGroupId}
            selectedPersonBirthDate={selectedPerson?.birthDate}
            activityStartDate={activityStartDate}
          />
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

      <div className="space-y-4 rounded-xl border bg-card p-5 sm:w-64 lg:col-start-2 lg:sticky lg:top-6">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-body">
            Inscripción
          </p>
          <p className="font-heading text-2xl font-semibold">
            ${activity.price}
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
        ) : needsGroupSelection ? (
          <div className="rounded-md border border-dashed border-border px-4 py-3 text-sm text-muted-foreground font-body">
            Seleccioná un grupo en el calendario para continuar.
          </div>
        ) : profileIncomplete ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 font-body space-y-2">
            <p className="font-medium">Completá el perfil para inscribirte</p>
            <p>Faltan: {missingFields.join(', ')}.</p>
            {effectivePersonId === 'self' ? (
              <Link
                href="/profile"
                prefetch={true}
                className="underline underline-offset-4 hover:text-amber-900"
              >
                Ir a mi perfil
              </Link>
            ) : (
              <Link
                href="/profile"
                prefetch={true}
                className="underline underline-offset-4 hover:text-amber-900"
              >
                Completar datos del menor
              </Link>
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
