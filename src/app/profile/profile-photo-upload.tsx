'use client';

import { useEffect, useRef, useState } from 'react';
import { CameraIcon, UploadIcon, Cross1Icon } from '@radix-ui/react-icons';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

type Props = {
  hasPhoto: boolean;
  photoVersion: number;
  name: string | null;
  lastName: string | null;
};

export default function ProfilePhotoUpload({
  hasPhoto,
  photoVersion,
  name,
  lastName,
}: Props) {
  const [hasCurrentPhoto, setHasCurrentPhoto] = useState(hasPhoto);
  const [currentPhotoVersion, setCurrentPhotoVersion] = useState(photoVersion);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const router = useRouter();

  useEffect(() => {
    setHasCurrentPhoto(hasPhoto);
  }, [hasPhoto]);

  useEffect(() => {
    setCurrentPhotoVersion(photoVersion);
  }, [photoVersion]);

  useEffect(() => {
    if (!isCameraOpen) return;

    let active = true;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        setError('No se pudo abrir la cámara');
        setIsCameraOpen(false);
      }
    }

    startCamera();

    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [isCameraOpen]);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const uploadFile = async (file: File) => {
    setError('');
    setMessage('');
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const res = await fetch('/api/profile/photo', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || 'Upload failed');
      }
      await res.json().catch(() => null);
      setHasCurrentPhoto(true);
      setCurrentPhotoVersion(Date.now());
      setMessage('Foto actualizada');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir la foto');
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

  const handleCapture = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setError('La cámara todavía no está lista');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      setError('No se pudo procesar la foto');
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          setError('No se pudo generar la foto');
          return;
        }
        const file = new File([blob], `profile-photo-${Date.now()}.jpg`, {
          type: 'image/jpeg',
        });
        stopCamera();
        setIsCameraOpen(false);
        await uploadFile(file);
      },
      'image/jpeg',
      0.92
    );
  };

  const initials = `${name?.[0] ?? ''}${lastName?.[0] ?? ''}`.trim() || 'P';

  return (
    <div className="space-y-4">
      <div className="mx-auto flex h-40 w-40 items-center justify-center overflow-hidden rounded-full border bg-muted/30 shadow-sm">
        {hasCurrentPhoto ? (
          <div className="relative h-full w-full">
            <Image
              src={`/api/profile/photo?v=${currentPhotoVersion}`}
              alt="Foto de perfil"
              fill
              unoptimized
              className="object-cover"
              sizes="160px"
            />
          </div>
        ) : (
          <span className="text-4xl font-bold tracking-tight text-muted-foreground">
            {initials}
          </span>
        )}
      </div>

      {isCameraOpen ? (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-2xl border bg-black shadow-sm">
            <video
              ref={videoRef}
              className="aspect-square w-full object-cover"
              playsInline
              muted
              autoPlay
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={handleCapture}
              disabled={isUploading}
            >
              <CameraIcon className="mr-2 h-4 w-4" />
              Tomar foto
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                stopCamera();
                setIsCameraOpen(false);
              }}
              disabled={isUploading}
            >
              <Cross1Icon className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => setIsCameraOpen(true)}
              disabled={isUploading}
            >
              <CameraIcon className="mr-2 h-4 w-4" />
              Usar cámara
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <UploadIcon className="mr-2 h-4 w-4" />
              Subir foto
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            La imagen queda guardada en Vercel Blob y se usa como foto de
            perfil.
          </p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={handleFileChange}
      />

      {isUploading && (
        <p className="text-sm text-muted-foreground">Subiendo foto...</p>
      )}
      {message && <p className="text-sm text-success">{message}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
