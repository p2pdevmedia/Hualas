'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Filter, PencilLine, ReceiptText, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  formatAccountingDate,
  formatAmount,
  getAccountingUserProfileHref,
  movementTypeClass,
  movementTypeLabel,
} from '@/lib/accounting';
import PersonLink from '@/components/accounting/person-link';

type Movement = {
  id: string;
  date: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  description: string;
  receiptNumber: string | null;
  receiptImage: string | null;
  receiptImageUrl: string | null;
  createdBy: {
    id: string;
    name: string;
  };
};

export default function MovementsTable({
  movements,
  initialFilters,
}: {
  movements: Movement[];
  initialFilters: { type: string; from: string; to: string; q: string };
}) {
  const router = useRouter();
  const [type, setType] = useState(initialFilters.type);
  const [from, setFrom] = useState(initialFilters.from);
  const [to, setTo] = useState(initialFilters.to);
  const [q, setQ] = useState(initialFilters.q);
  const [deletingId, setDeletingId] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState('');

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (q.trim()) params.set('q', q.trim());
    const query = params.toString();
    router.push(
      query ? `/accounting/movements?${query}` : '/accounting/movements'
    );
    router.refresh();
  };

  const clearFilters = () => {
    setType('');
    setFrom('');
    setTo('');
    setQ('');
    router.push('/accounting/movements');
    router.refresh();
  };

  const deleteMovement = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/accounting/movements/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('delete failed');
      router.refresh();
    } finally {
      setDeletingId('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="grid flex-1 gap-3 sm:grid-cols-4">
            <label className="space-y-1 text-sm">
              <span className="font-medium">Tipo</span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Todos</option>
                <option value="INCOME">Ingreso</option>
                <option value="EXPENSE">Egreso</option>
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">Desde</span>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">Hasta</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">Buscar</span>
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Nombre, apellido, actividad o mail"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </label>
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={applyFilters}>
              <Filter className="mr-2 h-4 w-4" />
              Filtrar
            </Button>
            <Button type="button" variant="outline" onClick={clearFilters}>
              Limpiar
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-card shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="border-b bg-muted/20 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Categoría</th>
              <th className="px-4 py-3 font-medium">Descripción</th>
              <th className="px-4 py-3 font-medium">Monto</th>
              <th className="px-4 py-3 font-medium">Recibo</th>
              <th className="px-4 py-3 font-medium">Creado por</th>
              <th className="px-4 py-3 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {movements.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  No hay movimientos con esos filtros.
                </td>
              </tr>
            ) : (
              movements.map((movement) => (
                <tr key={movement.id} className="align-top">
                  <td className="px-4 py-3">
                    {formatAccountingDate(movement.date)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${movementTypeClass(movement.type)}`}
                    >
                      {movementTypeLabel(movement.type)}
                    </span>
                  </td>
                  <td className="px-4 py-3">{movement.category}</td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">
                        {movement.description}
                      </p>
                      {movement.receiptNumber && (
                        <p className="text-xs text-muted-foreground">
                          Recibo: {movement.receiptNumber}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {formatAmount(movement.amount)}
                  </td>
                  <td className="px-4 py-3">
                    {movement.receiptImageUrl ? (
                      <a
                        href={movement.receiptImageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-link hover:underline"
                      >
                        <ReceiptText className="h-4 w-4" />
                        Abrir
                      </a>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <PersonLink
                      href={getAccountingUserProfileHref(movement.createdBy.id)}
                      className="text-link hover:underline"
                    >
                      {movement.createdBy.name}
                    </PersonLink>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button asChild variant="outline" className="px-3 py-2">
                        <Link
                          href={`/accounting/movements/${movement.id}/edit`}
                        >
                          <PencilLine className="mr-2 h-4 w-4" />
                          Editar
                        </Link>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="px-3 py-2 text-red-700 hover:bg-red-50 hover:text-red-800"
                        onClick={() => setConfirmDeleteId(movement.id)}
                        disabled={deletingId === movement.id}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {deletingId === movement.id
                          ? 'Eliminando...'
                          : 'Eliminar'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-lg max-w-sm w-full p-6">
            <h2 className="text-lg font-semibold mb-2">Eliminar movimiento</h2>
            <p className="text-muted-foreground mb-6">
              ¿Estás seguro de que querés eliminar este movimiento? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDeleteId('')}
                className="px-4 py-2 rounded-full border border-border hover:bg-muted transition-colors text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={() => { const id = confirmDeleteId; setConfirmDeleteId(''); deleteMovement(id); }}
                className="px-4 py-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
