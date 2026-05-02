'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface DeleteChildButtonProps {
  userId: string;
  childId: string;
  childName: string;
}

export default function DeleteChildButton({
  userId,
  childId,
  childName,
}: DeleteChildButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const confirmed = confirm(
      `¿Borrar a ${childName}? Esta acción elimina también sus inscripciones y registros asociados.`
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/users/${userId}/children/${childId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'No se pudo borrar el hijo');
      }

      toast({
        title: 'Hijo borrado',
        description: `${childName} fue eliminado correctamente.`,
      });
      router.refresh();
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'No se pudo borrar el hijo',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="destructive"
      onClick={handleDelete}
      disabled={loading}
      className="h-9 px-4"
    >
      {loading ? 'Borrando...' : 'Borrar'}
    </Button>
  );
}
