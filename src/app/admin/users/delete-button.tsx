'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/components/language-provider';

export default function DeleteUserButton({ id }: { id: string }) {
  const router = useRouter();
  const t = useTranslation().actions;

  async function remove() {
    await fetch(`/api/users/${id}`, { method: 'DELETE' });
    router.refresh();
  }

  return (
    <Button onClick={remove} className="bg-red-600 hover:bg-red-700">
      {t.delete}
    </Button>
  );
}
