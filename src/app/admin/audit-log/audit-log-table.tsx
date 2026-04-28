'use client';

import { useEffect, useState } from 'react';

interface AuditLog {
  id: string;
  model: string;
  action: string;
  recordId: string | null;
  userId: string | null;
  before: unknown;
  after: unknown;
  createdAt: string;
}

interface ApiResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
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
                <th className="px-4 py-2">Modelo</th>
                <th className="px-4 py-2">Acción</th>
                <th className="px-4 py-2">RecordId</th>
                <th className="px-4 py-2">UserId</th>
                <th className="px-4 py-2">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {data.logs.map((log) => (
                <>
                  <tr
                    key={log.id}
                    className="border-t hover:bg-muted/50 cursor-pointer"
                    onClick={() =>
                      setExpanded(expanded === log.id ? null : log.id)
                    }
                  >
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString('es-AR')}
                    </td>
                    <td className="px-4 py-2 font-mono">{log.model}</td>
                    <td className="px-4 py-2 font-mono">{log.action}</td>
                    <td className="px-4 py-2 font-mono text-xs">
                      {log.recordId ?? '—'}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">
                      {log.userId ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-xs text-blue-600 underline">
                      {expanded === log.id ? 'Cerrar' : 'Ver'}
                    </td>
                  </tr>
                  {expanded === log.id && (
                    <tr key={`${log.id}-detail`} className="bg-muted/30">
                      <td colSpan={6} className="px-4 py-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-semibold mb-1 text-muted-foreground">
                              Antes
                            </p>
                            <pre className="overflow-x-auto text-xs bg-muted p-2 rounded-md max-h-60">
                              {log.before != null
                                ? JSON.stringify(log.before, null, 2)
                                : '—'}
                            </pre>
                          </div>
                          <div>
                            <p className="text-xs font-semibold mb-1 text-muted-foreground">
                              Después
                            </p>
                            <pre className="overflow-x-auto text-xs bg-muted p-2 rounded-md max-h-60">
                              {log.after != null
                                ? JSON.stringify(log.after, null, 2)
                                : '—'}
                            </pre>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
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
