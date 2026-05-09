'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { FileVideo, ImageUp, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ActivityMediaItem = {
  id: string;
  type: 'IMAGE' | 'VIDEO';
  fileName: string | null;
  sortOrder: number;
};

type Props = {
  activityId: string;
  initialMedia: ActivityMediaItem[];
};

export default function ActivityMediaManager({
  activityId,
  initialMedia,
}: Props) {
  const [media, setMedia] = useState(initialMedia);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function uploadFiles(files: FileList | File[]) {
    const selectedFiles = Array.from(files).filter((file) => file.size > 0);
    if (selectedFiles.length === 0) return;

    setError('');
    setMessage('');
    setIsUploading(true);

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append('media', file));

      const response = await fetch(`/api/activities/${activityId}/media`, {
        method: 'POST',
        body: formData,
      });

      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.error || 'No se pudieron subir los archivos');
      }

      setMedia((current) => [...current, ...(body?.media ?? [])]);
      setMessage('Galería actualizada');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudieron subir los archivos'
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function deleteMedia(mediaId: string) {
    setError('');
    setMessage('');
    setDeletingId(mediaId);

    try {
      const response = await fetch(
        `/api/activities/${activityId}/media/${mediaId}`,
        { method: 'DELETE' }
      );
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.error || 'No se pudo borrar el archivo');
      }

      setMedia((current) => current.filter((item) => item.id !== mediaId));
      setMessage('Archivo eliminado');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo borrar el archivo'
      );
    } finally {
      setDeletingId(null);
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    uploadFiles(event.dataTransfer.files);
  }

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        className={`rounded-lg border-2 border-dashed p-6 transition ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border bg-muted/20'
        }`}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="rounded-full bg-primary/10 p-3 text-primary">
            <ImageUp className="h-6 w-6" />
          </div>
          <div>
            <p className="font-medium">Sumá fotos y videos a la galería</p>
            <p className="text-sm text-muted-foreground">
              Arrastrá archivos acá o seleccioná varios desde tu dispositivo.
              Imágenes hasta 8 MB y videos hasta 80 MB.
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            className="hidden"
            onChange={(event) => {
              const files = event.target.files;
              event.target.value = '';
              if (files) uploadFiles(files);
            }}
          />
          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? 'Subiendo...' : 'Seleccionar archivos'}
          </Button>
        </div>
      </div>

      {message && <p className="text-sm text-success">{message}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {media.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {media.map((item) => {
            const mediaUrl = `/api/activities/${activityId}/media/${item.id}`;
            return (
              <article
                key={item.id}
                className="overflow-hidden rounded-lg border bg-card shadow-sm"
              >
                <div className="relative aspect-video bg-muted">
                  {item.type === 'IMAGE' ? (
                    <Image
                      src={mediaUrl}
                      alt={item.fileName ?? 'Imagen de actividad'}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <video
                      src={mediaUrl}
                      controls
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0 text-sm">
                    <p className="flex items-center gap-2 font-medium">
                      {item.type === 'VIDEO' && (
                        <FileVideo className="h-4 w-4" />
                      )}
                      <span className="truncate">
                        {item.fileName ||
                          (item.type === 'IMAGE' ? 'Imagen' : 'Video')}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.type === 'IMAGE' ? 'Foto' : 'Video'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    className="px-3 py-2"
                    onClick={() => deleteMedia(item.id)}
                    disabled={deletingId === item.id}
                    aria-label="Eliminar archivo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
          Todavía no hay fotos ni videos adicionales para esta actividad.
        </div>
      )}
    </div>
  );
}
