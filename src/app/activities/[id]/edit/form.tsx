'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import ProfessorPicker from '../../professor-picker';

type ProfessorOption = {
  id: string;
  name: string | null;
  lastName: string | null;
  email: string;
};

type ExistingGroup = {
  id: string;
  name: string;
  description: string | null;
};

interface EditActivityFormProps {
  activity: {
    id: string;
    name: string;
    date: string;
    endDate: string;
    activityType: 'TEMPORARY' | 'ANNUAL';
    description?: string | null;
    price: number;
    capacity?: number | null;
    professorIds: string[];
  };
  professors: ProfessorOption[];
  initialGroups: ExistingGroup[];
}

export default function EditActivityForm({
  activity,
  professors,
  initialGroups,
}: EditActivityFormProps) {
  const [name, setName] = useState(activity.name);
  const [date, setDate] = useState(activity.date);
  const [endDate, setEndDate] = useState(activity.endDate);
  const [activityType, setActivityType] = useState<'TEMPORARY' | 'ANNUAL'>(
    activity.activityType
  );
  const [description, setDescription] = useState(activity.description || '');
  const [price, setPrice] = useState(String(activity.price));
  const [capacity, setCapacity] = useState(activity.capacity?.toString() ?? '');
  const [professorIds, setProfessorIds] = useState<string[]>(
    activity.professorIds
  );

  const [existingGroups, setExistingGroups] =
    useState<ExistingGroup[]>(initialGroups);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [groupError, setGroupError] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);

  const router = useRouter();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const inputClass =
    'w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary';

  async function handleCreateGroup() {
    if (!newGroupName.trim()) return;
    setGroupError('');
    setCreatingGroup(true);
    try {
      const res = await fetch(`/api/activities/${activity.id}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newGroupName.trim(),
          description: newGroupDesc.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error('No se pudo crear el grupo');
      const group = await res.json();
      setExistingGroups((current) => [...current, group]);
      setNewGroupName('');
      setNewGroupDesc('');
    } catch (err) {
      setGroupError(
        err instanceof Error ? err.message : 'Error al crear el grupo'
      );
    } finally {
      setCreatingGroup(false);
    }
  }

  async function handleDeleteGroup(groupId: string) {
    setGroupError('');
    setDeletingGroupId(groupId);
    try {
      const res = await fetch(`/api/activity-groups/${groupId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('No se pudo eliminar el grupo');
      setExistingGroups((current) => current.filter((g) => g.id !== groupId));
    } catch (err) {
      setGroupError(
        err instanceof Error ? err.message : 'Error al eliminar el grupo'
      );
    } finally {
      setDeletingGroupId(null);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/activities/${activity.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          date,
          endDate,
          activityType,
          description: description || undefined,
          price: Number(price),
          capacity: capacity ? Number(capacity) : undefined,
          professorIds,
        }),
      });
      if (!res.ok) throw new Error('Request failed');
      setSuccess('Actividad actualizada');
      setTimeout(() => {
        router.push('/activities');
        router.refresh();
      }, 1000);
    } catch (e) {
      setError('No se pudo actualizar la actividad');
    }
  };

  return (
    <Form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        placeholder="Nombre de la actividad"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className={inputClass}
        required
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium">Fecha de inicio</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Fecha de fin</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={inputClass}
            required
          />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Tipo de actividad</label>
        <select
          value={activityType}
          onChange={(e) =>
            setActivityType(e.target.value as 'TEMPORARY' | 'ANNUAL')
          }
          className={inputClass}
        >
          <option value="TEMPORARY">Temporal</option>
          <option value="ANNUAL">Anual</option>
        </select>
      </div>
      <textarea
        placeholder="Descripción"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className={`${inputClass} min-h-[80px] resize-y`}
      />
      <input
        type="number"
        placeholder="Precio"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        className={inputClass}
      />
      <input
        type="number"
        min={1}
        placeholder="Cupo de inscripciones (opcional)"
        value={capacity}
        onChange={(e) => setCapacity(e.target.value)}
        className={inputClass}
      />
      <ProfessorPicker
        professors={professors}
        value={professorIds}
        onChange={setProfessorIds}
      />
      {activityType === 'ANNUAL' && (
        <p className="text-xs text-muted-foreground">
          Cambiar fechas o tipo no regenera automáticamente las sesiones ya
          creadas para esta actividad.
        </p>
      )}

      <div className="space-y-3 rounded-lg border bg-background p-4">
        <p className="text-sm font-semibold">Grupos</p>

        {existingGroups.length > 0 ? (
          <ul className="space-y-2">
            {existingGroups.map((group) => (
              <li
                key={group.id}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span>
                  {group.name}
                  {group.description && (
                    <span className="ml-2 text-muted-foreground">
                      — {group.description}
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  disabled={deletingGroupId === group.id}
                  onClick={() => handleDeleteGroup(group.id)}
                  className="ml-4 text-xs text-destructive hover:text-destructive/80 disabled:opacity-50"
                >
                  {deletingGroupId === group.id ? 'Eliminando...' : 'Eliminar'}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">Sin grupos todavía.</p>
        )}

        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] items-end">
          <input
            type="text"
            placeholder="Nombre del grupo"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            className={inputClass}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCreateGroup();
              }
            }}
          />
          <input
            type="text"
            placeholder="Descripción (opcional)"
            value={newGroupDesc}
            onChange={(e) => setNewGroupDesc(e.target.value)}
            className={inputClass}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCreateGroup();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={creatingGroup}
            onClick={handleCreateGroup}
          >
            {creatingGroup ? 'Creando...' : 'Agregar'}
          </Button>
        </div>

        {groupError && <p className="text-xs text-destructive">{groupError}</p>}
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}
      {success && <p className="text-success text-sm">{success}</p>}
      <Button type="submit" className="w-full">
        Guardar
      </Button>
    </Form>
  );
}
