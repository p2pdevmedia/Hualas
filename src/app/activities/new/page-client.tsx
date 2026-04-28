'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heading, Box, Container } from '@radix-ui/themes';
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
    <Container>
      <main className="p-4">
        <Heading size="8" mb="4">
          Crear actividad
        </Heading>
        {!createdActivityId ? (
          <CreateActivityForm professors={professors} onSuccess={handleActivityCreated} />
        ) : (
          <Box className="space-y-6">
            <Box>
              <Heading size="6" mb="4">
                Subir imagen de la actividad
              </Heading>
              <ActivityImageUpload
                activityId={createdActivityId}
                onSuccess={handleImageUploadComplete}
              />
            </Box>
            <Button onClick={handleSkipUpload} variant="outline" className="w-full">
              Saltar y volver a actividades
            </Button>
          </Box>
        )}
      </main>
    </Container>
  );
}
