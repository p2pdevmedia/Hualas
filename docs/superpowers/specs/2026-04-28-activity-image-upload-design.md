# Activity Image Upload Design

**Date:** 2026-04-28  
**Scope:** Add image upload capability to activities using Vercel Blob, following the existing pattern used for profile photos.

## Overview

Currently, activities store image URLs entered manually as text. This design adds file upload capability via Vercel Blob, allowing admins to upload images directly when creating or editing activities.

## Design Decisions

### Approach: Separate Upload Component (Post-Creation)

- Create activity first, then upload image via dedicated component
- Follows existing `ProfilePhotoUpload` pattern
- Modular, low risk, reusable

### Who Can Upload

- Only `ADMIN` and `SUPER_ADMIN` roles
- Enforced at API layer with auth check

### Image Constraints

- **Supported formats:** JPEG, PNG, WebP, GIF, AVIF
- **Max size:** 5 MB
- **Storage location:** Vercel Blob at `activity-images/{activityId}/{uuid}.{ext}`
- **Single image:** One image per activity (replaces previous)

## Implementation Components

### 1. Database Schema (No Changes)

The `Activity.image` field already exists as `String?` and will continue to store the Vercel Blob URL.

```prisma
model Activity {
  // ... existing fields
  image       String?
  // ... rest of schema
}
```

### 2. API Endpoint: POST/DELETE `/api/activities/[id]/image`

**File:** `src/app/api/activities/[id]/image/route.ts`

#### POST - Upload Image

- **Auth:** ADMIN or SUPER_ADMIN only
- **Input:** FormData with `image` file
- **Validation:**
  - File must be present
  - MIME type must be `image/*`
  - Size must be ≤ 5 MB
- **Process:**
  1. Verify activity exists
  2. Upload file to Vercel Blob at `activity-images/{activityId}/{uuid}.{ext}`
  3. Delete old image URL from Vercel Blob if it exists
  4. Update `Activity.image` in database with new Blob URL
  5. Return `{ ok: true }`
- **Error Responses:**
  - 401 if unauthorized
  - 404 if activity not found
  - 400 if validation fails (no file, wrong type, too large)
  - 500 if database/blob operation fails

#### DELETE - Remove Image

- **Auth:** ADMIN or SUPER_ADMIN only
- **Process:**
  1. Verify activity exists
  2. Delete Blob URL from Vercel
  3. Set `Activity.image` to null in database
  4. Return `{ ok: true }`
- **Error Responses:**
  - 401 if unauthorized
  - 404 if activity/image not found
  - 500 if operation fails

**Helper Function:**
Create a helper in `src/lib/image-utils.ts` (or add to existing utils):

```typescript
function extensionFor(file: File): string {
  // Map MIME types to extensions, matching profile photo pattern
  // Fallback to .jpg if unknown
}
```

### 3. Client Component: `ActivityImageUpload.tsx`

**File:** `src/app/activities/activity-image-upload.tsx`

A reusable component for uploading/removing activity images, similar to `ProfilePhotoUpload`.

**Props:**

```typescript
type Props = {
  activityId: string;
  currentImageUrl?: string;
  onSuccess?: () => void;
};
```

**Features:**

- Display current image or placeholder
- File input (click to select)
- Drag-and-drop support
- Loading state during upload
- Success/error messages
- Delete button (if image exists)
- Disabled state during upload

**UX Flow:**

1. Show current image or placeholder
2. User clicks or drags file → upload starts
3. Loading indicator appears
4. On success: image refreshes, success message displays
5. On error: error message displays, user can retry

### 4. Form Integration

#### Create Activity (`/activities/new/page.tsx`)

1. Render create form (unchanged)
2. After successful activity creation, display `ActivityImageUpload` component with the new activity ID
3. Image is optional—user can skip it

**Example structure:**

```typescript
{!activityId ? (
  <CreateActivityForm onSuccess={setActivityId} />
) : (
  <ActivityImageUpload activityId={activityId} onSuccess={...} />
)}
```

#### Edit Activity (`/activities/[id]/edit/page.tsx`)

1. Keep existing form (unchanged)
2. Add `ActivityImageUpload` component below the form
3. Allows independent image updates without re-saving other fields

### 5. Styling & UX

**Image Preview:**

- Use Next.js `Image` component with fixed size (e.g., 200×200px)
- Fallback placeholder (initials or icon)

**Buttons:**

- "Seleccionar imagen" (file input)
- "Eliminar imagen" (if image exists, red variant)
- Upload state: disable button + "Subiendo..."

**Messages:**

- Success: "Imagen actualizada"
- Error: specific error message from API

**Info Text:**

- "La imagen se guarda en Vercel Blob."

## Validation Rules

### Client-Side (UX only)

- File type hint on input (`accept="image/*"`)
- Optional size pre-check in JavaScript

### Server-Side (Enforced)

- MIME type must start with `image/`
- File size ≤ 5 MB (as with profile photos)
- Activity must exist and belong to accessible account

## Error Handling

All errors return JSON with descriptive Spanish messages:

- "No se recibió ninguna imagen"
- "El archivo debe ser una imagen"
- "La imagen debe pesar menos de 5 MB"
- "No se pudo guardar la imagen"
- "Actividad no encontrada"

## Testing Strategy

1. **Unit tests:**
   - File type validation logic
   - Extension mapping
   - Permission checks

2. **Integration tests:**
   - Upload file → check Blob URL in DB
   - Delete image → check Blob removed and DB cleared
   - Unauthorized access → 401
   - Large file → 400
   - Missing activity → 404

3. **Manual testing:**
   - Create activity → upload image → verify displays
   - Edit activity → change image → verify old is deleted
   - Delete image → verify blank state
   - Try upload without permission → verify blocked

## Files to Create/Modify

### New Files

- `src/app/api/activities/[id]/image/route.ts` — API endpoint
- `src/app/activities/activity-image-upload.tsx` — Upload component
- `src/lib/image-utils.ts` — Helper function (if needed)

### Modified Files

- `src/app/activities/new/page.tsx` — Add component display logic
- `src/app/activities/[id]/edit/page.tsx` — Add component

### No Changes Required

- `prisma/schema.prisma` — Field already exists
- Activity create/edit forms — Keep as-is

## Migration Path

No data migration needed. Existing `Activity.image` URLs will continue to work. After deployment, admins can re-upload images to replace manual URLs over time.

## Success Criteria

- ✅ Admins can upload images when creating activities
- ✅ Admins can change images when editing activities
- ✅ Images stored in Vercel Blob and URL saved in DB
- ✅ Old images deleted from Blob when replaced
- ✅ Delete button removes image cleanly
- ✅ All error states handled with clear messages
- ✅ Component reusable and follows project patterns
