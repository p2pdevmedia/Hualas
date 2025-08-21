'use client';

import RegisterButton from '@/components/register-button';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function ActivityRegisterButton({
  activityId,
}: {
  activityId: string;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const handleClick = () => {
    if (!session) {
      router.push('/login');
      return;
    }
    window.location.href = `/api/activities/${activityId}/checkout`;
  };
  return <RegisterButton onClick={handleClick} />;
}
