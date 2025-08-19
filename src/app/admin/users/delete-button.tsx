'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function DeleteUserButton({ id }: { id: string }) {
  const router = useRouter();

  async function remove() {
    await fetch(`/api/users/${id}`, { method: 'DELETE' });
    router.refresh();
  }

  return (
    <Button onClick={remove} className="bg-red-600 hover:bg-red-700">
      Delete
    </Button>
  );
}
