'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Child {
  id: string;
  name: string;
}

interface ActivityDay {
  id: string;
  date: string;
  schedule: string;
  activity: {
    id: string;
    name: string;
  };
  eligibleChildIds: string[];
}

interface PickupNoticeWizardProps {
  childrenList: Child[];
  activityDays: ActivityDay[];
}

type StepId = 0 | 1 | 2 | 3;

function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(new Date(value));
}

function formatSummaryDate(value: string) {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

export default function PickupNoticeWizard({
  childrenList,
  activityDays,
}: PickupNoticeWizardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState<StepId>(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedChildId, setSelectedChildId] = useState('');
  const [selectedActivityId, setSelectedActivityId] = useState('');
  const [selectedDayId, setSelectedDayId] = useState('');
  const [formData, setFormData] = useState({
    alternatePersonName: '',
    description: '',
  });

  useEffect(() => {
    if (childrenList.length === 1) {
      setSelectedChildId(childrenList[0].id);
    }
  }, [childrenList]);

  const childActivityDays = useMemo(
    () =>
      selectedChildId
        ? activityDays.filter((day) =>
            day.eligibleChildIds.includes(selectedChildId)
          )
        : [],
    [activityDays, selectedChildId]
  );

  const activityOptions = useMemo(() => {
    const options = new Map<
      string,
      { id: string; name: string; days: ActivityDay[] }
    >();

    for (const day of childActivityDays) {
      const existing = options.get(day.activity.id);
      if (existing) {
        existing.days.push(day);
        continue;
      }

      options.set(day.activity.id, {
        id: day.activity.id,
        name: day.activity.name,
        days: [day],
      });
    }

    return Array.from(options.values()).sort((left, right) =>
      left.name.localeCompare(right.name, 'es')
    );
  }, [childActivityDays]);

  const selectedActivity = activityOptions.find(
    (activity) => activity.id === selectedActivityId
  );

  const dayOptions = useMemo(
    () =>
      selectedActivity
        ? [...selectedActivity.days].sort(
            (left, right) =>
              new Date(left.date).getTime() - new Date(right.date).getTime()
          )
        : [],
    [selectedActivity]
  );

  const selectedChild = childrenList.find(
    (child) => child.id === selectedChildId
  );
  const selectedDay = dayOptions.find((day) => day.id === selectedDayId);

  useEffect(() => {
    if (!selectedChildId) {
      setSelectedActivityId('');
      setSelectedDayId('');
      return;
    }

    if (activityOptions.length === 1) {
      setSelectedActivityId(activityOptions[0].id);
    } else if (
      !activityOptions.some((activity) => activity.id === selectedActivityId)
    ) {
      setSelectedActivityId('');
    }

    setSelectedDayId('');
    setStep((current) => (current > 1 ? 1 : current));
  }, [activityOptions, selectedActivityId, selectedChildId]);

  useEffect(() => {
    if (!selectedActivityId) {
      setSelectedDayId('');
      return;
    }

    if (dayOptions.length === 1) {
      setSelectedDayId(dayOptions[0].id);
    } else if (!dayOptions.some((day) => day.id === selectedDayId)) {
      setSelectedDayId('');
    }
    setStep((current) => (current > 2 ? 2 : current));
  }, [dayOptions, selectedActivityId, selectedDayId]);

  useEffect(() => {
    setErrors((current) => {
      const next = { ...current };
      delete next.selectedChildId;
      return next;
    });
  }, [selectedChildId]);

  useEffect(() => {
    setErrors((current) => {
      const next = { ...current };
      delete next.selectedActivityId;
      return next;
    });
  }, [selectedActivityId]);

  useEffect(() => {
    setErrors((current) => {
      const next = { ...current };
      delete next.selectedDayId;
      return next;
    });
  }, [selectedDayId]);

  const stepItems = [
    'Para quién',
    'Actividad',
    'Día y horario',
    'Quién retira',
  ];

  const goNext = () => {
    const nextErrors: Record<string, string> = {};

    if (step === 0 && !selectedChildId) {
      nextErrors.selectedChildId = 'Seleccioná un hijo';
    }

    if (step === 0 && selectedChildId && activityOptions.length === 0) {
      nextErrors.selectedChildId =
        'Ese hijo no tiene actividades futuras habilitadas';
    }

    if (step === 1 && !selectedActivityId) {
      nextErrors.selectedActivityId = 'Seleccioná una actividad';
    }

    if (step === 1 && selectedActivityId && dayOptions.length === 0) {
      nextErrors.selectedActivityId = 'Esa actividad no tiene días habilitados';
    }

    if (step === 2 && !selectedDayId) {
      nextErrors.selectedDayId = 'Seleccioná un día';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors((current) => ({ ...current, ...nextErrors }));
      return;
    }

    setStep((current) => (current < 3 ? ((current + 1) as StepId) : current));
  };

  const goBack = () => {
    setStep((current) => (current > 0 ? ((current - 1) as StepId) : current));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: Record<string, string> = {};

    if (!selectedChildId) {
      nextErrors.selectedChildId = 'Seleccioná un hijo';
    }

    if (!selectedActivityId) {
      nextErrors.selectedActivityId = 'Seleccioná una actividad';
    }

    if (!selectedDayId) {
      nextErrors.selectedDayId = 'Seleccioná un día';
    }

    if (!formData.alternatePersonName.trim()) {
      nextErrors.alternatePersonName = 'Ingresá un nombre';
    }

    if (!formData.description.trim()) {
      nextErrors.description = 'La descripción es obligatoria';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      const firstMissingStep: StepId = nextErrors.selectedChildId
        ? 0
        : nextErrors.selectedActivityId
          ? 1
          : nextErrors.selectedDayId
            ? 2
            : 3;
      setStep(firstMissingStep);
      toast({
        title: 'Faltan datos',
        description: 'Completá los campos requeridos para continuar.',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedDayId) return;

    setLoading(true);

    try {
      const response = await fetch(
        `/api/activity-days/${selectedDayId}/pickup-notices`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            childId: selectedChildId,
            alternatePersonUserId: null,
            alternatePersonName: formData.alternatePersonName.trim(),
            description: formData.description.trim(),
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'No se pudo crear el aviso');
      }

      toast({
        title: 'Aviso creado',
        description: 'El aviso de retiro se guardó correctamente.',
      });

      router.push('/profile/pickup-notices');
      router.refresh();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Algo salió mal.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    if (step === 0) {
      return (
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Hijo o hija *
            </label>
            <Select
              value={selectedChildId}
              onValueChange={(value) => setSelectedChildId(value)}
            >
              <option value="">Elegí un hijo</option>
              {childrenList.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.name}
                </option>
              ))}
            </Select>
            {errors.selectedChildId && (
              <p className="mt-1 text-sm text-red-500">
                {errors.selectedChildId}
              </p>
            )}
          </div>

          {selectedChild && (
            <p className="text-sm text-muted-foreground">
              Vas a crear el aviso para{' '}
              <span className="font-medium">{selectedChild.name}</span>.
            </p>
          )}
        </div>
      );
    }

    if (step === 1) {
      return (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium">Actividad *</p>
            <Select
              value={selectedActivityId}
              onValueChange={(value) => setSelectedActivityId(value)}
              disabled={!selectedChildId || activityOptions.length === 0}
            >
              <option value="">Elegí una actividad</option>
              {activityOptions.map((activity) => (
                <option key={activity.id} value={activity.id}>
                  {activity.name}
                </option>
              ))}
            </Select>
            {errors.selectedActivityId && (
              <p className="mt-1 text-sm text-red-500">
                {errors.selectedActivityId}
              </p>
            )}
          </div>

          {selectedChild && (
            <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
              {activityOptions.length > 0 ? (
                <p>
                  Solo mostramos las actividades futuras habilitadas para{' '}
                  <span className="font-medium">{selectedChild.name}</span>.
                </p>
              ) : (
                <p>
                  Ese hijo no tiene actividades futuras habilitadas para crear
                  un aviso de retiro.
                </p>
              )}
            </div>
          )}
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium">Día y horario *</p>
            <Select
              value={selectedDayId}
              onValueChange={(value) => setSelectedDayId(value)}
              disabled={!selectedActivityId || dayOptions.length === 0}
            >
              <option value="">Elegí un día</option>
              {dayOptions.map((day) => (
                <option key={day.id} value={day.id}>
                  {formatDateLabel(day.date)} · {day.schedule}
                </option>
              ))}
            </Select>
            {errors.selectedDayId && (
              <p className="mt-1 text-sm text-red-500">
                {errors.selectedDayId}
              </p>
            )}
          </div>

          {selectedActivity && (
            <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
              {dayOptions.length > 0 ? (
                <p>
                  {dayOptions.length} horario
                  {dayOptions.length === 1 ? '' : 's'} habilitado
                  {dayOptions.length === 1 ? '' : 's'} para{' '}
                  <span className="font-medium">{selectedActivity.name}</span>.
                </p>
              ) : (
                <p>No hay días habilitados para esa actividad.</p>
              )}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid gap-3 rounded-xl border bg-muted/20 p-4 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Hijo</span>
            <span className="font-medium text-right">
              {selectedChild?.name || 'Sin definir'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Actividad</span>
            <span className="font-medium text-right">
              {selectedActivity?.name || 'Sin definir'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Día y horario</span>
            <span className="font-medium text-right">
              {selectedDay
                ? `${formatSummaryDate(selectedDay.date)} · ${selectedDay.schedule}`
                : 'Sin definir'}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">Quién retirará *</p>
          <div>
            <label className="mb-2 block text-sm font-medium">Nombre</label>
            <input
              value={formData.alternatePersonName}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  alternatePersonName: event.target.value,
                }))
              }
              placeholder="Ej: Tía María, vecino, mamá de un amigo"
              className={cn(
                'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                errors.alternatePersonName && 'border-red-500'
              )}
            />
            {errors.alternatePersonName && (
              <p className="mt-1 text-sm text-red-500">
                {errors.alternatePersonName}
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Observaciones *
            </label>
            <Textarea
              value={formData.description}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="Dejá una nota breve para el profesor o la profesora."
              className={cn(errors.description && 'border-red-500')}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-500">{errors.description}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-3 rounded-2xl border bg-card p-4 shadow-sm sm:grid-cols-4">
        {stepItems.map((label, index) => {
          const currentStep = index as StepId;
          const isActive = step === currentStep;
          const isCompleted = step > currentStep;

          return (
            <button
              key={label}
              type="button"
              onClick={() => {
                if (currentStep <= step) {
                  setStep(currentStep);
                }
              }}
              className={cn(
                'rounded-xl border px-3 py-2 text-left text-sm transition-colors',
                isActive && 'border-primary bg-primary/5',
                isCompleted && 'border-emerald-200 bg-emerald-50',
                !isActive && !isCompleted && 'border-border bg-background'
              )}
            >
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Paso {index + 1}
              </div>
              <div className="font-medium">{label}</div>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">
            Paso {step + 1} de {stepItems.length}
          </p>
          <h2 className="text-xl font-semibold tracking-tight">
            {stepItems[step]}
          </h2>
        </div>

        {renderStepContent()}

        <div className="mt-8 flex flex-wrap gap-3">
          {step > 0 && (
            <Button type="button" variant="outline" onClick={goBack}>
              Volver
            </Button>
          )}
          {step < 3 ? (
            <Button
              type="button"
              onClick={goNext}
              disabled={
                loading ||
                (step === 0 &&
                  (!selectedChildId || activityOptions.length === 0)) ||
                (step === 1 &&
                  (!selectedActivityId || dayOptions.length === 0)) ||
                (step === 2 && !selectedDayId)
              }
            >
              Continuar
            </Button>
          ) : (
            <Button type="submit" disabled={loading || !selectedDayId}>
              {loading ? 'Guardando...' : 'Crear aviso de retiro'}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
