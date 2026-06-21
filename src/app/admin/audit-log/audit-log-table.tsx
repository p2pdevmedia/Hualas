'use client';

import Link from 'next/link';
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
  lookups?: {
    usersById?: Record<string, string>;
    activitiesById?: Record<string, string>;
    conversationParticipantsById?: Record<
      string,
      Array<{ userId: string; name: string }>
    >;
  };
}

type AuditLogTableProps = {
  initialUser?: {
    id: string;
    label: string;
  };
};

const IGNORED_CHANGE_FIELDS = new Set([
  'id',
  'createdAt',
  'updatedAt',
  'deletedAt',
  'version',
  'requestId',
  'password',
  'passwordHash',
  'token',
  'refreshToken',
  'accessToken',
  'sessionToken',
  'blobToken',
]);

const CHANGE_GROUPS: Array<{ fields: string[]; label: string }> = [
  {
    fields: ['name', 'firstName', 'lastName', 'fullName'],
    label: 'perfil',
  },
  {
    fields: ['email', 'phone', 'phoneNumber', 'cellphone', 'mobile'],
    label: 'contacto',
  },
  {
    fields: ['address', 'street', 'city', 'province', 'postalCode', 'zipCode'],
    label: 'domicilio',
  },
  { fields: ['dni'], label: 'documentación' },
  { fields: ['role', 'roles', 'roleAssignments'], label: 'acceso' },
  { fields: ['socialFeeActive'], label: 'cuota social' },
  {
    fields: ['status', 'approvedAt', 'rejectedAt', 'paidAt'],
    label: 'estado',
  },
  {
    fields: ['amount', 'price', 'total', 'paidAmount', 'balance'],
    label: 'monto',
  },
  {
    fields: ['date', 'day', 'startDate', 'endDate', 'schedule', 'time'],
    label: 'horario',
  },
  {
    fields: ['title', 'description', 'body', 'summary', 'content', 'message'],
    label: 'contenido',
  },
  {
    fields: ['observations', 'notes', 'comment', 'pickupPersonName'],
    label: 'observaciones',
  },
  {
    fields: [
      'childId',
      'userId',
      'memberId',
      'participantId',
      'responsibleUserId',
      'activityId',
      'groupId',
    ],
    label: 'vínculos',
  },
];

function formatList(items: string[]) {
  if (items.length <= 1) return items[0] ?? '';
  if (items.length === 2) return `${items[0]} y ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}

function getFieldValue(record: Record<string, unknown> | null, field: string) {
  if (!record) return undefined;
  return record[field];
}

function stringifyComparable(value: unknown) {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value);
  if (value instanceof Date) return value.toISOString();
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function collectChangedFields(log: AuditLog) {
  const before = asRecord(log.before);
  const after = asRecord(log.after);
  const args = asRecord(log.args);
  const argsData = asRecord(args?.data);

  const keys = new Set<string>();
  for (const source of [before, after, argsData]) {
    if (!source) continue;
    for (const key of Object.keys(source)) {
      if (!IGNORED_CHANGE_FIELDS.has(key)) {
        keys.add(key);
      }
    }
  }

  const changed = new Set<string>();
  for (const key of keys) {
    const beforeValue = stringifyComparable(getFieldValue(before, key));
    const afterValue = stringifyComparable(getFieldValue(after, key));
    const argsValue = stringifyComparable(getFieldValue(argsData, key));

    if (beforeValue !== afterValue || argsValue !== afterValue) {
      changed.add(key);
    }
  }

  return [...changed];
}

function describeChangeGroups(fields: string[]) {
  const labels: string[] = [];

  for (const group of CHANGE_GROUPS) {
    if (group.fields.some((field) => fields.includes(field))) {
      labels.push(group.label);
    }
  }

  return [...new Set(labels)];
}

function getEntityLabel(log: AuditLog, data: ApiResponse | null) {
  const after = asRecord(log.after);
  const args = asRecord(log.args);
  const argsData = asRecord(args?.data);
  const usersById = data?.lookups?.usersById ?? {};
  const activitiesById = data?.lookups?.activitiesById ?? {};

  if (log.model === 'User') {
    return (
      (log.recordId && usersById[log.recordId]) ||
      getStringField(after, ['name', 'fullName', 'email']) ||
      'usuario'
    );
  }

  if (log.model === 'Activity') {
    return (
      (log.recordId && activitiesById[log.recordId]) ||
      getStringField(after, ['name', 'title']) ||
      'actividad'
    );
  }

  if (log.model === 'Child') {
    const firstName =
      getStringField(after, ['name']) ?? getStringField(argsData, ['name']);
    const lastName =
      getStringField(after, ['lastName']) ??
      getStringField(argsData, ['lastName']);
    return [firstName, lastName].filter(Boolean).join(' ') || 'hijo/a';
  }

  if (log.model === 'News' || log.model === 'Form') {
    return (
      getStringField(after, ['title']) ||
      getStringField(after, ['name']) ||
      'registro'
    );
  }

  if (log.model === 'Message') {
    return 'mensaje';
  }

  if (log.model === 'PickupNotice') {
    return 'aviso de retiro';
  }

  if (log.model === 'Payment' || log.model === 'SocialFeePayment') {
    return 'pago';
  }

  if (log.model === 'ProfessorInvoice') {
    return 'factura de profesor';
  }

  return (
    getStringField(after, ['name', 'title', 'label']) || log.model.toLowerCase()
  );
}

function buildUpdateSummary(log: AuditLog, data: ApiResponse | null) {
  const entity = getEntityLabel(log, data);
  const changes = describeChangeGroups(collectChangedFields(log));
  const changeSuffix = changes.length ? ` (${formatList(changes)})` : '';

  if (log.model === 'User') {
    return `actualizó el perfil de ${entity}${changeSuffix}.`;
  }

  if (log.model === 'Child') {
    return `actualizó la ficha de ${entity}${changeSuffix}.`;
  }

  if (log.model === 'Activity') {
    return `actualizó la actividad ${entity}${changeSuffix}.`;
  }

  if (log.model === 'Payment' || log.model === 'SocialFeePayment') {
    const after = asRecord(log.after);
    const status = getStringField(after, ['status']);
    if (status === 'APPROVED') {
      return `aprobó el pago de ${entity}${changeSuffix}.`;
    }
    if (status === 'REJECTED') {
      return `rechazó el pago de ${entity}${changeSuffix}.`;
    }
    return `actualizó el pago de ${entity}${changeSuffix}.`;
  }

  if (log.model === 'ProfessorInvoice') {
    const after = asRecord(log.after);
    const status = getStringField(after, ['status']);
    if (status === 'APPROVED') {
      return `aprobó la factura de profesor de ${entity}${changeSuffix}.`;
    }
    if (status === 'TRANSFERRED') {
      return `marcó como transferida la factura de ${entity}${changeSuffix}.`;
    }
    return `actualizó la factura de profesor de ${entity}${changeSuffix}.`;
  }

  if (log.model === 'PickupNotice') {
    return `actualizó un aviso de retiro${changeSuffix}.`;
  }

  if (log.model === 'News' || log.model === 'Form') {
    return `actualizó ${log.model === 'News' ? 'la noticia' : 'el formulario'} ${entity}${changeSuffix}.`;
  }

  return `actualizó ${entity}${changeSuffix}.`;
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

export function buildHumanSummary(log: AuditLog, data: ApiResponse | null) {
  const after = asRecord(log.after);
  const args = asRecord(log.args);
  const argsData = asRecord(args?.data);

  const usersById = data?.lookups?.usersById ?? {};
  const activitiesById = data?.lookups?.activitiesById ?? {};
  const participantsByConversation =
    data?.lookups?.conversationParticipantsById ?? {};

  const actor = (log.userId && usersById[log.userId]) || 'Sistema';

  if (log.model === 'User' && log.action === 'login') {
    const userLabel =
      getStringField(after, ['name']) ??
      getStringField(after, ['email']) ??
      'Usuario';
    const time = new Date(log.createdAt).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${userLabel} inició sesión en la app a las ${time}`;
  }

  if (log.model === 'User' && log.action === 'create') {
    const createdUserName =
      (log.recordId && usersById[log.recordId]) ||
      getStringField(after, ['name', 'fullName', 'email']) ||
      'Usuario';

    return `Nuevo usuario creado: ${createdUserName}. Creado por: ${actor}.`;
  }

  if (log.model === 'User' && log.action === 'update') {
    return `${actor} ${buildUpdateSummary(log, data)}`;
  }

  if (log.model === 'Message' && log.action === 'create') {
    const senderId =
      getStringField(after, ['senderId']) ??
      getStringField(argsData, ['senderId']) ??
      null;
    const conversationId =
      getStringField(after, ['conversationId']) ??
      getStringField(argsData, ['conversationId']) ??
      null;
    const messageBody =
      getStringField(after, ['body', 'content', 'message']) ??
      getStringField(argsData, ['body', 'content', 'message']) ??
      '—';

    const senderName = (senderId && usersById[senderId]) || actor;

    const conversationParticipants =
      (conversationId && participantsByConversation[conversationId]) || [];
    const recipients = conversationParticipants
      .filter((participant) => participant.userId !== senderId)
      .map((participant) => participant.name)
      .filter(Boolean);

    const recipientLabel =
      recipients.length > 0 ? recipients.join(', ') : 'destinatario';

    return `Mensaje enviado de ${senderName} a ${recipientLabel}: ${messageBody}`;
  }

  if (log.model === 'Activity' && log.action === 'create') {
    const activityName =
      (log.recordId && activitiesById[log.recordId]) ||
      getStringField(after, ['name', 'title']) ||
      'Actividad';

    return `Actividad creada: ${activityName}. Creada por: ${actor}.`;
  }

  if (log.model === 'Activity' && log.action === 'update') {
    return `${actor} ${buildUpdateSummary(log, data)}`;
  }

  if (log.action === 'update') {
    return `${actor} ${buildUpdateSummary(log, data)}`;
  }

  if (log.action === 'delete') {
    return `${log.model} eliminado por ${actor}.`;
  }

  if (log.action === 'create') {
    return `${log.model} creado por ${actor}.`;
  }

  return `${log.model} ${log.action} por ${actor}.`;
}

export default function AuditLogTable({ initialUser }: AuditLogTableProps) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [page, setPage] = useState(1);
  const [model, setModel] = useState('');
  const [action, setAction] = useState('');
  const [user, setUser] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const initialUserId = initialUser?.id ?? '';

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (model) params.set('model', model);
    if (action) params.set('action', action);
    if (initialUserId) {
      params.set('userId', initialUserId);
    } else if (user) {
      params.set('user', user);
    }

    fetch(`/api/admin/audit-log?${params}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [page, model, action, user, initialUserId]);

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1;

  return (
    <div className="space-y-4">
      {initialUser ? (
        <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
          <div className="font-medium">Auditoría de {initialUser.label}</div>
          <div className="text-muted-foreground">
            Filtrado por usuario exacto.
          </div>
        </div>
      ) : null}
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
        {initialUser ? (
          <Link
            href="/admin/audit-log"
            className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
          >
            Ver auditoría completa
          </Link>
        ) : (
          <input
            type="text"
            placeholder="Filtrar por nombre, apellido o email"
            value={user}
            onChange={(e) => {
              setUser(e.target.value);
              setPage(1);
            }}
            className="min-w-[260px] rounded-md border px-3 py-1.5 text-sm"
          />
        )}
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
                <th className="px-4 py-2">Qué pasó</th>
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
                    <td className="px-4 py-2">
                      {buildHumanSummary(log, data)}
                    </td>
                    <td className="px-4 py-2 font-mono">{log.model}</td>
                    <td className="px-4 py-2 font-mono">{log.action}</td>
                    <td className="px-4 py-2 text-xs text-blue-600 underline">
                      {expanded === log.id
                        ? 'Ocultar detalle completo'
                        : 'Ver detalle completo'}
                    </td>
                  </tr>
                  {expanded === log.id && (
                    <tr className="bg-muted/30">
                      <td colSpan={5} className="px-4 py-3">
                        <div className="mb-3 grid grid-cols-1 gap-2 text-xs md:grid-cols-3">
                          <p>
                            <span className="font-semibold">Record ID:</span>{' '}
                            <span className="font-mono">
                              {log.recordId ?? '—'}
                            </span>
                          </p>
                          <p>
                            <span className="font-semibold">User ID:</span>{' '}
                            <span className="font-mono">
                              {log.userId ?? '—'}
                            </span>
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
