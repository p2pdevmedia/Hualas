'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface DeleteActivityButtonProps {
  activityId: string;
  activityName: string;
  hasParticipants: boolean;
}

export default function DeleteActivityButton({
  activityId,
  activityName,
  hasParticipants,
}: DeleteActivityButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (hasParticipants) {
    return null;
  }

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/activities/${activityId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Error al borrar la actividad');
        return;
      }

      router.refresh();
      setShowConfirm(false);
    } catch (error) {
      alert('Error al borrar la actividad');
    } finally {
      setIsDeleting(false);
    }
  };

  if (showConfirm) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-lg shadow-lg max-w-sm w-full p-6">
          <h2 className="text-lg font-semibold mb-2">Confirmar eliminación</h2>
          <p className="text-muted-foreground mb-6">
            ¿Estás seguro de que deseas borrar la actividad &quot;{activityName}
            &quot;? Esta acción no se puede deshacer.
          </p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setShowConfirm(false)}
              disabled={isDeleting}
              className="px-4 py-2 rounded-full border border-border hover:bg-muted transition-colors text-sm font-medium disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-4 py-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {isDeleting ? 'Borrando...' : 'Borrar'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="inline-flex items-center justify-center rounded-full border-[1.5px] border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
      title="Solo se puede borrar actividades sin inscritos"
    >
      <Trash2 className="h-4 w-4 mr-1.5" />
      Borrar
    </button>
  );
}
