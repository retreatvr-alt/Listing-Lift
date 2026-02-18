# Listing Lift — Photo Guidance Banners + Admin Room Reassignment + Download File Naming

## Overview

Three improvements in this round:

1. **Photo guidance banners**: Clients are taking all their photos ahead of time before starting the submission process, missing the room-by-room tips and guidance. Add messaging on the landing page and submission form.
2. **Admin room reassignment**: When a client submits a photo under the wrong room, the admin needs a way to reassign it and re-run enhancement with the correct room prompt. Enhancement history must be preserved.
3. **Download file naming**: Photos have cryptic S3 names (timestamps + IMG_xxxx). Apply human-readable `{Room}-{Caption}` naming at the download layer.

**Files modified: 5 (no new files, no schema changes, no new dependencies)**

---

## CRITICAL: Visual Consistency Rules

**All UI changes MUST look like they were part of the original design — not added as an afterthought.** Follow these rules strictly:

1. **Landing page (`app/page.tsx`)** uses these patterns:
   - Cards: `bg-[#f9f7f4] rounded-xl p-6` (beige background, no shadow)
   - Icons: Dark green circles `w-16 h-16 bg-[#383D31] rounded-full` with white Lucide icons `w-8 h-8 text-white`
   - Text colors: `text-[#383D31]` for headings, `text-gray-600` for body, `text-gray-500` for subtle text
   - Max width: `max-w-4xl` in hero, `max-w-6xl` in feature sections
   - The landing page does NOT use info-box/alert style callouts — everything is either a card or inline text

2. **Submission form (`components/submission/submission-form.tsx`)** uses these patterns:
   - Cards: `bg-white rounded-xl shadow-lg p-6`
   - Info boxes: `bg-blue-50 border border-blue-200 rounded-xl p-4` (see subcategory info box, lines 509-521)
   - Icon circles: `w-10 h-10 bg-{color}-100 rounded-full` with `w-6 h-6 text-{color}-600` icons
   - Section headers: `text-3xl font-bold text-[#383D31]` centered, with `text-gray-600 mt-2` subtitle

3. **Admin detail page (`app/admin/submissions/[id]/page.tsx`)** uses these patterns:
   - Select dropdowns: `className="border border-gray-200 rounded-lg px-3 py-2 text-sm"` (see status dropdown, line 452-460)
   - Card sections: `bg-white rounded-xl shadow-md p-4`
   - Photo header: caption as `font-semibold text-[#383D31]`, room as `text-sm text-gray-500`
   - Action buttons: `px-3 py-2 rounded-lg text-sm` with `bg-gray-100 hover:bg-gray-200 text-gray-700`
   - Toast notifications via `sonner` library (already imported)

**DO NOT introduce any new styling patterns, colors, or component structures that don't already exist on the page you're modifying.**

---

## Part A: Photo Guidance Banners

### File 1: Landing Page — `app/page.tsx`

#### Change 1A: Add guided-process subtitle in hero section

**The goal is to make the message feel like part of the hero's natural flow — NOT a tacked-on banner.**

Replace the current hero subtitle paragraph and CTA (lines 51-62):

```tsx
          <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Submit your vacation rental photos and let our AI enhancement technology make them shine.
            Professional quality results that drive more bookings.
          </p>
          <Link
            href="/submit"
            className="inline-flex items-center gap-2 bg-[#383D31] text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-[#2a2e24] transition-all shadow-lg hover:shadow-xl"
          >
            Start Submission
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-sm text-gray-500 mt-4">Submit and forget — we handle everything</p>
```

With this updated version:

```tsx
          <p className="text-lg md:text-xl text-gray-600 mb-4 max-w-2xl mx-auto">
            Submit your vacation rental photos and let our AI enhancement technology make them shine.
            Professional quality results that drive more bookings.
          </p>
          <p className="text-base text-[#5a6349] font-medium mb-8 max-w-lg mx-auto">
            No need to take photos ahead of time — we&apos;ll walk you through each room with tips for the best shots from your phone.
          </p>
          <Link
            href="/submit"
            className="inline-flex items-center gap-2 bg-[#383D31] text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-[#2a2e24] transition-all shadow-lg hover:shadow-xl"
          >
            Start Submission
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-sm text-gray-500 mt-4">Submit and forget — we handle everything</p>
```

**What changed**: Added a second subtitle line in the brand's accent green (`text-[#5a6349]`) with `font-medium` — this matches the existing `<span className="text-[#5a6349]">` in the h1 on line 49. Reduced the first paragraph's `mb-8` to `mb-4` so the two lines flow together, then the new line has `mb-8` before the CTA.

#### Change 1B: Update "How It Works" Step 1 card

**Where**: Lines 71-78, the first card in the "How It Works" grid.

**Replace ONLY the h4 and p text (keep the outer div and icon div exactly as-is):**

Current:
```tsx
              <h4 className="font-semibold text-lg mb-2">1. Upload Photos</h4>
              <p className="text-gray-600">
                Upload your property photos by room category. We accept HEIC, JPEG, PNG, and WebP formats.
              </p>
```

New:
```tsx
              <h4 className="font-semibold text-lg mb-2">1. Follow Our Guided Process</h4>
              <p className="text-gray-600">
                We&apos;ll walk you through each room with photography tips. Just grab your phone and follow along!
              </p>
```

---

### File 2: Submission Form — `components/submission/submission-form.tsx`

#### Change 2: Add info callout at top of Step 0

**Step 1: Add `Smartphone` to the Lucide import (line 7):**

Current:
```tsx
import { ArrowLeft, ArrowRight, CheckCircle, Loader2, Home, Camera, Lightbulb, Phone, Mail, MapPin, User, FileText } from "lucide-react";
```

New:
```tsx
import { ArrowLeft, ArrowRight, CheckCircle, Loader2, Home, Camera, Lightbulb, Phone, Mail, MapPin, User, FileText, Smartphone } from "lucide-react";
```

**Step 2: Insert the callout between the heading div and the form card.**

Find this code (lines 287-293):
```tsx
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold text-[#383D31]">Your Information</h1>
                  <p className="text-gray-600 mt-2">Tell us about yourself and your property</p>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
```

Replace with:
```tsx
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold text-[#383D31]">Your Information</h1>
                  <p className="text-gray-600 mt-2">Tell us about yourself and your property</p>
                </div>

                <div className="bg-[#f9f7f4] border border-[#e2dfda] rounded-xl p-4 flex items-start gap-3">
                  <div className="w-10 h-10 bg-[#383D31] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Smartphone className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#383D31]">You don&apos;t need your photos ready yet!</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      After filling in your details, we&apos;ll guide you room by room with tips on how to take the best photos from your phone.
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
```

**Why this matches the existing design:**
- `bg-[#f9f7f4]` warm beige = the app's primary background color (used throughout)
- `border-[#e2dfda]` = a slightly darker beige (matches the palette — do NOT use emerald, blue, or any colored border)
- `rounded-xl p-4` = matches the subcategory info box pattern (line 510)
- `w-10 h-10 bg-[#383D31] rounded-full` = matches Photography Tips card icon circles (lines 408, 425, 441, 458)
- `font-semibold text-[#383D31]` heading + `text-sm text-gray-600` body = matches every card on this page

---

## Part B: Admin Room Reassignment

### File 3: Photo Update API — `app/api/photos/[id]/route.ts`

#### Change 3: Accept `roomCategory` and `subCategory` in the PATCH handler

**Where**: Line 20 — add `roomCategory` and `subCategory` to the destructuring.

Current (line 20):
```typescript
    const { status, isHero, rejectionReason, reuploadInstructions, enhancedUrl, heroUrl } = data;
```

New:
```typescript
    const { status, isHero, rejectionReason, reuploadInstructions, enhancedUrl, heroUrl, roomCategory, subCategory } = data;
```

**Add the new fields to `updateData`** (after the existing `heroUrl` handler, around line 43):

```typescript
    if (roomCategory !== undefined) updateData.roomCategory = roomCategory;
    if (subCategory !== undefined) updateData.subCategory = subCategory;
```

**Important**: When `subCategory` is explicitly set to `null` (because the new room has no subcategories), this must clear the existing subCategory. The check `subCategory !== undefined` handles this correctly — `null !== undefined` is `true`, so `null` will be passed through to Prisma which will clear the field.

That's the only change to this file. No other logic changes needed.

---

### File 4: Admin Detail Page — `app/admin/submissions/[id]/page.tsx`

#### Change 4A: Replace static room label with dropdown

**Where**: Lines 643-646 in the photo viewer header — the static room category display.

Current:
```tsx
                      <p className="text-sm text-gray-500">
                        {selectedPhoto.roomCategory}
                        {selectedPhoto.subCategory ? ` • ${selectedPhoto.subCategory}` : ''}
                      </p>
```

Replace with **two inline dropdowns** that match the existing status dropdown styling (line 452-460):

```tsx
                      <div className="flex items-center gap-2 mt-1">
                        <select
                          value={selectedPhoto.roomCategory}
                          onChange={(e) => handleRoomChange(selectedPhoto.id, e.target.value)}
                          className="border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-600"
                        >
                          {ROOM_CATEGORIES.map((cat) => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                        {(() => {
                          const currentCat = ROOM_CATEGORIES.find(c => c.id === selectedPhoto.roomCategory);
                          if (currentCat?.hasSubcategories && currentCat.subcategories) {
                            return (
                              <select
                                value={selectedPhoto.subCategory || ''}
                                onChange={(e) => handleSubCategoryChange(selectedPhoto.id, e.target.value || null)}
                                className="border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-600"
                              >
                                <option value="">Select type...</option>
                                {currentCat.subcategories.map((sub) => (
                                  <option key={sub} value={sub}>{sub}</option>
                                ))}
                              </select>
                            );
                          }
                          return null;
                        })()}
                      </div>
```

**Note the styling**: `border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-600` — slightly smaller padding than the status dropdown (`px-3 py-2`) because these are inline in a tighter space. The `text-gray-600` matches the room label's original color so it looks native.

#### Change 4B: Add `handleRoomChange` and `handleSubCategoryChange` handler functions

Add these functions in the component body (near the other handler functions like `handleSetHero`, around line 350-395):

```typescript
  const handleRoomChange = async (photoId: string, newRoom: string) => {
    try {
      // Determine if new room needs subcategory cleared
      const newCat = ROOM_CATEGORIES.find(c => c.id === newRoom);
      const updateData: Record<string, unknown> = { roomCategory: newRoom };

      // If new room doesn't have subcategories, clear subCategory
      if (!newCat?.hasSubcategories) {
        updateData.subCategory = null;
      } else {
        // If switching TO a room with subcategories, clear existing subCategory
        // (user will need to pick from the new subcategory dropdown)
        updateData.subCategory = null;
      }

      const res = await fetch(`/api/photos/${photoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (!res.ok) throw new Error('Failed to update room');

      toast.success(`Moved to ${newRoom}`);

      // Re-fetch submission to update sidebar grouping
      await fetchSubmission();

      // Update selectedPhoto with new room
      setSelectedPhoto(prev => prev ? { ...prev, roomCategory: newRoom, subCategory: updateData.subCategory as string | undefined } : null);

      // Auto-trigger re-enhancement with new room prompt if photo was already enhanced
      const photo = submission?.photos.find(p => p.id === photoId);
      if (photo?.enhancedUrl) {
        toast.info('Re-enhancing with correct room prompt...');
        handleEnhance();
      }
    } catch (error) {
      console.error('Room change failed:', error);
      toast.error('Failed to change room');
    }
  };

  const handleSubCategoryChange = async (photoId: string, newSubCategory: string | null) => {
    try {
      const res = await fetch(`/api/photos/${photoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subCategory: newSubCategory })
      });

      if (!res.ok) throw new Error('Failed to update subcategory');

      toast.success(newSubCategory ? `Set to ${newSubCategory}` : 'Subcategory cleared');

      await fetchSubmission();
      setSelectedPhoto(prev => prev ? { ...prev, subCategory: newSubCategory || undefined } : null);

      // Auto-trigger re-enhancement with new subcategory prompt if photo was already enhanced
      const photo = submission?.photos.find(p => p.id === photoId);
      if (photo?.enhancedUrl) {
        toast.info('Re-enhancing with correct room prompt...');
        handleEnhance();
      }
    } catch (error) {
      console.error('Subcategory change failed:', error);
      toast.error('Failed to change subcategory');
    }
  };
```

**Key behaviors:**
- When room changes, `subCategory` is always cleared to `null` (the user picks a new one from the subcategory dropdown if the new room has subcategories)
- After a successful room change, `fetchSubmission()` is called to re-fetch all data and re-group photos in the sidebar — the photo will move to its new room group
- If the photo was already enhanced (`enhancedUrl` exists), automatically trigger `handleEnhance()` to re-enhance with the correct room prompt. This creates a NEW `EnhancementVersion` record — the old one is preserved, maintaining full enhancement history
- The `handleEnhance()` function already reads `selectedPhoto.roomCategory` to pick the correct `ROOM_PROMPTS` entry (line 230-231), so after updating `selectedPhoto` state, the re-enhancement will use the new room's prompt
- Toast notifications provide immediate feedback using the existing `sonner` library (already imported at line 12)

**IMPORTANT about enhancement history preservation**: The existing `handleEnhance()` function (around line 254) creates a new `EnhancementVersion` each time — it never deletes old versions. The old `EnhancementVersion` records from the wrong room stay in the history with their original settings/prompt. The new enhancement simply adds a new version on top. The Enhancement History panel (around line 919) will show all versions in order, so the admin can see the progression including the room change.

---

## Part C: Download File Naming

### File 5: S3 Utilities — `lib/s3.ts`

#### Change 5: Add `buildDownloadFileName()` helper function

Add this new exported function at the bottom of `lib/s3.ts`:

```typescript
/**
 * Builds a human-readable download filename from photo metadata.
 * Used at the download layer (ZIP downloads, individual download buttons).
 * S3 storage paths remain unchanged.
 *
 * Examples:
 *   - Enhanced: "Kitchen-Main-View.jpg"
 *   - Original: "Kitchen-Main-View-original.jpg"
 *   - Hero:     "HERO-Kitchen-Main-View.jpg"
 *   - With subcategory: "Living-Room-Open-Layout.jpg" (uses subCategory, not "Living Spaces")
 *   - Numbered (for ZIP): "01-Kitchen-Main-View.jpg"
 */
export function buildDownloadFileName(
  photo: { roomCategory: string; subCategory?: string | null; caption: string },
  variant: 'enhanced' | 'original' | 'hero',
  index?: number  // Optional 1-based index for numbered files in ZIP downloads
): string {
  // Use subCategory if available (e.g., "Living Room" not "Living Spaces")
  const room = (photo.subCategory || photo.roomCategory)
    .replace(/[/\\]/g, "-")        // Replace slashes (e.g., "Pool/Hot Tub" → "Pool-Hot Tub")
    .replace(/\s+/g, "-");          // Replace spaces with hyphens

  const caption = photo.caption
    .replace(/[^a-zA-Z0-9 _-]/g, "") // Strip special chars
    .replace(/\s+/g, "-")             // Replace spaces with hyphens
    .replace(/-+/g, "-")              // Collapse multiple hyphens
    .replace(/^-|-$/g, "");           // Trim leading/trailing hyphens

  const base = caption ? `${room}-${caption}` : room;
  const numbered = index !== undefined ? `${String(index).padStart(2, "0")}-${base}` : base;

  switch (variant) {
    case 'original':
      return `${numbered}-original.jpg`;
    case 'hero':
      return `HERO-${numbered}.jpg`;
    case 'enhanced':
    default:
      return `${numbered}.jpg`;
  }
}
```

**This function is designed to be reusable by the Round 5 ZIP download endpoints** (which are defined in `DEEP_AGENT_PROMPT_ROUND5.md` but not yet implemented). When Round 5 is implemented, the ZIP download code should use `buildDownloadFileName()` instead of inline name-building logic.

**Note**: This function only defines the naming convention. It does NOT change how files are stored in S3 or how presigned URLs work. It's used when:
- Building filenames inside ZIP archives (`archiver` `{ name: ... }`)
- Setting `Content-Disposition` headers for individual file downloads
- Any future display of "download as" filenames

---

## Summary of All Changes

| # | File | What to Change |
|---|------|----------------|
| 1 | `app/page.tsx` | Add accent-green subtitle line in hero section. Update "How It Works" Step 1 title and text. |
| 2 | `components/submission/submission-form.tsx` | Add `Smartphone` to Lucide import. Insert beige info callout between Step 0 heading and form card. |
| 3 | `app/api/photos/[id]/route.ts` | Add `roomCategory` and `subCategory` to PATCH destructuring and `updateData`. |
| 4 | `app/admin/submissions/[id]/page.tsx` | Replace static room label (lines 643-646) with room + subcategory dropdowns. Add `handleRoomChange()` and `handleSubCategoryChange()` functions with auto re-enhancement. |
| 5 | `lib/s3.ts` | Add `buildDownloadFileName()` exported helper function. |

## What NOT to Do

- Do NOT use `emerald`, `green`, `amber`, or any Tailwind color that isn't already on the page you're editing
- Do NOT add shadows to the landing page hero section
- Do NOT use emoji icons on client-facing pages — use Lucide icons matching existing patterns
- Do NOT delete or modify existing `EnhancementVersion` records when room changes — they form the enhancement history
- Do NOT rename or move S3 objects — naming is applied only at the download layer
- Do NOT modify the Photography Tips step (Step 1), room upload steps (Steps 2-7), or Review step (Step 8) in the submission form
- Do NOT modify `lib/enhancement-prompts.ts` — the `ROOM_CATEGORIES` array is already imported in the admin page

## Verification

1. **Landing page** (`/`): Accent-green subtitle visible between description and CTA button, reads as natural part of the hero flow
2. **"How It Works"**: Step 1 says "Follow Our Guided Process" with updated description
3. **Submission form** (`/submit`): Warm beige info callout with Smartphone icon above the contact form
4. **Mobile check**: Both callouts readable and well-spaced on mobile viewport
5. **Room reassignment**: Select a photo → room dropdown visible where static label was → change from "Kitchen" to "Bedroom" → photo moves to Bedroom group in sidebar → toast says "Moved to Bedroom" → if previously enhanced, re-enhancement triggers automatically with new room prompt
6. **Subcategory handling**: Change room to "Living Spaces" → subcategory dropdown appears → select "Dining Room/Dining Area" → change room to "Kitchen" → subcategory dropdown disappears, subCategory cleared
7. **Enhancement history preserved**: After room reassignment + re-enhancement, open Enhancement History panel → old enhancement from wrong room still visible → new enhancement from correct room added as latest version
8. **`buildDownloadFileName` output**: Verify function produces correct names — e.g., `buildDownloadFileName({ roomCategory: "Living Spaces", subCategory: "Living Room", caption: "Open Layout" }, "enhanced", 1)` → `"01-Living-Room-Open-Layout.jpg"`
9. **Visual consistency**: ALL UI additions must be indistinguishable from the original design — same colors, spacing, fonts, and component patterns
