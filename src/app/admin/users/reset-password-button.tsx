'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function ResetPasswordButton({ id }: { id: string }) {
  const router = useRouter();

  async function reset() {
    const res = await fetch(`/api/users/${id}/reset-password`, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      alert(`New password: ${data.password}`);
      router.refresh();
    }
  }

  return (
    <Button onClick={reset} className="bg-yellow-600 hover:bg-yellow-700">
      Reset password
    </Button>
  );
}
