'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

type ProfessorInvoice = {
  id: string;
  originalName: string;
  contentType: string;
  size: number;
  createdAt: string;
  fileUrl: string;
};

type Props = {
  professorId: string;
  initialInvoices: ProfessorInvoice[];
  canUpload?: boolean;
  canDelete?: boolean;
  title?: string;
  description?: string;
  emptyMessage?: string;
};

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ProfessorInvoicesPanel({
  professorId,
  initialInvoices,
  canUpload = false,
  canDelete = false,
  title = 'Mis facturas',
  description = 'Subí tus facturas en PDF o imagen para que contaduría las revise.',
  emptyMessage = 'Todavía no hay facturas cargadas.',
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [invoices, setInvoices] = useState(initialInvoices);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deletingId, setDeletingId] = useState('');

  const uploadFile = async (file: File) => {
    setError('');
    setSuccess('');

    if (file.size > 10 * 1024 * 1024) {
      setError('La factura debe pesar menos de 10 MB.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);

    try {
      const res = await fetch(`/api/professors/${professorId}/invoices`, {
        method: 'POST',
        body: formData,
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error ?? 'No se pudo subir la factura');
      }
      setInvoices((prev) => [body.invoice as ProfessorInvoice, ...prev]);
      setSuccess('Factura subida correctamente.');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir factura');
    } finally {
      setUploading(false);
    }
  };

  const deleteInvoice = async (invoiceId: string) => {
    setError('');
    setSuccess('');
    setDeletingId(invoiceId);

    try {
      const res = await fetch(`/api/professor-invoices/${invoiceId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('No se pudo eliminar la factura');
      setInvoices((prev) => prev.filter((invoice) => invoice.id !== invoiceId));
      setSuccess('Factura eliminada correctamente.');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al eliminar factura'
      );
    } finally {
      setDeletingId('');
    }
  };

  return (
    <section className="rounded-xl border p-6 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{title}</h2>
            <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              Facturas
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {canUpload && (
          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="shrink-0"
          >
            {uploading ? 'Subiendo...' : 'Subir factura'}
          </Button>
        )}
      </div>

      {canUpload && (
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadFile(file);
          }}
        />
      )}

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </div>
      )}

      {invoices.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Archivo</th>
                <th className="px-4 py-3 text-left">Tipo</th>
                <th className="px-4 py-3 text-left">Tamaño</th>
                <th className="px-4 py-3 text-left">Cargada</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {invoices.map((invoice) => (
                <tr
                  key={invoice.id}
                  className="hover:bg-muted/20 transition-colors"
                >
                  <td className="px-4 py-3 font-medium max-w-[260px] truncate">
                    {invoice.originalName}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {invoice.contentType === 'application/pdf'
                      ? 'PDF'
                      : 'Imagen'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {formatFileSize(invoice.size)}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(invoice.createdAt).toLocaleDateString('es-AR')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        asChild
                        variant="outline"
                        className="px-3 py-1 text-xs"
                      >
                        <a
                          href={invoice.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Ver
                        </a>
                      </Button>
                      {canDelete && (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={deletingId === invoice.id}
                          onClick={() => deleteInvoice(invoice.id)}
                          className="text-rose-600 border-rose-200 hover:bg-rose-50 px-3 py-1 text-xs"
                        >
                          {deletingId === invoice.id
                            ? 'Eliminando...'
                            : 'Eliminar'}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canUpload && (
        <p className="text-xs text-muted-foreground">
          Formatos permitidos: PDF, JPG, PNG o WebP. Tamaño máximo: 10 MB.
        </p>
      )}
    </section>
  );
}
