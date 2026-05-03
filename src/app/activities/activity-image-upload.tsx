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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isUploading}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar imagen
              </Button>
              {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <div className="bg-card rounded-lg shadow-lg max-w-sm w-full p-6">
                    <h2 className="text-lg font-semibold mb-2">Eliminar imagen</h2>
                    <p className="text-muted-foreground mb-6">
                      ¿Estás seguro de que querés eliminar la imagen de la actividad? Esta acción no se puede deshacer.
                    </p>
                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        disabled={isUploading}
                        className="px-4 py-2 rounded-full border border-border hover:bg-muted transition-colors text-sm font-medium disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={async () => { setShowDeleteConfirm(false); await handleDelete(); }}
                        disabled={isUploading}
                        className="px-4 py-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
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
