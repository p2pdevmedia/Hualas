'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function PaymentHandler({ activityId }: { activityId: string }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const status = searchParams.get('status');
    const paymentId = searchParams.get('payment_id');
    const childId = searchParams.get('childId');

    if (status === 'approved' && paymentId) {
      fetch(`/api/activities/${activityId}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, childId }),
      });
    }
  }, [searchParams, activityId]);

  return null;
}
