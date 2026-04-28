'use client';

import { useEffect, useRef, useState } from 'react';
import { ImageUp, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

type Props = {
  activityId: string;
  currentImageUrl?: string;
  onSuccess?: () => void;
};

export default function ActivityImageUpload({
  activityId,
  currentImageUrl,
  onSuccess,
}: Props) {
  const [hasCurrentImage, setHasCurrentImage] = useState(!!currentImageUrl);
  const [imageVersion, setImageVersion] = useState<number>(Date.now());
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHasCurrentImage(!!currentImageUrl);
    setImageVersion(Date.now());
  }, [currentImageUrl]);

  const uploadFile = async (file: File) => {
    setError('');
    setMessage('');
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch(`/api/activities/${activityId}/image`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || 'Upload failed');
      }
      await res.json().catch(() => null);
      setHasCurrentImage(true);
      setImageVersion(Date.now());
      setMessage('Imagen actualizada');
      onSuccess?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo subir la imagen'
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await uploadFile(file);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    await uploadFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDelete = async () => {
    if (!hasCurrentImage) return;

    setError('');
    setMessage('');
    setIsUploading(true);
    try {
      const res = await fetch(`/api/activities/${activityId}/image`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || 'Delete failed');
      }
      setHasCurrentImage(false);
      setImageVersion(Date.now());
      setMessage('Imagen eliminada');
      onSuccess?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo eliminar la imagen'
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div
        className={`relative mx-auto flex h-48 w-48 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed transition-colors ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/30 bg-muted/30'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {hasCurrentImage ? (
          <div className="relative h-full w-full">
            <Image
              src={`/api/activities/${activityId}/image?v=${imageVersion}`}
              alt="Imagen de actividad"
              fill
              unoptimized
              className="object-cover"
              sizes="192px"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageUp className="h-8 w-8" />
            <p className="text-center text-sm">Arrastra una imagen aquí</p>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <ImageUp className="mr-2 h-4 w-4" />
            Seleccionar imagen
          </Button>
          {hasCurrentImage && (
            <Button
              type="button"
              variant="outline"
              onClick={handleDelete}
              disabled={isUploading}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar imagen
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          La imagen se guarda en Vercel Blob. Máximo 5 MB.
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {isUploading && (
        <p className="text-sm text-muted-foreground">Subiendo imagen...</p>
      )}
      {message && <p className="text-sm text-success">{message}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
