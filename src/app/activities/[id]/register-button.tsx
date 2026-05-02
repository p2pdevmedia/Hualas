'use client';

import RegisterButton from '@/components/register-button';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ACTIVITY_CART_STORAGE_KEY, ActivityCartItem } from '@/lib/cart';

export default function ActivityRegisterButton({
  activityId,
  activityName,
  activityPrice,
}: {
  activityId: string;
  activityName: string;
  activityPrice: number;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [children, setChildren] = useState<Array<{ id: string; name: string }>>(
    []
  );
  const [target, setTarget] = useState('self');

  useEffect(() => {
    if (session)
      fetch('/api/children')
        .then((res) => res.json())
        .then((data) => setChildren(data));
  }, [session]);

  const handleClick = () => {
    if (!session) {
      router.push('/login');
      return;
    }
    const targetLabel =
      target === 'self'
        ? 'Para mí'
        : (children.find((c) => c.id === target)?.name ?? 'Menor');
    const item: ActivityCartItem = {
      activityId,
      activityName,
      price: activityPrice,
      target,
      targetLabel,
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
    <div className="space-y-2">
      {session && (
        <select
          className="border px-2 py-1"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        >
          <option value="self">Para mí</option>
          {children.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}
      <RegisterButton onClick={handleClick} />
    </div>
  );
}
