'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

type DayType = {
  id: string;
  name: string;
  icon: string;
  defaultDescription: string | null;
  sortOrder: number;
  isActive: boolean;
};

type EditState = {
  name: string;
  icon: string;
  defaultDescription: string;
  sortOrder: number;
  isActive: boolean;
};

const inputClass =
  'w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary';

export default function DayTypesManager({ initialTypes }: { initialTypes: DayType[] }) {
  const router = useRouter();
  const [types, setTypes] = useState<DayType[]>(initialTypes);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newState, setNewState] = useState<EditState>({
    name: '',
    icon: '',
    defaultDescription: '',
    sortOrder: 0,
    isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function startEdit(type: DayType) {
    setEditingId(type.id);
    setEditState({
      name: type.name,
      icon: type.icon,
      defaultDescription: type.defaultDescription ?? '',
      sortOrder: type.sortOrder,
      isActive: type.isActive,
    });
    setError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditState(null);
    setError('');
  }

  async function saveEdit(id: string) {
    if (!editState) return;
    setError('');
    setSaving(true);
    try {
      const res = await fetch(`/api/activity-day-types/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editState),
      });
      if (!res.ok) {
        const p = await res.json().catch(() => null);
        throw new Error(p?.error || 'No se pudo guardar');
      }
      const updated: DayType = await res.json();
      setTypes(types.map(t => (t.id === id ? updated : t)));
      setEditingId(null);
      setEditState(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function deleteType(id: string) {
    if (!confirm('¿Eliminar este tipo? Las sesiones existentes no se verán afectadas.')) return;
    setSaving(true);
    try {
      await fetch(`/api/activity-day-types/${id}`, { method: 'DELETE' });
      setTypes(types.filter(t => t.id !== id));
      router.refresh();
    } catch {
      setError('Error al eliminar');
    } finally {
      setSaving(false);
    }
  }

  async function createType() {
    setError('');
    setSaving(true);
    try {
      const res = await fetch('/api/activity-day-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newState),
      });
      if (!res.ok) {
        const p = await res.json().catch(() => null);
        throw new Error(p?.error || 'No se pudo crear');
      }
      const created: DayType = await res.json();
      setTypes([...types, created]);
      setShowNew(false);
      setNewState({ name: '', icon: '', defaultDescription: '', sortOrder: 0, isActive: true });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" onClick={() => { setShowNew(v => !v); setError(''); }}>
          {showNew ? 'Cancelar' : 'Agregar tipo'}
        </Button>
      </div>

      {showNew && (
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <p className="font-semibold text-sm">Nuevo tipo de sesión</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className={inputClass} placeholder="Nombre (ej: Kayak)" value={newState.name} onChange={e => setNewState(s => ({ ...s, name: e.target.value }))} />
            <input className={inputClass} placeholder="Ícono (ej: 🛶)" value={newState.icon} onChange={e => setNewState(s => ({ ...s, icon: e.target.value }))} />
          </div>
          <textarea className={`${inputClass} min-h-[80px] resize-y`} placeholder="Descripción pre-cargada para la sesión" value={newState.defaultDescription} onChange={e => setNewState(s => ({ ...s, defaultDescription: e.target.value }))} />
          <div className="flex items-center gap-3">
            <input type="number" className={`${inputClass} w-24`} placeholder="Orden" value={newState.sortOrder} onChange={e => setNewState(s => ({ ...s, sortOrder: Number(e.target.value) }))} />
            <Button onClick={createType} disabled={saving}>Crear</Button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ícono</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nombre</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Descripción pre-cargada</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Orden</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Activo</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {types.map(type => {
              const isEditing = editingId === type.id;
              return (
                <tr key={type.id} className={isEditing ? 'bg-muted/30' : 'hover:bg-muted/20 transition-colors'}>
                  {isEditing && editState ? (
                    <>
                      <td className="px-4 py-3">
                        <input className={`${inputClass} w-16 text-center text-xl`} value={editState.icon} onChange={e => setEditState(s => s ? { ...s, icon: e.target.value } : s)} />
                      </td>
                      <td className="px-4 py-3">
                        <input className={inputClass} value={editState.name} onChange={e => setEditState(s => s ? { ...s, name: e.target.value } : s)} />
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <textarea className={`${inputClass} min-h-[70px] resize-y`} value={editState.defaultDescription} onChange={e => setEditState(s => s ? { ...s, defaultDescription: e.target.value } : s)} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input type="number" className={`${inputClass} w-16 text-center`} value={editState.sortOrder} onChange={e => setEditState(s => s ? { ...s, sortOrder: Number(e.target.value) } : s)} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input type="checkbox" checked={editState.isActive} onChange={e => setEditState(s => s ? { ...s, isActive: e.target.checked } : s)} className="h-4 w-4 accent-primary" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-end">
                          <Button className="px-3 py-1 text-xs" onClick={() => saveEdit(type.id)} disabled={saving}>Guardar</Button>
                          <Button className="px-3 py-1 text-xs" variant="outline" onClick={cancelEdit}>Cancelar</Button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-2xl">{type.icon}</td>
                      <td className="px-4 py-3 font-medium">{type.name}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell max-w-xs truncate">{type.defaultDescription ?? '—'}</td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{type.sortOrder}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block h-2 w-2 rounded-full ${type.isActive ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-end">
                          <Button className="px-3 py-1 text-xs" variant="outline" onClick={() => startEdit(type)}>Editar</Button>
                          <Button className="px-3 py-1 text-xs text-destructive hover:text-destructive" variant="outline" onClick={() => deleteType(type.id)}>Eliminar</Button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
