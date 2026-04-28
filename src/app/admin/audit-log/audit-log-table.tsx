'use client';

import { Fragment, useEffect, useState } from 'react';

interface AuditLog {
  id: string;
  model: string;
  action: string;
  recordId: string | null;
  userId: string | null;
  before: unknown;
  after: unknown;
  args: unknown;
  createdAt: string;
}

interface ApiResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function getStringField(
  record: Record<string, unknown> | null,
  keys: string[]
): string | null {
  if (!record) return null;

  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function buildHumanSummary(log: AuditLog) {
  const after = asRecord(log.after);
  const before = asRecord(log.before);
  const args = asRecord(log.args);
  const actor = log.userId ?? 'Sistema';

  if (log.model === 'User' && log.action === 'create') {
    const userLabel =
      getStringField(after, ['name', 'fullName']) ??
      getStringField(after, ['email']) ??
      log.recordId ??
      'Sin nombre';

    return `Nuevo usuario creado: ${userLabel}. Creado por: ${actor}.`;
  }

  if (log.model === 'Message' && log.action === 'create') {
    const fromUser =
      getStringField(after, ['senderId', 'authorId', 'fromUserId']) ??
      actor;
    const toUser =
      getStringField(after, ['receiverId', 'toUserId']) ??
      getStringField(args ? asRecord(args.data) : null, ['receiverId']) ??
      getStringField(args ? asRecord(args.where) : null, ['id']) ??
      'destinatario';
    const text = getStringField(after, ['text', 'content', 'message']) ?? '—';

    return `Mensaje enviado de ${fromUser} a ${toUser}: ${text}`;
  }

  if (log.model === 'Activity' && log.action === 'create') {
    const activityName =
      getStringField(after, ['name', 'title']) ?? log.recordId ?? 'Sin nombre';

    return `Actividad creada: ${activityName}. Creada por: ${actor}.`;
  }

  if (log.action === 'update') {
    return `${log.model} actualizado (ID: ${log.recordId ?? '—'}) por ${actor}.`;
  }

  if (log.action === 'delete') {
    return `${log.model} eliminado (ID: ${log.recordId ?? '—'}) por ${actor}.`;
  }

  if (log.action === 'create') {
    return `${log.model} creado (ID: ${log.recordId ?? '—'}) por ${actor}.`;
  }

  return `${log.model} ${log.action} (ID: ${log.recordId ?? '—'}) por ${actor}.`;
}

export default function AuditLogTable() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [page, setPage] = useState(1);
  const [model, setModel] = useState('');
  const [action, setAction] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (model) params.set('model', model);
    if (action) params.set('action', action);

    fetch(`/api/admin/audit-log?${params}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [page, model, action]);

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Filtrar por modelo"
          value={model}
          onChange={(e) => {
            setModel(e.target.value);
            setPage(1);
          }}
          className="rounded-md border px-3 py-1.5 text-sm"
        />
        <input
          type="text"
          placeholder="Filtrar por acción"
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
          className="rounded-md border px-3 py-1.5 text-sm"
        />
      </div>

      {loading && <p className="text-sm text-muted-foreground">Cargando...</p>}
      {!loading && data && data.logs.length === 0 && (
        <p className="text-sm text-muted-foreground">No hay registros.</p>
      )}
      {!loading && data && data.logs.length > 0 && (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left">
              <tr>
                <th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2">Resumen</th>
                <th className="px-4 py-2">Modelo</th>
                <th className="px-4 py-2">Acción</th>
                <th className="px-4 py-2">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {data.logs.map((log) => (
                <Fragment key={log.id}>
                  <tr
                    className="cursor-pointer border-t hover:bg-muted/50"
                    onClick={() =>
                      setExpanded(expanded === log.id ? null : log.id)
                    }
                  >
                    <td className="whitespace-nowrap px-4 py-2 text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString('es-AR')}
                    </td>
                    <td className="px-4 py-2">{buildHumanSummary(log)}</td>
                    <td className="px-4 py-2 font-mono">{log.model}</td>
                    <td className="px-4 py-2 font-mono">{log.action}</td>
                    <td className="px-4 py-2 text-xs text-blue-600 underline">
                      {expanded === log.id ? 'Ocultar info completa' : 'Ver info completa'}
                    </td>
                  </tr>
                  {expanded === log.id && (
                    <tr className="bg-muted/30">
                      <td colSpan={5} className="px-4 py-3">
                        <div className="mb-3 grid grid-cols-1 gap-2 text-xs md:grid-cols-3">
                          <p>
                            <span className="font-semibold">Record ID:</span>{' '}
                            <span className="font-mono">{log.recordId ?? '—'}</span>
                          </p>
                          <p>
                            <span className="font-semibold">User ID:</span>{' '}
                            <span className="font-mono">{log.userId ?? '—'}</span>
                          </p>
                          <p>
                            <span className="font-semibold">Fecha:</span>{' '}
                            {new Date(log.createdAt).toLocaleString('es-AR')}
                          </p>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                          <div>
                            <p className="mb-1 text-xs font-semibold text-muted-foreground">
                              Antes
                            </p>
                            <pre className="max-h-60 overflow-x-auto rounded-md bg-muted p-2 text-xs">
                              {log.before != null
                                ? JSON.stringify(log.before, null, 2)
                                : '—'}
                            </pre>
                          </div>
                          <div>
                            <p className="mb-1 text-xs font-semibold text-muted-foreground">
                              Después
                            </p>
                            <pre className="max-h-60 overflow-x-auto rounded-md bg-muted p-2 text-xs">
                              {log.after != null
                                ? JSON.stringify(log.after, null, 2)
                                : '—'}
                            </pre>
                          </div>
                          <div>
                            <p className="mb-1 text-xs font-semibold text-muted-foreground">
                              Args de operación
                            </p>
                            <pre className="max-h-60 overflow-x-auto rounded-md bg-muted p-2 text-xs">
                              {log.args != null
                                ? JSON.stringify(log.args, null, 2)
                                : '—'}
                            </pre>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && totalPages > 1 && (
        <div className="flex items-center gap-3 text-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-md border px-3 py-1.5 disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-muted-foreground">
            Página {page} de {totalPages} ({data.total} registros)
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-md border px-3 py-1.5 disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
