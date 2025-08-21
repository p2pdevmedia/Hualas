'use client';

import RegisterButton from '@/components/register-button';

export default function ActivityRegisterButton({
  activityId,
}: {
  activityId: string;
}) {
  const handleClick = () => {
    window.location.href = `/api/activities/${activityId}/checkout`;
  };
  return <RegisterButton onClick={handleClick} />;
}
