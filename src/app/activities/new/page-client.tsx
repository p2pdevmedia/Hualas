'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import CreateActivityForm from './form';
import ActivityImageUpload from '../activity-image-upload';

type ProfessorOption = {
  id: string;
  name: string | null;
  lastName: string | null;
  email: string;
};

interface CreateActivityPageClientProps {
  professors: ProfessorOption[];
}

export default function CreateActivityPageClient({
  professors,
}: CreateActivityPageClientProps) {
  const router = useRouter();
  const [createdActivityId, setCreatedActivityId] = useState<string | null>(null);

  const handleActivityCreated = (activityId: string) => {
    setCreatedActivityId(activityId);
  };

  const handleImageUploadComplete = () => {
    router.push('/activities');
    router.refresh();
  };

  const handleSkipUpload = () => {
    router.push('/activities');
    router.refresh();
  };

  return (
    <main className="p-4">
      <h1 className="mb-4 text-2xl font-bold">Crear actividad</h1>
      {!createdActivityId ? (
        <CreateActivityForm professors={professors} onSuccess={handleActivityCreated} />
      ) : (
        <div className="space-y-6">
          <div>
            <h2 className="mb-4 text-lg font-semibold">Subir imagen de la actividad</h2>
            <ActivityImageUpload
              activityId={createdActivityId}
              onSuccess={handleImageUploadComplete}
            />
          </div>
          <Button onClick={handleSkipUpload} variant="outline" className="w-full">
            Saltar y volver a actividades
          </Button>
        </div>
      )}
    </main>
  );
}
