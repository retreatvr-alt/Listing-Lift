# Listing Lift — Round 2 Implementation Instructions

Implement all 6 changes below. Each change includes exact file paths, what to modify, and code snippets. After all changes, verify with the checklist at the bottom.

App root: `nextjs_space/` (inside `Listing_Lift_Prototype_Development/listing_lift/nextjs_space/`)

---

## Change 1: Settings Page — Show Default Prompts Pre-Populated

### Problem
The settings page shows an empty "Custom Prompt" textarea with only a truncated placeholder. We want the ACTUAL default prompts pre-populated and editable — not a separate "custom prompt" concept.

### File: `app/api/admin/settings/route.ts`

In the **GET handler**, where you build the merged settings list — when a room has NO DB record, return the default prompt from `ROOM_PROMPTS[roomKey]` as the `customPrompt` value instead of `null`.

Change the merge logic from:
```typescript
customPrompt: dbSetting?.customPrompt || null,
```
To:
```typescript
customPrompt: dbSetting?.customPrompt ?? ROOM_PROMPTS[roomKey] ?? null,
```

This way, every room always returns its full prompt text (either saved custom or code default).

### File: `app/admin/settings/page.tsx`

1. **Rename the label** from "Custom Prompt" to **"Enhancement Prompt"**
2. **Remove the placeholder approach** — instead, the textarea `value` should always show the full prompt text (it comes pre-populated from the API now)
3. Change the help text to: **"This is the prompt sent to the AI model during auto-enhancement. Edit as needed."**
4. The **Reset to Defaults** button should reset the prompt to `ROOM_PROMPTS[roomKey]` (import this from `@/lib/enhancement-prompts`)
5. Remove the truncated placeholder logic (the `ROOM_PROMPTS[roomKey]?.substring(0, 200) + '...'` pattern)
6. Make the textarea taller — change from `rows={8}` to `rows={12}` so the full prompt is more visible

---

## Change 2: Settings for ALL Sub-Room Types (Remove Parent Categories)

### Problem
Settings page shows "Living Spaces" and "Exterior" as parent entries with their own settings. These are just grouping labels — only actual sub-rooms need settings.

### File: `app/api/admin/settings/route.ts`

Update `ALL_ROOM_KEYS` to this exact list (remove "Living Spaces" and "Exterior"):
```typescript
const ALL_ROOM_KEYS = [
  "Kitchen",
  "Bedroom",
  "Living Room",
  "Dining Room/Dining Area",
  "Foyer/Entryway",
  "Home Theater",
  "Game Room",
  "Bathroom",
  "Pool/Hot Tub",
  "Building Exterior",
  "Lawn/Backyard",
  "Miscellaneous"
];
```

### File: `app/admin/settings/page.tsx`

Update the room groupings displayed on the page:

```typescript
const ROOM_GROUPS = [
  {
    label: "Main Rooms",
    rooms: ["Kitchen", "Bedroom", "Bathroom", "Pool/Hot Tub"]
  },
  {
    label: "Living Spaces",
    rooms: ["Living Room", "Dining Room/Dining Area", "Foyer/Entryway", "Home Theater", "Game Room"]
  },
  {
    label: "Exterior",
    rooms: ["Building Exterior", "Lawn/Backyard", "Miscellaneous"]
  }
];
```

Remove the "Living Spaces" and "Exterior" parent entries from the displayed list entirely.

### File: `lib/enhancement-prompts.ts`

Add three new prompts to the `ROOM_PROMPTS` object. Add these BEFORE the closing `};` of the object:

```typescript
  "Foyer/Entryway": `Edit this existing photo of a real foyer or entryway in a vacation rental property. Keep the exact same scene, composition, objects, and details — do not add, remove, or change any items, furniture, or architectural features. This is a real space that guests will visit, so accuracy is critical.

Apply professional real estate photo editing:
- Correct white balance for accurate colors of walls, flooring, and fixtures
- Even out lighting — brighten dark corners, balance natural and artificial light
- Straighten vertical lines (walls, door frames, staircase elements)
- Correct any wide-angle or perspective distortion
- Enhance flooring appearance (tile, hardwood, stone) without changing materials
- Make the space feel bright, welcoming, and well-maintained
- The result should look like a professional interior photographer's edit

The viewer should not be able to tell this was edited with AI. Maintain 100% photorealistic quality.`,

  "Home Theater": `Edit this existing photo of a real home theater or media room in a vacation rental property. Keep the exact same scene, composition, objects, and details — do not add, remove, or change any items, furniture, equipment, or architectural features. This is a real space that guests will visit, so accuracy is critical.

Apply professional real estate photo editing:
- Correct white balance for accurate colors in a typically darker room
- Even out lighting — brighten shadows while preserving the cozy ambiance
- Straighten vertical lines and correct perspective distortion
- Enhance seating and screen area to look inviting
- Make fabric and upholstery textures look natural and comfortable
- Remove any reflections from screens or glass surfaces
- The result should look like a professional entertainment room photograph

The viewer should not be able to tell this was edited with AI. Maintain 100% photorealistic quality.`,

  "Game Room": `Edit this existing photo of a real game room in a vacation rental property. Keep the exact same scene, composition, objects, and details — do not add, remove, or change any items, furniture, equipment, or architectural features. This is a real space that guests will visit, so accuracy is critical.

Apply professional real estate photo editing:
- Correct white balance for accurate colors throughout
- Even out lighting — brighten shadows, balance windows with interior
- Straighten vertical lines and correct perspective distortion
- Enhance game equipment appearance (pool table felt, arcade screens, etc.) without altering them
- Make the space feel fun, spacious, and well-maintained
- Remove any reflections from glass or screens
- The result should look like a professional interior photograph

The viewer should not be able to tell this was edited with AI. Maintain 100% photorealistic quality.`,
```

---

## Change 3: Logo — 20% Larger + Blend Background

### Problem
The Listing Lift logo PNG (`/public/listing-lift-logo.png`) has a cream/beige background that creates a visible square against the page backgrounds. The logo also needs to be 20% larger.

### Fix: Match each logo container's CSS background-color to the logo PNG's background color

Look at the logo PNG file to determine its exact background color (approximately `#eae7e1` — a warm cream). Then apply that color to the logo container `<div>` with rounded corners.

### File: `app/page.tsx` (landing page hero section, line 38)

Current:
```tsx
<div className="relative w-32 h-32 md:w-40 md:h-40 mx-auto mb-4">
```

Change to:
```tsx
<div className="relative w-40 h-40 md:w-48 md:h-48 mx-auto mb-4 rounded-2xl overflow-hidden">
```

The page background is `from-[#f9f7f4] to-white`. The hero section sits on the `#f9f7f4` part of the gradient. Since the logo's cream is close to this, also change the section background to match better. If the square is still slightly visible, you can add `bg-[#f9f7f4]` to the logo container div so it matches the page exactly, OR eyedrop the logo PNG's actual background hex and use that.

### File: `components/submission/submission-form.tsx` (sticky header, line 230)

Current:
```tsx
<div className="relative w-10 h-10">
```

Change to:
```tsx
<div className="relative w-12 h-12 rounded-lg overflow-hidden">
```

The header background is `bg-white/90`. If the logo square is visible against this white, add the logo's background color to the container: `bg-[#eae7e1] rounded-lg overflow-hidden` (adjust the hex to match the actual logo background).

### File: `app/admin/page.tsx` (admin header)

Same change — find the logo container div:
```tsx
<div className="relative w-10 h-10">
```

Change to:
```tsx
<div className="relative w-12 h-12 rounded-lg overflow-hidden">
```

**IMPORTANT:** The exact background hex `#eae7e1` is approximate. Please examine the logo PNG to get the exact color. The goal is: no visible square boundary around the logo.

---

## Change 4: Scroll to Top on Step Navigation

### Problem
When users navigate to room upload steps (Kitchen, Bedroom, etc.), the page stays scrolled to wherever they were. This means they land at the bottom (upload area) and miss all the tips/instructions at the top. Many don't realize it's a per-room upload page and upload ALL their photos in the first room.

### File: `components/submission/submission-form.tsx`

Add this `useEffect` right after the existing state declarations (around line 70, after `const totalPhotos = ...`):

```typescript
// Scroll to top when navigating between steps
useEffect(() => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}, [currentStep]);
```

Add `useEffect` to the imports if not already there (line 2):
```typescript
import { useState, useCallback, useEffect } from "react";
```

---

## Change 5: Per-Sub-Room Photo Limits (Variable by Room)

### Problem
Currently `maxPhotos={10}` is hardcoded for all rooms. For multi-room upload pages (Living Spaces has 5 sub-rooms, Exterior has 3), the total limit should be the SUM of each sub-room's individual limit.

### File: `lib/enhancement-prompts.ts`

Add this new export at the end of the file (after `ROOM_CATEGORIES`):

```typescript
export const ROOM_PHOTO_LIMITS: Record<string, number> = {
  Kitchen: 10,
  Bedroom: 10,
  "Living Room": 10,
  "Dining Room/Dining Area": 8,
  "Foyer/Entryway": 5,
  "Home Theater": 8,
  "Game Room": 8,
  Bathroom: 10,
  "Pool/Hot Tub": 10,
  "Building Exterior": 10,
  "Lawn/Backyard": 10,
  Miscellaneous: 8,
};
```

### File: `components/submission/submission-form.tsx`

1. Add `ROOM_PHOTO_LIMITS` to the import from `@/lib/enhancement-prompts`:
```typescript
import { ROOM_CATEGORIES, ROOM_TIPS, ROOM_PHOTO_LIMITS } from "@/lib/enhancement-prompts";
```

2. Add a helper function (before the `return` statement):
```typescript
const getMaxPhotosForRoom = (cat: typeof ROOM_CATEGORIES[0]) => {
  if (cat.hasSubcategories && cat.subcategories) {
    return cat.subcategories.reduce(
      (sum, sub) => sum + (ROOM_PHOTO_LIMITS[sub] || 10), 0
    );
  }
  return ROOM_PHOTO_LIMITS[cat.id] || 10;
};
```

3. In the room upload section (around line 503), change:
```typescript
maxPhotos={10}
```
To:
```typescript
maxPhotos={getMaxPhotosForRoom(roomCategory)}
```

4. Update the upload page heading text (around line 455). Change:
```typescript
<p className="text-gray-600 mt-2">Upload up to 10 {roomCategory.name.toLowerCase()} photos (4-8 recommended)</p>
```
To:
```typescript
<p className="text-gray-600 mt-2">
  Upload up to {getMaxPhotosForRoom(roomCategory)} {roomCategory.name.toLowerCase()} photos
  {!roomCategory.hasSubcategories && " (4-8 recommended)"}
  {roomCategory.hasSubcategories && " across all room types"}
</p>
```

### File: `app/api/submissions/route.ts`

1. Add import:
```typescript
import { ROOM_PHOTO_LIMITS } from "@/lib/enhancement-prompts";
```

2. Replace the current per-room validation block (the `photoCountByRoom` loop) with per-SUB-ROOM validation:

```typescript
// Validate per-subcategory limits
const photoCountBySub: Record<string, number> = {};
for (const photo of photos) {
  const subKey = photo.subCategory || photo.roomCategory;
  photoCountBySub[subKey] = (photoCountBySub[subKey] || 0) + 1;
  const limit = ROOM_PHOTO_LIMITS[subKey] || 10;
  if (photoCountBySub[subKey] > limit) {
    return NextResponse.json(
      { error: `Maximum ${limit} photos for "${subKey}". You submitted ${photoCountBySub[subKey]}.` },
      { status: 400 }
    );
  }
}
```

---

## Change 6: Mandatory Room Selection in Wizard for Multi-Room Pages

### Problem
In the caption wizard for Living Spaces and Exterior upload pages, the subcategory dropdown auto-selects the first option. Users should be FORCED to explicitly pick a room type before proceeding.

### File: `components/ui/photo-caption-wizard.tsx`

1. **Change initial subCategory state** (line 37):
```typescript
// OLD:
const [subCategory, setSubCategory] = useState(subcategories?.[0] || '');
// NEW:
const [subCategory, setSubCategory] = useState('');
```

2. **Update the useEffect that initializes on index change** (lines 50-55). Change:
```typescript
setSubCategory(localPhotos[currentIndex].subCategory || subcategories?.[0] || '');
```
To:
```typescript
setSubCategory(localPhotos[currentIndex].subCategory || '');
```

3. **Update canProceed** (line 42). Change:
```typescript
const canProceed = caption.trim().length > 0;
```
To:
```typescript
const canProceed = caption.trim().length > 0 &&
  (!subcategories || subcategories.length === 0 || subCategory !== '');
```

4. **Add blank placeholder option to dropdown** (line 187-189). Change:
```tsx
{subcategories.map((sub) => (
  <option key={sub} value={sub}>{sub}</option>
))}
```
To:
```tsx
<option value="">— Select room type —</option>
{subcategories.map((sub) => (
  <option key={sub} value={sub}>{sub}</option>
))}
```

5. **Add validation message below dropdown**. After the `</select>` tag (line 190), add:
```tsx
{subCategory === '' && caption.trim().length > 0 && (
  <p className="text-red-500 text-sm mt-1 font-medium">
    Please select a room type to continue
  </p>
)}
```

### File: `components/ui/photo-uploader.tsx`

1. **Change the default subCategory for new photos** (around line 141). Change:
```typescript
subCategory: subcategories?.[0] || undefined,
```
To:
```typescript
subCategory: undefined,
```

2. **Add blank option to inline grid dropdown** (around lines 306-316). In the `<select>` for subcategories in the photo grid, add a blank option as the first child:
```tsx
<select
  value={photo?.subCategory || ''}
  onChange={(e) => updatePhoto(photo?.id || '', { subCategory: e.target.value || undefined })}
  className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 mt-2"
>
  <option value="">— Select —</option>
  {subcategories.map((sub) => (
    <option key={sub} value={sub}>{sub}</option>
  ))}
</select>
```

Also update the caption validation in `components/submission/submission-form.tsx` to check for missing subcategories on rooms that require them. In the `handleSubmit` function, after the caption check, add:

```typescript
// Check subcategory selections for rooms that require them
const roomsWithSubs = ROOM_CATEGORIES.filter(r => r.hasSubcategories);
for (const room of roomsWithSubs) {
  const roomPhotos = photosByRoom?.[room.id] ?? [];
  for (const photo of roomPhotos) {
    if (!photo?.subCategory) {
      alert(`Please select a room type for all ${room.name} photos.\n\nOne or more photos are missing a room type selection.`);
      return;
    }
  }
}
```

---

## Post-Implementation Verification Checklist

1. **Settings page** (`/admin/settings`):
   - [ ] All 12 rooms appear (NO "Living Spaces" or "Exterior" parent entries)
   - [ ] Foyer/Entryway, Home Theater, Game Room are listed with prompts
   - [ ] Each room's Enhancement Prompt textarea is pre-populated with the full default prompt
   - [ ] Editing a prompt and clicking Save persists it
   - [ ] Reset to Defaults repopulates with the original code prompt
   - [ ] Groups: Main Rooms, Living Spaces, Exterior

2. **Logo** (check on `/`, `/submit`, `/admin`):
   - [ ] Logo is 20% larger than before
   - [ ] No visible square/box around the logo
   - [ ] Logo blends seamlessly with surrounding background

3. **Scroll behavior** (`/submit`):
   - [ ] Click through steps — each new step scrolls to top
   - [ ] Room upload pages show tips/instructions first (not scrolled to upload area)

4. **Photo limits** (`/submit`):
   - [ ] Kitchen shows "Upload up to 10 photos"
   - [ ] Living Spaces shows "Upload up to 39 photos across all room types"
   - [ ] Exterior shows "Upload up to 28 photos across all room types"
   - [ ] Try uploading 11 kitchen photos — should get blocked at 10

5. **Mandatory room selection** (`/submit` → Living Spaces):
   - [ ] Upload photos → wizard opens
   - [ ] Room type dropdown shows "— Select room type —" (blank default)
   - [ ] Next button disabled until BOTH caption AND room type are filled
   - [ ] Error message "Please select a room type" appears when caption is filled but room isn't
   - [ ] In grid view, dropdown also shows "— Select —" blank option

6. **Auto-enhance** (submit test photos):
   - [ ] Enhancement uses the prompt from settings (which is now the actual default, not null)
   - [ ] Check EnhancementVersion records in admin to verify correct prompt was used
