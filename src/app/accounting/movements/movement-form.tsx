'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Upload, FileImage } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  MOVEMENT_CATEGORIES,
  formatAmount,
  movementTypeLabel,
} from '@/lib/accounting';

type MovementFormData = {
  id: string;
  date: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  description: string;
  receiptNumber: string | null;
  receiptImage: string | null;
  activityId: string | null;
};

type ActivityOption = {
  id: string;
  name: string;
};

export default function MovementForm({
  movement,
  activities,
}: {
  movement?: MovementFormData;
  activities: ActivityOption[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [date, setDate] = useState(movement?.date ?? '');
  const [amount, setAmount] = useState(
    movement ? (movement.amount / 100).toString() : ''
  );
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>(
    movement?.type ?? 'INCOME'
  );
  const [category, setCategory] = useState(movement?.category ?? '');
  const [description, setDescription] = useState(movement?.description ?? '');
  const [receiptNumber, setReceiptNumber] = useState(
    movement?.receiptNumber ?? ''
  );
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [activityId, setActivityId] = useState(movement?.activityId ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isEdit = Boolean(movement);
  const amountCents = useMemo(() => {
    const parsed = Number(amount);
    return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
  }, [amount]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSaving(true);

    try {
      const payload = {
        date,
        amount: amountCents,
        type,
        category,
        description,
        receiptNumber: receiptNumber.trim() || undefined,
        activityId: activityId || undefined,
      };

      const res = await fetch(
        isEdit
          ? `/api/accounting/movements/${movement!.id}`
          : '/api/accounting/movements',
        {
          method: isEdit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          body?.error?.formErrors?.[0]?.[0] ??
            body?.error ??
            'No se pudo guardar el movimiento'
        );
      }

      const savedId = body.id as string;
      if (receiptFile) {
        const formData = new FormData();
        formData.append('file', receiptFile);
        const uploadRes = await fetch(
          `/api/accounting/movements/${savedId}/receipt`,
          {
            method: 'POST',
            body: formData,
          }
        );
        if (!uploadRes.ok) {
          const uploadBody = await uploadRes.json().catch(() => null);
          throw new Error(uploadBody?.error ?? 'No se pudo subir el recibo');
        }
      }

      setSuccess('Movimiento guardado');
      router.push('/accounting/movements');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Fecha</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium">Tipo</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as 'INCOME' | 'EXPENSE')}
            className="w-full rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            required
          >
            <option value="INCOME">{movementTypeLabel('INCOME')}</option>
            <option value="EXPENSE">{movementTypeLabel('EXPENSE')}</option>
          </select>
        </label>
      </div>

      <label className="space-y-1 text-sm block">
        <span className="font-medium">Categoría</span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          required
        >
          <option value="">Seleccionar categoría</option>
          {MOVEMENT_CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-1 text-sm block">
        <span className="font-medium">Actividad</span>
        <select
          value={activityId}
          onChange={(e) => setActivityId(e.target.value)}
          className="w-full rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Sin actividad</option>
          {activities.map((activity) => (
            <option key={activity.id} value={activity.id}>
              {activity.name}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">
          Si seleccionás una actividad, el movimiento impacta su caja: suma en
          ingresos y descuenta en egresos.
        </span>
      </label>

      <label className="space-y-1 text-sm block">
        <span className="font-medium">Descripción</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-[110px] w-full rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          required
          maxLength={500}
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Monto en pesos</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
          <span className="text-xs text-muted-foreground">
            Se guardará como{' '}
            {amountCents > 0 ? formatAmount(amountCents) : '$0'}.
          </span>
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium">Número de recibo</span>
          <input
            type="text"
            value={receiptNumber}
            onChange={(e) => setReceiptNumber(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Opcional"
          />
        </label>
      </div>

      <div className="rounded-2xl border bg-muted/20 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Recibo adjunto</p>
            <p className="text-xs text-muted-foreground">
              Sube una imagen si necesitás guardar un comprobante.
            </p>
          </div>
          {movement?.receiptImage && (
            <a
              href={movement.receiptImage}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-link hover:underline"
            >
              Ver archivo actual
            </a>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            Seleccionar imagen
          </Button>
          {receiptFile ? (
            <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs">
              <FileImage className="h-4 w-4" />
              {receiptFile.name}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Sin archivo</span>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-success">{success}</p>}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isSaving}>
          {isSaving
            ? 'Guardando...'
            : isEdit
              ? 'Guardar cambios'
              : 'Crear movimiento'}
        </Button>
        <Button asChild variant="outline" type="button">
          <Link href="/accounting/movements">Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
