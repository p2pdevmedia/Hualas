'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import CreateActivityForm from './form';

type ProfessorOption = {
  id: string;
  name: string | null;
  lastName: string | null;
  email: string;
};

interface CreateActivityGateProps {
  professors: ProfessorOption[];
}

export default function CreateActivityGate({
  professors,
}: CreateActivityGateProps) {
  const [showForm, setShowForm] = useState(false);

  return (
    <section className="space-y-4">
      <Button type="button" onClick={() => setShowForm((current) => !current)}>
        {showForm ? 'Ocultar formulario' : 'Crear actividad'}
      </Button>

      {showForm && (
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <CreateActivityForm professors={professors} />
        </div>
      )}
    </section>
  );
}
