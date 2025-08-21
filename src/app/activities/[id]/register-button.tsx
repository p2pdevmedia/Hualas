'use client';

import { Button } from '@/components/ui/button';

export default function RegisterButton({ activityId }: { activityId: string }) {
  const handleClick = () => {
    window.location.href = `/api/activities/${activityId}/checkout`;
  };
  return <Button onClick={handleClick}>Inscribirse</Button>;
}
