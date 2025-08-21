'use client';

import { Button } from '@/components/ui/button';

interface RegisterButtonProps {
  activityId: string;
}

export default function RegisterButton({ activityId }: RegisterButtonProps) {
  const handleClick = async () => {
    const res = await fetch(`/api/activities/${activityId}/register`, {
      method: 'POST',
    });
    if (res.ok) {
      const data = await res.json();
      if (data.init_point) {
        window.location.href = data.init_point as string;
      }
    }
  };

  return <Button onClick={handleClick}>Register</Button>;
}
