'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/components/language-provider';

interface Form {
  id: string;
  title: string;
  responseCount: number;
}

export default function FormList({ forms }: { forms: Form[] }) {
  const router = useRouter();
  const t = useTranslation().actions;
  const [confirmDeleteId, setConfirmDeleteId] = useState<string>('');
  const [deleteError, setDeleteError] = useState('');
  const [deletingId, setDeletingId] = useState('');

  const handleDelete = async (id: string) => {
    setDeleteError('');
    setDeletingId(id);
    try {
      const res = await fetch(`/api/forms/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error ?? 'No se pudo eliminar el formulario');
      }
      router.refresh();
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : 'No se pudo eliminar el formulario'
      );
    } finally {
      setDeletingId('');
      setConfirmDeleteId('');
    }
  };

  const linkClass =
    'text-sm text-link hover:text-link/80 hover:underline underline-offset-4';

  if (forms.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay formularios creados.
      </p>
    );
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">
              Título
            </th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">
              Respuestas
            </th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {forms.map((f) => (
            <tr key={f.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 font-medium">{f.title}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {f.responseCount}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <Link href={`/admin/forms/${f.id}`} className={linkClass}>
                    {t.view}
                  </Link>
                  <Link
                    href={`/admin/forms/${f.id}/edit`}
                    className={linkClass}
                  >
                    {t.edit}
                  </Link>
                  <Link
                    href={`/forms/${f.id}`}
                    className={linkClass}
                    target="_blank"
                  >
                    Público
                  </Link>
                  <button
                    onClick={() => setConfirmDeleteId(f.id)}
                    className="text-sm text-destructive hover:text-destructive/80"
                  >
                    {t.delete}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-lg max-w-sm w-full p-6">
            <h2 className="text-lg font-semibold mb-2">Eliminar formulario</h2>
            <p className="text-muted-foreground mb-6">
              ¿Estás seguro de que querés eliminar este formulario? Esta acción
              no se puede deshacer.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDeleteId('')}
                disabled={deletingId === confirmDeleteId}
                className="px-4 py-2 rounded-full border border-border hover:bg-muted transition-colors text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const id = confirmDeleteId;
                  handleDelete(id);
                }}
                disabled={deletingId === confirmDeleteId}
                className="px-4 py-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors text-sm font-medium"
              >
                {deletingId === confirmDeleteId ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
      {deleteError && (
        <p className="mt-4 text-sm text-destructive">{deleteError}</p>
      )}
    </div>
  );
}
