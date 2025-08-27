'use client';

import RegisterButton from '@/components/register-button';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { initMercadoPago, Payment } from '@mercadopago/sdk-react';

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
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(0);

  useEffect(() => {
    if (session) {
      fetch('/api/children')
        .then((res) => res.json())
        .then((data) => setChildren(data));
    }
  }, [session]);

  useEffect(() => {
    initMercadoPago(process.env.NEXT_PUBLIC_MP_PUBLIC_KEY!);
  }, []);

  const handleClick = async () => {
    if (!session) {
      router.push('/login');
      return;
    }
    const qs = target !== 'self' ? `?childId=${target}` : '';
    const res = await fetch(`/api/activities/${activityId}/checkout${qs}`);
    const data = await res.json();
    setPreferenceId(data.preferenceId);
    setAmount(data.amount);
  };

  const onSubmit = ({ formData }: any) => {
    return new Promise((resolve, reject) => {
      fetch(`/api/activities/${activityId}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formData,
          childId: target !== 'self' ? target : undefined,
        }),
      })
        .then((res) => res.json())
        .then(() => resolve({}))
        .catch(reject);
    });
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
      {!preferenceId && <RegisterButton onClick={handleClick} />}
      {preferenceId && (
        <Payment
          initialization={{ amount, preferenceId }}
          customization={{
            paymentMethods: {
              ticket: 'all',
              creditCard: 'all',
              prepaidCard: 'all',
              debitCard: 'all',
              mercadoPago: 'all',
            },
          }}
          onReady={() => {}}
          onSubmit={onSubmit}
          onError={(error) => console.error(error)}
        />
      )}
    </div>
  );
}
