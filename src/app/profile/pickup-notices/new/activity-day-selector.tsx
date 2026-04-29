'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { PickupNoticeForm } from '@/components/pickup-notice/parent-form';

interface ActivityDay {
  id: string;
  date: Date;
  schedule: string;
  activity: {
    id: string;
    name: string;
  };
}

interface Child {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
}

interface ActivityDaySelectorProps {
  activityDays: ActivityDay[];
  childrenList: Child[];
  users: User[];
}

export default function ActivityDaySelector({
  activityDays,
  childrenList,
  users,
}: ActivityDaySelectorProps) {
  const [selectedDayId, setSelectedDayId] = useState<string>('');

  const selectedDay = activityDays.find((d) => d.id === selectedDayId);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <label className="block text-sm font-medium mb-3">
          Selecciona una actividad y día
        </label>
        <Select value={selectedDayId} onValueChange={setSelectedDayId}>
          <SelectTrigger>
            <SelectValue placeholder="Elige un día..." />
          </SelectTrigger>
          <SelectContent>
            {activityDays.map((day) => (
              <SelectItem key={day.id} value={day.id}>
                {day.activity.name} -{' '}
                {new Date(day.date).toLocaleDateString('es-AR')} {day.schedule}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedDay && (
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
          <div>
            <h2 className="font-semibold mb-2">{selectedDay.activity.name}</h2>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>
                Fecha: {new Date(selectedDay.date).toLocaleDateString('es-AR')}
              </p>
              <p>Hora: {selectedDay.schedule}</p>
            </div>
          </div>

          <PickupNoticeForm
            activityDayId={selectedDay.id}
            childrenList={childrenList}
            users={users}
            onSuccess={() => {
              window.location.href = '/profile/pickup-notices';
            }}
          />
        </div>
      )}

      <div className="flex gap-2">
        <Link href="/profile/pickup-notices">
          <Button variant="outline">Cancelar</Button>
        </Link>
      </div>
    </div>
  );
}
