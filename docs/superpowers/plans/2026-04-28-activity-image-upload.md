# Activity Image Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add image upload capability to activities via Vercel Blob, allowing admins to upload files directly during creation and editing.

**Architecture:** Three-layer approach: (1) Utility for MIME type handling, (2) API endpoint for upload/delete with Vercel Blob integration, (3) React component mirroring ProfilePhotoUpload, integrated into create/edit pages.

**Tech Stack:** Next.js 14, React 18, TypeScript, Vercel Blob SDK, TailwindCSS

---

## File Structure

```
src/
├── lib/
│   └── image-utils.ts                          [NEW] MIME → extension mapping
├── app/
│   ├── api/
│   │   └── activities/
│   │       └── [id]/
│   │           └── image/
│   │               └── route.ts                [NEW] POST/DELETE endpoints
│   └── activities/
│       ├── activity-image-upload.tsx           [NEW] Upload component
│       ├── new/
│       │   └── page.tsx                        [MODIFY] Add upload flow
│       └── [id]/
│           └── edit/
│               └── page.tsx                    [MODIFY] Add upload component
```

---

## Task 1: Create Image Utility Helper with Tests

**Files:**
- Create: `src/lib/image-utils.ts`
- Create: `src/lib/__tests__/image-utils.test.ts`

### Step 1: Write failing test for `extensionFor`

Create `src/lib/__tests__/image-utils.test.ts`:

```typescript
import { extensionFor } from '../image-utils';

describe('extensionFor', () => {
  it('returns .jpg for image/jpeg', () => {
    const file = new File([], 'test.jpg', { type: 'image/jpeg' });
    expect(extensionFor(file)).toBe('.jpg');
  });

  it('returns .png for image/png', () => {
    const file = new File([], 'test.png', { type: 'image/png' });
    expect(extensionFor(file)).toBe('.png');
  });

  it('returns .webp for image/webp', () => {
    const file = new File([], 'test.webp', { type: 'image/webp' });
    expect(extensionFor(file)).toBe('.webp');
  });

  it('returns .gif for image/gif', () => {
    const file = new File([], 'test.gif', { type: 'image/gif' });
    expect(extensionFor(file)).toBe('.gif');
  });

  it('returns .avif for image/avif', () => {
    const file = new File([], 'test.avif', { type: 'image/avif' });
    expect(extensionFor(file)).toBe('.avif');
  });

  it('returns .heic for image/heic', () => {
    const file = new File([], 'test.heic', { type: 'image/heic' });
    expect(extensionFor(file)).toBe('.heic');
  });

  it('returns .heif for image/heif', () => {
    const file = new File([], 'test.heif', { type: 'image/heif' });
    expect(extensionFor(file)).toBe('.heif');
  });

  it('falls back to file extension if unknown MIME type', () => {
    const file = new File([], 'test.xyz', { type: 'application/unknown' });
    expect(extensionFor(file)).toBe('.xyz');
  });

  it('returns .jpg fallback if no file extension and unknown MIME', () => {
    const file = new File([], 'test', { type: 'application/unknown' });
    expect(extensionFor(file)).toBe('.jpg');
  });

  it('handles image/jpg alias for jpeg', () => {
    const file = new File([], 'test.jpg', { type: 'image/jpg' });
    expect(extensionFor(file)).toBe('.jpg');
  });
});
```

### Step 2: Run test to verify it fails

```bash
npm test -- src/lib/__tests__/image-utils.test.ts
```

Expected output: `FAIL` — function not defined.

### Step 3: Write minimal implementation

Create `src/lib/image-utils.ts`:

```typescript
export function extensionFor(file: File): string {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/avif': '.avif',
    'image/heic': '.heic',
    'image/heif': '.heif',
  };

  const fallback = file.name.includes('.')
    ? file.name.slice(file.name.lastIndexOf('.'))
    : '';

  return mimeToExt[file.type] ?? (fallback || '.jpg');
}
```

### Step 4: Run test to verify it passes

```bash
npm test -- src/lib/__tests__/image-utils.test.ts
```

Expected: `PASS` — all 10 tests pass.

### Step 5: Commit

```bash
git add src/lib/image-utils.ts src/lib/__tests__/image-utils.test.ts
git commit -m "feat: add image MIME type to extension utility"
```

---

## Task 2: Create API Endpoint - POST Image Upload

**Files:**
- Create: `src/app/api/activities/[id]/image/route.ts`
- Create: `src/app/api/activities/__tests__/image.test.ts`

### Step 1: Write failing test for POST upload

Create `src/app/api/activities/__tests__/image.test.ts`:

```typescript
import { POST } from '../[id]/image/route';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import * as blob from '@vercel/blob';

jest.mock('next-auth');
jest.mock('@vercel/blob');
jest.mock('@/lib/prisma');

describe('POST /api/activities/[id]/image', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 if not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce(null);

    const req = new Request('http://localhost/api/activities/123/image', {
      method: 'POST',
    });

    const res = await POST(req, { params: { id: '123' } });
    expect(res.status).toBe(401);
  });

  it('returns 401 if not admin', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: { id: 'user1', role: 'MEMBER' },
    });

    const req = new Request('http://localhost/api/activities/123/image', {
      method: 'POST',
    });

    const res = await POST(req, { params: { id: '123' } });
    expect(res.status).toBe(401);
  });

  it('returns 400 if no file provided', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: { id: 'user1', role: 'ADMIN' },
    });

    const formData = new FormData();
    const req = new Request('http://localhost/api/activities/123/image', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req, { params: { id: '123' } });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('No se recibió');
  });

  it('returns 400 if file is not an image', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: { id: 'user1', role: 'ADMIN' },
    });

    const formData = new FormData();
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    formData.append('image', file);

    const req = new Request('http://localhost/api/activities/123/image', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req, { params: { id: '123' } });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('debe ser una imagen');
  });

  it('returns 400 if file is larger than 5MB', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: { id: 'user1', role: 'ADMIN' },
    });

    const formData = new FormData();
    const largeBuffer = new ArrayBuffer(6 * 1024 * 1024);
    const file = new File([largeBuffer], 'test.jpg', { type: 'image/jpeg' });
    formData.append('image', file);

    const req = new Request('http://localhost/api/activities/123/image', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req, { params: { id: '123' } });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('debe pesar menos');
  });

  it('returns 404 if activity not found', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: { id: 'user1', role: 'ADMIN' },
    });
    (prisma.activity.findUnique as jest.Mock).mockResolvedValueOnce(null);

    const formData = new FormData();
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    formData.append('image', file);

    const req = new Request('http://localhost/api/activities/123/image', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req, { params: { id: '123' } });
    expect(res.status).toBe(404);
  });

  it('successfully uploads image to blob and updates activity', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: { id: 'user1', role: 'ADMIN' },
    });
    (prisma.activity.findUnique as jest.Mock).mockResolvedValueOnce({
      id: '123',
      image: null,
    });
    (blob.put as jest.Mock).mockResolvedValueOnce({
      url: 'https://blob.vercelusercontent.com/activity-images/123/uuid.jpg',
    });
    (prisma.activity.update as jest.Mock).mockResolvedValueOnce({
      id: '123',
      image: 'https://blob.vercelusercontent.com/activity-images/123/uuid.jpg',
    });

    const formData = new FormData();
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    formData.append('image', file);

    const req = new Request('http://localhost/api/activities/123/image', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req, { params: { id: '123' } });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(blob.put).toHaveBeenCalled();
    expect(prisma.activity.update).toHaveBeenCalled();
  });

  it('deletes old image when replacing', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: { id: 'user1', role: 'ADMIN' },
    });
    (prisma.activity.findUnique as jest.Mock).mockResolvedValueOnce({
      id: '123',
      image: 'https://blob.vercelusercontent.com/old/image.jpg',
    });
    (blob.put as jest.Mock).mockResolvedValueOnce({
      url: 'https://blob.vercelusercontent.com/activity-images/123/new.jpg',
    });
    (prisma.activity.update as jest.Mock).mockResolvedValueOnce({
      id: '123',
      image: 'https://blob.vercelusercontent.com/activity-images/123/new.jpg',
    });

    const formData = new FormData();
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    formData.append('image', file);

    const req = new Request('http://localhost/api/activities/123/image', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req, { params: { id: '123' } });
    expect(res.status).toBe(200);
    expect(blob.del).toHaveBeenCalledWith(
      'https://blob.vercelusercontent.com/old/image.jpg'
    );
  });
});
```

### Step 2: Run test to verify it fails

```bash
npm test -- src/app/api/activities/__tests__/image.test.ts --testNamePattern="POST"
```

Expected: Multiple FAILs — file not found.

### Step 3: Write POST endpoint implementation

Create `src/app/api/activities/[id]/image/route.ts`:

```typescript
import { del, put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { extensionFor } from '@/lib/image-utils';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('image');

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: 'No se recibió ninguna imagen' },
      { status: 400 }
    );
  }

  if (!file.type.startsWith('image/')) {
    return NextResponse.json(
      { error: 'El archivo debe ser una imagen' },
      { status: 400 }
    );
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: 'La imagen debe pesar menos de 5 MB' },
      { status: 400 }
    );
  }

  const activity = await prisma.activity.findUnique({
    where: { id: params.id },
    select: { image: true },
  });

  if (!activity) {
    return NextResponse.json(
      { error: 'Actividad no encontrada' },
      { status: 404 }
    );
  }

  const pathname = `activity-images/${params.id}/${crypto.randomUUID()}${extensionFor(file)}`;
  const blob = await put(pathname, file, {
    access: 'public',
    contentType: file.type,
  });

  try {
    await prisma.activity.update({
      where: { id: params.id },
      data: { image: blob.url },
    });
  } catch {
    await del(blob.url).catch(() => undefined);
    return NextResponse.json(
      { error: 'No se pudo guardar la imagen' },
      { status: 500 }
    );
  }

  if (activity.image) {
    await del(activity.image).catch(() => undefined);
  }

  return NextResponse.json({ ok: true });
}
```

### Step 4: Run test to verify it passes

```bash
npm test -- src/app/api/activities/__tests__/image.test.ts --testNamePattern="POST"
```

Expected: All POST tests pass.

### Step 5: Commit

```bash
git add src/app/api/activities/[id]/image/route.ts src/app/api/activities/__tests__/image.test.ts
git commit -m "feat: add POST endpoint for activity image upload"
```

---

## Task 3: Create API Endpoint - DELETE Image

**Files:**
- Modify: `src/app/api/activities/[id]/image/route.ts`
- Modify: `src/app/api/activities/__tests__/image.test.ts`

### Step 1: Add DELETE tests to existing test file

Add to `src/app/api/activities/__tests__/image.test.ts`:

```typescript
describe('DELETE /api/activities/[id]/image', () => {
  it('returns 401 if not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce(null);

    const req = new Request('http://localhost/api/activities/123/image', {
      method: 'DELETE',
    });

    const res = await DELETE(req, { params: { id: '123' } });
    expect(res.status).toBe(401);
  });

  it('returns 401 if not admin', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: { id: 'user1', role: 'MEMBER' },
    });

    const req = new Request('http://localhost/api/activities/123/image', {
      method: 'DELETE',
    });

    const res = await DELETE(req, { params: { id: '123' } });
    expect(res.status).toBe(401);
  });

  it('returns 404 if activity not found', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: { id: 'user1', role: 'ADMIN' },
    });
    (prisma.activity.findUnique as jest.Mock).mockResolvedValueOnce(null);

    const req = new Request('http://localhost/api/activities/123/image', {
      method: 'DELETE',
    });

    const res = await DELETE(req, { params: { id: '123' } });
    expect(res.status).toBe(404);
  });

  it('returns 404 if activity has no image', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: { id: 'user1', role: 'ADMIN' },
    });
    (prisma.activity.findUnique as jest.Mock).mockResolvedValueOnce({
      id: '123',
      image: null,
    });

    const req = new Request('http://localhost/api/activities/123/image', {
      method: 'DELETE',
    });

    const res = await DELETE(req, { params: { id: '123' } });
    expect(res.status).toBe(404);
  });

  it('successfully deletes image from blob and updates activity', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: { id: 'user1', role: 'ADMIN' },
    });
    (prisma.activity.findUnique as jest.Mock).mockResolvedValueOnce({
      id: '123',
      image: 'https://blob.vercelusercontent.com/activity-images/123/uuid.jpg',
    });
    (blob.del as jest.Mock).mockResolvedValueOnce(undefined);
    (prisma.activity.update as jest.Mock).mockResolvedValueOnce({
      id: '123',
      image: null,
    });

    const req = new Request('http://localhost/api/activities/123/image', {
      method: 'DELETE',
    });

    const res = await DELETE(req, { params: { id: '123' } });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(blob.del).toHaveBeenCalledWith(
      'https://blob.vercelusercontent.com/activity-images/123/uuid.jpg'
    );
    expect(prisma.activity.update).toHaveBeenCalledWith({
      where: { id: '123' },
      data: { image: null },
    });
  });
});
```

### Step 2: Run DELETE tests to verify they fail

```bash
npm test -- src/app/api/activities/__tests__/image.test.ts --testNamePattern="DELETE"
```

Expected: Multiple FAILs — function not defined.

### Step 3: Add DELETE handler to route.ts

Add to `src/app/api/activities/[id]/image/route.ts`:

```typescript
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const activity = await prisma.activity.findUnique({
    where: { id: params.id },
    select: { image: true },
  });

  if (!activity || !activity.image) {
    return NextResponse.json(
      { error: 'Imagen no encontrada' },
      { status: 404 }
    );
  }

  await del(activity.image).catch(() => undefined);

  await prisma.activity.update({
    where: { id: params.id },
    data: { image: null },
  });

  return NextResponse.json({ ok: true });
}
```

### Step 4: Run all tests to verify they pass

```bash
npm test -- src/app/api/activities/__tests__/image.test.ts
```

Expected: All tests pass (POST + DELETE combined).

### Step 5: Commit

```bash
git add src/app/api/activities/[id]/image/route.ts src/app/api/activities/__tests__/image.test.ts
git commit -m "feat: add DELETE endpoint for activity image removal"
```

---

## Task 4: Create ActivityImageUpload Component

**Files:**
- Create: `src/app/activities/activity-image-upload.tsx`

### Step 1: Review ProfilePhotoUpload for reference pattern

```bash
cat src/app/profile/profile-photo-upload.tsx | head -100
```

Note: Component is client-side, uses hooks (useState, useRef, useEffect), file input + drag-drop pattern, loading states, error/success messages.

### Step 2: Create ActivityImageUpload component

Create `src/app/activities/activity-image-upload.tsx`:

```typescript
'use client';

import { useEffect, useRef, useState } from 'react';
import { ImageUp, Trash2, X } from 'lucide-react';
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
  const [currentUrl, setCurrentUrl] = useState(currentImageUrl);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const json = await res.json();
      setHasCurrentImage(true);
      setCurrentUrl(json.url || currentImageUrl);
      setMessage('Imagen actualizada');
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir la imagen');
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      await uploadFile(file);
    } else {
      setError('Por favor arrastra una imagen válida');
    }
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
      setCurrentUrl(undefined);
      setMessage('Imagen eliminada');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar la imagen');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Image Preview */}
      <div className="mx-auto flex h-48 w-full max-w-sm items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30">
        {hasCurrentImage && currentUrl ? (
          <div className="relative h-full w-full">
            <Image
              src={currentUrl}
              alt="Imagen de actividad"
              fill
              unoptimized
              className="object-cover"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <ImageUp className="h-8 w-8" />
            <span className="text-sm">Arrastra una imagen aquí</span>
          </div>
        )}
      </div>

      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 text-center transition hover:border-muted-foreground/50"
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            O haz clic para seleccionar una imagen
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              variant="outline"
            >
              <ImageUp className="mr-2 h-4 w-4" />
              Seleccionar imagen
            </Button>
            {hasCurrentImage && (
              <Button
                type="button"
                onClick={handleDelete}
                disabled={isUploading}
                variant="destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar imagen
              </Button>
            )}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Messages */}
      <div className="text-xs text-muted-foreground">
        <p>La imagen se guarda en Vercel Blob. Máximo 5 MB.</p>
      </div>

      {isUploading && (
        <p className="text-sm text-muted-foreground">Subiendo imagen...</p>
      )}
      {message && <p className="text-sm text-green-600">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
```

### Step 3: Verify component builds

```bash
npm run build 2>&1 | grep -i "activity-image-upload"
```

Expected: No errors for this component.

### Step 4: Commit

```bash
git add src/app/activities/activity-image-upload.tsx
git commit -m "feat: add ActivityImageUpload component with drag-drop and delete"
```

---

## Task 5: Integrate Upload Component into Create Activity Page

**Files:**
- Modify: `src/app/activities/new/page.tsx`

### Step 1: Read current page to understand structure

```bash
cat src/app/activities/new/page.tsx
```

### Step 2: Modify the page to show upload after creation

Edit `src/app/activities/new/page.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import CreateActivityForm from './form';
import ActivityImageUpload from '../activity-image-upload';

type ProfessorOption = {
  id: string;
  name: string | null;
  lastName: string | null;
  email: string;
};

interface CreateActivityPageProps {
  searchParams: { professors?: string };
}

export default function CreateActivityPage({
  searchParams,
}: CreateActivityPageProps) {
  const [createdActivityId, setCreatedActivityId] = useState<string | null>(null);
  const router = useRouter();

  const handleActivityCreated = (activityId: string) => {
    setCreatedActivityId(activityId);
  };

  const handleImageUploadComplete = () => {
    router.push('/activities');
    router.refresh();
  };

  if (createdActivityId) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-8 px-4">
        <div>
          <h1 className="text-3xl font-bold">Subir imagen de actividad</h1>
          <p className="mt-2 text-muted-foreground">
            La imagen es opcional. Puedes saltarla o volver después.
          </p>
        </div>

        <ActivityImageUpload
          activityId={createdActivityId}
          onSuccess={handleImageUploadComplete}
        />

        <button
          onClick={() => {
            router.push('/activities');
            router.refresh();
          }}
          className="text-sm text-blue-600 hover:underline"
        >
          Saltar y volver a actividades
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8 px-4">
      <div>
        <h1 className="text-3xl font-bold">Nueva actividad</h1>
        <p className="mt-2 text-muted-foreground">
          Crea una actividad. La imagen se puede subir después.
        </p>
      </div>
      <CreateActivityForm onSuccess={handleActivityCreated} />
    </div>
  );
}
```

### Step 3: Modify form to pass onSuccess callback

Edit `src/app/activities/new/form.tsx` — change signature and callback:

Replace the form component signature:

```typescript
interface CreateActivityFormProps {
  professors: ProfessorOption[];
  onSuccess?: (activityId: string) => void;
}

export default function CreateActivityForm({
  professors,
  onSuccess,
}: CreateActivityFormProps) {
```

Inside `handleSubmit`, after successful creation, call:

```typescript
const json = await res.json();
onSuccess?.(json.id); // Pass the created activity ID
setSuccess('Actividad creada');
// Remove the setTimeout router.push
```

### Step 4: Run build to verify

```bash
npm run build
```

Expected: No errors.

### Step 5: Commit

```bash
git add src/app/activities/new/page.tsx src/app/activities/new/form.tsx
git commit -m "feat: integrate ActivityImageUpload into create activity flow"
```

---

## Task 6: Integrate Upload Component into Edit Activity Page

**Files:**
- Modify: `src/app/activities/[id]/edit/page.tsx`

### Step 1: Read current edit page

```bash
cat src/app/activities/[id]/edit/page.tsx
```

### Step 2: Modify page to include upload component below form

Edit `src/app/activities/[id]/edit/page.tsx`:

Add import at top:

```typescript
import ActivityImageUpload from '../../activity-image-upload';
```

Add component below the form:

```typescript
export default function EditActivityPage({
  params,
}: {
  params: { id: string };
}) {
  // ... existing code

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8 px-4">
      <div>
        <h1 className="text-3xl font-bold">Editar actividad</h1>
      </div>

      <EditActivityForm activity={activity} professors={professors} />

      <div className="border-t pt-6">
        <h2 className="text-xl font-bold mb-4">Imagen de la actividad</h2>
        <ActivityImageUpload
          activityId={params.id}
          currentImageUrl={activity.image ?? undefined}
        />
      </div>
    </div>
  );
}
```

### Step 3: Verify build

```bash
npm run build
```

Expected: No errors.

### Step 4: Commit

```bash
git add src/app/activities/[id]/edit/page.tsx
git commit -m "feat: integrate ActivityImageUpload into edit activity page"
```

---

## Task 7: Manual E2E Testing

**Steps to verify behavior:**

### Step 1: Start dev server

```bash
npm run dev
```

Wait for "ready on http://localhost:3000".

### Step 2: Test create activity with image

1. Navigate to `/activities/new`
2. Fill in activity form (name, price, etc.)
3. Click "Guardar"
4. Verify upload component appears
5. Drag or select a `.jpg` file (< 5 MB)
6. Verify success message "Imagen actualizada"
7. Navigate to `/activities` and verify activity exists

### Step 3: Test edit activity image

1. Navigate to `/activities/[id]/edit` (use any activity ID)
2. Scroll to "Imagen de la actividad" section
3. If image exists, verify it displays
4. Click "Seleccionar imagen"
5. Select a `.png` file
6. Verify success message
7. Refresh page and verify new image persists

### Step 4: Test image deletion

1. On edit page, click "Eliminar imagen"
2. Verify success message
3. Verify image placeholder appears
4. Refresh page and verify image is gone

### Step 5: Test permission restriction

1. Log out or use an incognito window as MEMBER
2. Try to access `/activities/new`
3. Verify redirected to login or access denied

### Step 6: Test file validation

1. On create page, try to upload:
   - PDF file → verify error "debe ser una imagen"
   - 10 MB image → verify error "debe pesar menos de 5 MB"
   - Valid image → verify success

### Step 7: Commit test results

After manual testing passes:

```bash
git log --oneline -10
```

Verify all commits are present.

---

## Verification Checklist

Before marking complete, verify:

- ✅ All unit tests pass: `npm test -- src/lib/__tests__/image-utils.test.ts`
- ✅ All API tests pass: `npm test -- src/app/api/activities/__tests__/image.test.ts`
- ✅ Build succeeds: `npm run build`
- ✅ No TypeScript errors: `npm run lint`
- ✅ Create activity → image upload → displays correctly
- ✅ Edit activity → change image → old blob deleted
- ✅ Delete image → clears DB and blob
- ✅ Non-admin cannot upload (401)
- ✅ Invalid file types rejected (400)
- ✅ File size > 5 MB rejected (400)

---

## Notes

- Image URLs stored in DB are Vercel Blob URLs (public access for display)
- Old images are automatically cleaned up from Vercel Blob when replaced
- Component is reusable — can be integrated elsewhere if needed
- No Prisma schema changes required
