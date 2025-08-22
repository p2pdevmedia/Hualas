'use client';

import RegisterButton from '@/components/register-button';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ActivityRegisterButton({
  activityId,
}: {
  activityId: string;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [children, setChildren] = useState<Array<{ id: string; name: string }>>(
    []
  );
  const [target, setTarget] = useState('self');

  useEffect(() => {
    if (session) {
      fetch('/api/children')
        .then((res) => res.json())
        .then((data) => setChildren(data));
    }
  }, [session]);

  const handleClick = () => {
    if (!session) {
      router.push('/login');
      return;
    }
    const qs = target !== 'self' ? `?childId=${target}` : '';
    window.location.href = `/api/activities/${activityId}/checkout${qs}`;
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
