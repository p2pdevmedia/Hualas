'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Filter, PencilLine, ReceiptText, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  formatAccountingDate,
  formatAmount,
  movementTypeClass,
  movementTypeLabel,
} from '@/lib/accounting';

type Movement = {
  id: string;
  date: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  description: string;
  receiptNumber: string | null;
  receiptImage: string | null;
  createdBy: string;
};

export default function MovementsTable({
  movements,
  initialFilters,
}: {
  movements: Movement[];
  initialFilters: { type: string; from: string; to: string };
}) {
  const router = useRouter();
  const [type, setType] = useState(initialFilters.type);
  const [from, setFrom] = useState(initialFilters.from);
  const [to, setTo] = useState(initialFilters.to);
  const [deletingId, setDeletingId] = useState('');

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
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
          <div className="grid flex-1 gap-3 sm:grid-cols-3">
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
                    {movement.receiptImage ? (
                      <a
                        href={movement.receiptImage}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <ReceiptText className="h-4 w-4" />
                        Abrir
                      </a>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{movement.createdBy}</td>
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
                        onClick={() => deleteMovement(movement.id)}
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
    </div>
  );
}
