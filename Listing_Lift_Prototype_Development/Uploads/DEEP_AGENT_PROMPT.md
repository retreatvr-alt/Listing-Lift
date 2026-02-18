# Implementation Instructions — 3 Features

Implement all 3 features below in order. Each feature is independent but should be implemented sequentially (Phase 1 → 2 → 3). After implementing all three, run the app and verify everything works.

---

## PHASE 1: Admin Per-Room Enhancement Settings

### 1.1 — Add Prisma Model

**File: `prisma/schema.prisma`**

Add this model at the end of the file (after the MagicLink model on line 88):

```prisma
model RoomEnhancementSettings {
  id                String   @id @default(cuid())
  roomKey           String   @unique
  defaultModel      String   @default("gpt-image-1.5")
  defaultIntensity  String   @default("Moderate")
  skyReplacement    Boolean  @default(false)
  bedFixing         Boolean  @default(false)
  windowRecovery    Boolean  @default(false)
  brightness        Boolean  @default(false)
  perspective       Boolean  @default(false)
  reflection        Boolean  @default(false)
  customPrompt      String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

Then run:
```bash
npx prisma migrate dev --name add_room_enhancement_settings
npx prisma generate
```

### 1.2 — Create Settings API Route

**File: `app/api/admin/settings/route.ts`** (NEW FILE)

Create GET and POST handlers:

- **GET**: Fetches all `RoomEnhancementSettings` from DB. Returns a merged list of ALL room keys (see list below) with DB values where they exist, and code defaults where they don't. Each item should include: `roomKey`, `defaultModel`, `defaultIntensity`, `skyReplacement`, `bedFixing`, `windowRecovery`, `brightness`, `perspective`, `reflection`, `customPrompt`, `hasDbRecord` (boolean).

- **POST**: Accepts a JSON body with `roomKey` + all settings fields. Uses Prisma `upsert` (where: { roomKey }, update: {...}, create: {...}).

Both endpoints must check authentication:
```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
// ...
const session = await getServerSession(authOptions);
if (!session) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

The complete list of room keys (these match the keys in `ROOM_PROMPTS` in `lib/enhancement-prompts.ts`):
```
"Kitchen", "Bedroom", "Living Spaces", "Living Room", "Dining Room/Dining Area",
"Bathroom", "Pool/Hot Tub", "Exterior", "Building Exterior", "Lawn/Backyard", "Miscellaneous"
```

Import defaults from:
```typescript
import { ROOM_PROMPTS } from "@/lib/enhancement-prompts";
import { DEFAULT_MODEL_ID } from "@/lib/model-configs";
```

### 1.3 — Create Admin Settings Page

**File: `app/admin/settings/page.tsx`** (NEW FILE)

Create a `"use client"` page that:

1. Fetches all settings from `GET /api/admin/settings` on mount
2. Displays each room as a collapsible/expandable card (use `useState` for open/closed state per room)
3. Each card contains:
   - **Model dropdown**: Options from `MODEL_OPTIONS` array (import from `@/lib/model-configs`): `gpt-image-1.5`, `flux-kontext`, `qwen-image-edit`, `magnific`
   - **Intensity dropdown**: `Light`, `Moderate`, `Significant`
   - **Toggle switches** (styled checkboxes): `skyReplacement`, `bedFixing`, `windowRecovery`, `brightness`, `perspective`, `reflection`
   - **Custom Prompt textarea**: 8 rows, placeholder "Leave empty to use default prompt". When empty, show the default prompt from `ROOM_PROMPTS[roomKey]` as grayed placeholder text
   - **Save button** per room (calls POST `/api/admin/settings` with that room's data)
   - **Reset to Defaults button** per room (resets local state to hardcoded defaults, does NOT auto-save)
4. Use `toast` from `sonner` for success/error messages (already installed in the project)
5. Check authentication on mount (same pattern as `app/admin/page.tsx` — fetch `/api/auth/session`, redirect to `/admin/login` if not authenticated)

**Styling must match existing admin theme:**
- Background: `bg-[#f9f7f4]`
- Cards: `bg-white rounded-xl shadow-md`
- Primary color: `#383D31` (dark green) for buttons, headers
- Use same header as admin dashboard (logo + title + sign out button)
- Add a "← Back to Dashboard" link that goes to `/admin`

**Group rooms visually:**
- Main rooms: Kitchen, Bedroom, Bathroom
- Living Spaces group: Living Spaces (parent), Living Room, Dining Room/Dining Area
- Outdoor group: Pool/Hot Tub, Exterior (parent), Building Exterior, Lawn/Backyard, Miscellaneous

### 1.4 — Add Settings Link to Admin Dashboard

**File: `app/admin/page.tsx`**

In the header section (around line 138, between the logo/title div and the Sign Out button), add a Settings link:

```tsx
<Link
  href="/admin/settings"
  className="flex items-center gap-2 text-gray-600 hover:text-[#383D31] transition-colors"
>
  <Sliders className="w-5 h-5" />
  <span className="hidden sm:inline">Settings</span>
</Link>
```

Import `Sliders` from lucide-react and `Link` from `next/link` (Link is already imported).

### 1.5 — Update Auto-Enhance to Use DB Settings

**File: `app/api/submissions/[id]/auto-enhance/route.ts`**

Before the photo processing loop (before line 46 `for (const photo of photos)`), add:

```typescript
// Fetch all room settings from DB (one query, not per-photo)
const roomSettings = await prisma.roomEnhancementSettings.findMany();
const settingsMap = new Map(roomSettings.map(s => [s.roomKey, s]));
```

Inside the loop, replace lines 59-62 (the prompt building section) with:

```typescript
const roomKey = photo.subCategory || photo.roomCategory;
const dbSettings = settingsMap.get(roomKey) || settingsMap.get(photo.roomCategory);

// Use custom prompt from DB if set, otherwise use code defaults
let prompt = dbSettings?.customPrompt || ROOM_PROMPTS[roomKey] || ROOM_PROMPTS[photo.roomCategory] || ROOM_PROMPTS["Kitchen"];

// Use DB intensity or default to Moderate
const intensity = dbSettings?.defaultIntensity || "Moderate";
prompt += INTENSITY_MODIFIERS[intensity];
```

Replace line 72 (model selection) with:
```typescript
model: dbSettings?.defaultModel || DEFAULT_MODEL_ID,
```

Update the EnhancementVersion creation (lines 166-174) to use the DB settings:
```typescript
intensity: intensity,
model: dbSettings?.defaultModel || DEFAULT_MODEL_ID,
skyReplacement: dbSettings?.skyReplacement || false,
bedFixing: dbSettings?.bedFixing || false,
windowRecovery: dbSettings?.windowRecovery || false,
brightness: dbSettings?.brightness || false,
perspective: dbSettings?.perspective || false,
reflection: dbSettings?.reflection || false,
```

### 1.6 — Update Manual Enhance UI to Load Room Defaults

**File: `app/admin/submissions/[id]/page.tsx`**

Add state for room settings (near line 91):
```typescript
const [roomSettingsMap, setRoomSettingsMap] = useState<Map<string, any>>(new Map());
```

Add a fetch for room settings in the existing initialization useEffect:
```typescript
// Fetch room-specific default settings
fetch('/api/admin/settings')
  .then(res => res.ok ? res.json() : null)
  .then(data => {
    if (data?.settings) {
      const map = new Map(data.settings.map((s: any) => [s.roomKey, s]));
      setRoomSettingsMap(map);
    }
  })
  .catch(err => console.error('Failed to fetch room settings:', err));
```

When a photo is selected (find the `setSelectedPhoto` call), also update `enhanceSettings` with room-specific defaults:
```typescript
// After setSelectedPhoto(photo), add:
const roomKey = photo.subCategory || photo.roomCategory;
const dbSettings = roomSettingsMap.get(roomKey) || roomSettingsMap.get(photo.roomCategory);
if (dbSettings) {
  setEnhanceSettings({
    intensity: dbSettings.defaultIntensity || 'Moderate',
    model: dbSettings.defaultModel || DEFAULT_MODEL_ID,
    skyReplacement: dbSettings.skyReplacement || false,
    bedFixing: dbSettings.bedFixing || false,
    windowRecovery: dbSettings.windowRecovery || false,
    brightness: dbSettings.brightness || false,
    perspective: dbSettings.perspective || false,
    reflection: dbSettings.reflection || false,
    additionalNotes: '',
    addTowels: false,
    smoothLinens: false,
    addToiletPaper: false
  });
}
```

---

## PHASE 2: Per-Room Photo Limits with Clear Messaging

### 2.1 — Update PhotoUploader Component

**File: `components/ui/photo-uploader.tsx`**

**Change 1**: Update default maxPhotos (line 32):
```typescript
maxPhotos = 10  // Was 60
```

**Change 2**: Add limit messaging to the drop zone (replace lines 235-236 with):
```tsx
<div className="mt-3 pt-3 border-t border-gray-200">
  <p className="text-sm font-semibold text-[#383D31]">
    Upload up to {maxPhotos} photos for this room
  </p>
  <p className="text-xs text-gray-500 mt-1">
    We recommend 4-8 photos per room
  </p>
</div>
```

**Change 3**: Improve the overflow handling in `handleFiles` (around line 92). Replace:
```typescript
if (photos.length + filesToProcess.length >= maxPhotos) break;
```
With:
```typescript
if (photos.length + filesToProcess.length >= maxPhotos) {
  const remainingSlots = maxPhotos - photos.length;
  alert(
    `You can only upload ${remainingSlots} more photo(s) for this room.\n\n` +
    `Maximum is ${maxPhotos} photos per room. ${files.length - i} file(s) were not added.`
  );
  break;
}
```

**Change 4**: Update the photo count display (lines 324-326). Replace with:
```tsx
<div className="text-sm text-center space-y-1">
  <p className="font-semibold text-gray-700">
    {photos.length} of {maxPhotos} photos uploaded
  </p>
  {photos.length > 0 && photos.length < 4 && (
    <p className="text-amber-600 text-xs">
      We recommend at least 4 photos for this room
    </p>
  )}
  {photos.length >= maxPhotos && (
    <p className="text-red-600 text-xs font-medium">
      Room photo limit reached
    </p>
  )}
</div>
```

### 2.2 — Update Submission Form

**File: `components/submission/submission-form.tsx`**

**Change 1**: Replace line 503 (the maxPhotos prop):
```typescript
maxPhotos={10}
```
(Was: `maxPhotos={60 - totalPhotos + (photosByRoom?.[roomCategory.id]?.length ?? 0)}`)

**Change 2**: Update the room upload text (line 455):
```typescript
<p className="text-gray-600 mt-2">Upload up to 10 {roomCategory.name.toLowerCase()} photos (4-8 recommended)</p>
```

### 2.3 — Update API Validation

**File: `app/api/submissions/route.ts`**

Replace lines 80-85 (the photo count validation) with:
```typescript
if (photos.length > 60) {
  return NextResponse.json(
    { error: "Maximum 60 photos allowed per submission" },
    { status: 400 }
  );
}

// Validate per-room limits
const photoCountByRoom: Record<string, number> = {};
for (const photo of photos) {
  const room = photo.roomCategory;
  photoCountByRoom[room] = (photoCountByRoom[room] || 0) + 1;
  if (photoCountByRoom[room] > 10) {
    return NextResponse.json(
      { error: `Maximum 10 photos per room. "${room}" has ${photoCountByRoom[room]}.` },
      { status: 400 }
    );
  }
}
```

---

## PHASE 3: One-at-a-Time Photo Caption Wizard + Bug Fix

### 3.1 — Create Caption Wizard Component

**File: `components/ui/photo-caption-wizard.tsx`** (NEW FILE)

Create a full-screen modal wizard component. Here is the complete implementation:

```tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { X, ChevronRight, Trash2, AlertTriangle } from "lucide-react";

interface PhotoFile {
  id: string;
  file: File;
  preview: string;
  caption: string;
  subCategory?: string;
  orientation: 'landscape' | 'portrait';
  isUploading?: boolean;
  cloud_storage_path?: string;
  fileName?: string;
  isConverting?: boolean;
}

interface PhotoCaptionWizardProps {
  photos: PhotoFile[];
  subcategories?: string[];
  onComplete: (captionedPhotos: PhotoFile[]) => void;
  onCancel: () => void;
  roomCategory: string;
}

export function PhotoCaptionWizard({
  photos,
  subcategories,
  onComplete,
  onCancel,
  roomCategory
}: PhotoCaptionWizardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [localPhotos, setLocalPhotos] = useState<PhotoFile[]>([...photos]);
  const [caption, setCaption] = useState('');
  const [subCategory, setSubCategory] = useState(subcategories?.[0] || '');
  const captionInputRef = useRef<HTMLInputElement>(null);

  const currentPhoto = localPhotos[currentIndex];
  const isLastPhoto = currentIndex === localPhotos.length - 1;
  const canProceed = caption.trim().length > 0;

  // Auto-focus caption input when photo changes
  useEffect(() => {
    setTimeout(() => captionInputRef.current?.focus(), 100);
  }, [currentIndex]);

  // Initialize caption/subcategory when index changes
  useEffect(() => {
    if (localPhotos[currentIndex]) {
      setCaption(localPhotos[currentIndex].caption || '');
      setSubCategory(localPhotos[currentIndex].subCategory || subcategories?.[0] || '');
    }
  }, [currentIndex, localPhotos, subcategories]);

  const handleNext = () => {
    // Save caption to current photo
    const updated = [...localPhotos];
    updated[currentIndex] = {
      ...updated[currentIndex],
      caption: caption.trim(),
      subCategory: subCategory || undefined
    };
    setLocalPhotos(updated);

    if (isLastPhoto) {
      onComplete(updated);
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && canProceed) {
      handleNext();
    }
  };

  const handleDelete = () => {
    const updated = localPhotos.filter((_, i) => i !== currentIndex);

    if (updated.length === 0) {
      onComplete([]);
      return;
    }

    const newIndex = currentIndex >= updated.length ? updated.length - 1 : currentIndex;
    setLocalPhotos(updated);
    setCurrentIndex(newIndex);
    setCaption(updated[newIndex]?.caption || '');
    setSubCategory(updated[newIndex]?.subCategory || subcategories?.[0] || '');
  };

  if (!currentPhoto) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#383D31] text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold">Add Photo Captions</h2>
            <p className="text-sm text-gray-300 mt-0.5">
              Photo {currentIndex + 1} of {localPhotos.length} — {roomCategory}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-white/70 hover:text-white transition-colors p-1"
            title="Cancel and discard uncaptioned photos"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-gray-200 flex-shrink-0">
          <div
            className="h-full bg-[#383D31] transition-all duration-300 ease-out"
            style={{ width: `${((currentIndex + 1) / localPhotos.length) * 100}%` }}
          />
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Photo Preview */}
          <div className="relative aspect-[3/2] bg-gray-100 rounded-xl overflow-hidden">
            {currentPhoto.preview ? (
              <img
                src={currentPhoto.preview}
                alt="Photo preview"
                className="absolute inset-0 w-full h-full object-contain"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                Preview unavailable
              </div>
            )}

            {/* Portrait Warning */}
            {currentPhoto.orientation === 'portrait' && (
              <div className="absolute top-3 left-3 right-3 bg-amber-500 text-white px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 text-sm">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">Portrait photo — Landscape is preferred for listings</span>
              </div>
            )}
          </div>

          {/* File Name */}
          <p className="text-sm text-gray-500">
            {currentPhoto.fileName || 'Unknown file'}
          </p>

          {/* Caption Input */}
          <div>
            <label className="block text-lg font-semibold text-gray-900 mb-2">
              Caption <span className="text-red-500">*</span>
            </label>
            <input
              ref={captionInputRef}
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder='e.g., "Kitchen 1", "Master Bath", "Pool View"'
              className="w-full text-lg border-2 border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#383D31] focus:border-transparent outline-none"
              maxLength={50}
              autoFocus
            />
            <p className="text-sm text-gray-400 mt-1.5">
              {caption.length}/50 — A brief label for this photo
            </p>
          </div>

          {/* Subcategory Dropdown */}
          {subcategories && subcategories.length > 0 && (
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-2">
                Room Type
              </label>
              <select
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                className="w-full text-lg border-2 border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#383D31] focus:border-transparent outline-none"
              >
                {subcategories.map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
          )}

          {/* Delete Button */}
          <button
            onClick={handleDelete}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-5 h-5" />
            <span className="font-medium">Remove this photo</span>
          </button>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex-shrink-0">
          <button
            onClick={handleNext}
            disabled={!canProceed}
            className="w-full flex items-center justify-center gap-2 px-8 py-3.5 bg-[#383D31] text-white text-lg font-semibold rounded-lg hover:bg-[#2a2e24] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isLastPhoto ? 'Done — Add Photos' : 'Next Photo'}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 3.2 — Integrate Wizard into PhotoUploader

**File: `components/ui/photo-uploader.tsx`**

**Change 1**: Add import at top:
```typescript
import { PhotoCaptionWizard } from "./photo-caption-wizard";
```

**Change 2**: Add wizard state (after line 37, after `convertingCount` state):
```typescript
const [showWizard, setShowWizard] = useState(false);
const [wizardPhotos, setWizardPhotos] = useState<PhotoFile[]>([]);
```

**Change 3**: Modify `handleFiles` to trigger wizard instead of immediately adding photos. Replace lines 147-148:
```typescript
// OLD:
// setConvertingCount(0);
// onPhotosChange([...photos, ...newPhotos]);

// NEW:
setConvertingCount(0);

if (newPhotos.length > 0) {
  // Show caption wizard for newly uploaded photos
  setWizardPhotos(newPhotos);
  setShowWizard(true);
} else {
  // No new photos (all conversions failed)
  // Don't change existing photos
}
```

**Change 4**: Add wizard handlers (before the return statement, around line 200):
```typescript
const handleWizardComplete = (captionedPhotos: PhotoFile[]) => {
  // Add captioned photos to existing photos
  onPhotosChange([...photos, ...captionedPhotos]);
  setShowWizard(false);
  setWizardPhotos([]);
};

const handleWizardCancel = () => {
  // Discard uncaptioned photos
  setShowWizard(false);
  setWizardPhotos([]);
};
```

**Change 5**: Add wizard component rendering (just before the closing `</div>` of the return, right before line 328):
```tsx
{/* Caption Wizard Modal */}
{showWizard && wizardPhotos.length > 0 && (
  <PhotoCaptionWizard
    photos={wizardPhotos}
    subcategories={subcategories}
    onComplete={handleWizardComplete}
    onCancel={handleWizardCancel}
    roomCategory={roomCategory}
  />
)}
```

### 3.3 — Fix Caption Validation Bug

**File: `components/submission/submission-form.tsx`**

**Change 1**: Update `updatePhotosForRoom` (line 72-74) to ensure proper state immutability:
```typescript
const updatePhotosForRoom = useCallback((room: string, photos: PhotoFile[]) => {
  setPhotosByRoom(prev => {
    const updated = { ...(prev ?? {}) };
    updated[room] = [...photos]; // Create new array reference
    return updated;
  });
}, []);
```

**Change 2**: Improve caption validation in `handleSubmit` (lines 160-168). Replace with:
```typescript
// Check all captions with detailed error reporting
const allPhotos = Object.entries(photosByRoom ?? {});
for (const [roomName, photos] of allPhotos) {
  for (const photo of (photos ?? [])) {
    if (!photo?.caption?.trim()) {
      alert(`Please add a caption to all photos.\n\nMissing caption in: ${roomName}`);
      return;
    }
  }
}
```

---

## POST-IMPLEMENTATION CHECKLIST

After implementing all 3 phases, verify:

1. **Settings page**: Navigate to `/admin/settings`. All rooms should appear. Save settings for Kitchen (change intensity to "Significant"). Verify it saves. Reload page — settings should persist.

2. **Auto-enhance with settings**: Submit a test photo. Check that auto-enhance uses the Kitchen "Significant" intensity (check the EnhancementVersion record in the database or admin UI).

3. **Manual enhance defaults**: Go to admin submission detail, click on a Kitchen photo. Enhancement settings should pre-fill with "Significant" intensity (matching what was saved in settings).

4. **Photo limits**: On the submission form, try uploading 11 photos to Kitchen. Should get an alert after 10. Counter should show "10 of 10".

5. **Caption wizard**: Upload 3 kitchen photos. Wizard should appear immediately. Caption each one. After wizard closes, all 3 should appear in grid with captions filled in.

6. **Caption bug fix**: Fill all captions, submit. Should NOT get "add caption" error.

7. **Settings nav link**: Admin dashboard should have a "Settings" link with a sliders icon.
