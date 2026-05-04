'use client';

import RegisterButton from '@/components/register-button';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ACTIVITY_CART_STORAGE_KEY, ActivityCartItem } from '@/lib/cart';

type Person = { id: string; label: string };

export default function ActivityRegisterButton({
  activityId,
  activityName,
  activityPrice,
  groupId,
  groupName,
}: {
  activityId: string;
  activityName: string;
  activityPrice: number;
  groupId?: string;
  groupName?: string;
}) {
  const { data: session } = useSession();
  const isMember = session?.user?.role === 'MEMBER';
  const router = useRouter();
  const [children, setChildren] = useState<Array<{ id: string; name: string }>>(
    []
  );
  const [target, setTarget] = useState('');

  useEffect(() => {
    if (session && isMember)
      fetch('/api/children')
        .then((res) => res.json())
        .then((data) => setChildren(data));
  }, [session, isMember]);

  if (session && !isMember) return null;

  const people: Person[] = session
    ? [
        { id: 'self', label: 'Para mí' },
        ...children.map((c) => ({ id: c.id, label: c.name })),
      ]
    : [];
  const needsTargetSelection = Boolean(session && people.length > 1 && !target);

  const handleClick = () => {
    if (!session) {
      router.push('/login');
      return;
    }
    const effectiveTarget = people.length === 1 ? people[0].id : target;
    if (!effectiveTarget) return;
    const targetLabel =
      people.find((p) => p.id === effectiveTarget)?.label ?? 'Para mí';
    const item: ActivityCartItem = {
      activityId,
      activityName,
      price: activityPrice,
      target: effectiveTarget,
      targetLabel,
      groupId,
      groupName,
    };
    const raw = window.localStorage.getItem(ACTIVITY_CART_STORAGE_KEY);
    const existing = raw ? (JSON.parse(raw) as ActivityCartItem[]) : [];
    const deduped = existing.filter(
      (entry) =>
        !(entry.activityId === item.activityId && entry.target === item.target && (entry.groupId ?? '') === (item.groupId ?? ''))
    );
    window.localStorage.setItem(
      ACTIVITY_CART_STORAGE_KEY,
      JSON.stringify([...deduped, item])
    );
    router.push('/activities/cart');
  };

  return (
    <div
      className={`relative space-y-2 ${needsTargetSelection ? 'pt-10' : ''}`}
    >
      {needsTargetSelection && (
        <div
          role="status"
          aria-live="polite"
          className="absolute left-0 top-0 z-10 inline-flex max-w-full rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 shadow-md"
        >
          Seleccioná para quién es la actividad.
        </div>
      )}
      {session && people.length === 1 && (
        <p className="text-sm text-muted-foreground">{people[0].label}</p>
      )}
      {session && people.length > 1 && (
        <select
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        >
          <option value="" disabled>
            Seleccioná para quién
          </option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      )}
      <RegisterButton onClick={handleClick} disabled={needsTargetSelection} />
    </div>
  );
}
