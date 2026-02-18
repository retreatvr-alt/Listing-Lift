# Listing Lift — Changelog

All development sessions for the Listing Lift platform, documented chronologically.
Built February 2026.

---

## Initial Build — Core Platform

Built the full working prototype from scratch.

### Application Foundation
- **Next.js 14** with App Router, TypeScript, Tailwind CSS
- **Prisma + PostgreSQL** database with models: `AdminUser`, `Submission`, `Photo`, `EnhancementVersion`, `MagicLink`
- **AWS S3** for photo storage using presigned URLs
- **NextAuth** for admin authentication
- **Brand design**: dark green (`#383D31`) + warm beige (`#f9f7f4`)

### Submission Flow (`/submit`)
- Multi-step form: Step 0 (contact info) → Steps 1–N (per-room photo uploads) → Final review
- `PhotoUploader` component with drag-and-drop support
- HEIC/HEIF detection and client-side conversion via `heic2any`
- Landscape/portrait orientation detection
- S3 presigned URL upload pipeline

### Admin Dashboard (`/admin`)
- Submission list view with status badges
- Detail page (`/admin/submissions/[id]`) with photo lightbox and enhancement controls
- Room-specific enhancement prompts in `lib/enhancement-prompts.ts`
- Intensity modifiers: Light, Moderate, Significant
- Enhancement toggles: sky replacement, bed fixing, window recovery, brightness, perspective, reflection
- SSE streaming response pattern for enhancement progress
- `EnhancementVersion` history tracking per photo

### API Routes (Initial)
- `POST /api/submissions` — create submission with photos
- `GET /api/admin/submissions` — admin list view
- `GET /api/submissions/[id]` — submission detail
- `POST /api/upload/presigned` — S3 presigned URL generation
- `GET /api/file-url` — resolve S3 path to signed display URL
- `POST /api/photos/[id]/enhance` — manual photo enhancement
- `POST /api/submissions/[id]/auto-enhance` — background auto-enhancement on submission

---

## Debug Session A — S3 Upload & Admin Display Fixes

**Problem**: Uploaded photos appearing broken in admin dashboard.

### Root Causes & Fixes
- Removed `Content-Disposition: "attachment"` header from S3 presigned URL generation in `lib/s3.ts` — this was causing upload failures
- Removed Content-Disposition header logic from client upload code in `submission-form.tsx`
- Changed `/api/file-url` to use presigned URLs (`isPublic: false`) instead of public URLs
- Added proper URL resolution in admin dashboard to display S3 images

**Result**: JPEG, PNG, WebP uploads now display correctly.

---

## Debug Session B — HEIC Conversion (3 Sub-Sessions)

**Problem**: iPhone HEIC files showing broken previews and broken images after submission.

### B1 — Initial Client-Side Fix
- Modified `convertHeicToJpeg` to return `{ blob, preview, success }` object
- Modified `handleFiles` in `PhotoUploader` to upload the converted JPEG blob (not original HEIC)
- Created new `File` object from converted blob with `.jpg` extension
- **Still broken** — `heic2any` 0.0.4's old libheif WASM doesn't support modern iPhone HEIC (H.265 from iPhone 11+)

### B2 — Server-Side Fallback
- Added server-side HEIC conversion API at `/api/convert-heic` using `sharp`
- Added client → server fallback logic in `convertHeicToJpeg`
- Installed `sharp@0.34.5`
- Added detailed `[HEIC]` console logging
- **Still broken** — production libvips missing HEIF codec support

### B3 — Root Cause & Resolution
- **Key discovery**: iOS automatically converts HEIC → JPEG via the native photo picker. The problem only affects desktop users uploading raw `.heic` files transferred from iPhone.
- **Fix**: Switched to `heic-to` library (libheif 1.21.2 with H.265 support)
- Console confirmed: `[HEIC] Conversion successful, output size: 2402519`

---

## Debug Session C — Enhancement API Not Working

**Problem**: "Run Enhancement" button loading but never completing. No auto-enhancement on submission.

### Root Cause
- Enhancement using `gpt-5.1` model — wrong model for image generation
- Abacus AI API immediately rejected the request
- SSE stream erroring with "TypeError: terminated" after only 929 bytes

### Fixes
- Switched from `gpt-5.1` to `gpt-image-1` model
- Fixed SSE stream parsing to correctly detect `[DONE]` signal
- Added proper error handling and user-facing error alerts
- Added `maxDuration = 120` to Next.js route config (2-minute timeout)
- Implemented auto-enhancement: fires asynchronously after submission creation
- Added editable prompt textarea in admin UI ("Edit Prompt" button)
- Added admin notes field to enhancement parameters

---

## Debug Session D — Enhancement Timeout & Quality Issues

### D1 — Cloudflare 524 Timeout
**Problem**: `gpt-image-1` model taking >100 seconds. Cloudflare proxy times out at ~100s regardless of Next.js `maxDuration`.

**Also**: CORS errors — enhanced image URLs from Abacus AI's S3 bucket had no `Access-Control-Allow-Origin` for the app domain.

**Fixes**:
- Switched from `gpt-image-1` to `flux-kontext` model (completes in ~4–12 seconds)
- Implemented S3 re-upload flow: API downloads enhanced image from Abacus AI S3 → re-uploads to app's own S3 bucket under `public/enhanced/` prefix → stores re-uploaded URL in DB
- Added `uploadBufferToS3` utility to `lib/s3.ts`
- Created `/api/admin/cleanup-stale-urls` to clear old external URLs
- Removed SSE streaming, switched to direct fetch with 90-second AbortController timeout

### D2 — flux-kontext Quality Issues
**Problem**: Results either too AI-looking (smooth/blurry) or adding fake objects that didn't exist. Shape distortions: warped railings, incorrect cabinet handles.

**Root cause**: `flux-kontext` is optimized for creative image editing/style transfer, not photo correction.

**Fixes**:
- Rewrote prompts to use Lightroom/Photoshop editing framing ("Edit this existing photo")
- Added room-specific texture preservation hints
- Added strong "DO NOT add/remove objects" restrictions
- Moved creative features to opt-in checkboxes: `addTowels`, `smoothLinens`, `addToiletPaper`
- **Switched from `flux-kontext` to `gpt-image-1.5`** (better for photo editing vs. generation)
- Added aspect ratio config: `4:3` landscape, `3:4` portrait
- Added post-enhancement Sharp resizing to Airbnb dimensions (3000x2000 standard, 4000x2667 hero) with lanczos3 kernel

### D3 — Aspect Ratio 504 Timeout
**Problem**: After changing aspect ratio from `4:3` to `3:2` (Airbnb optimal), started getting 504 timeout errors.

**Root cause**: `3:2` is not supported by `gpt-image-1.5` API.

**Fix**: Reverted to `4:3` / `3:4` (supported values). Stale CORS errors were from old DB records with external URLs.

---

## Round 1 — Admin Settings, Photo Limits, Caption Wizard

### Per-Room Enhancement Settings
- **New model**: `RoomEnhancementSettings` (roomKey, defaultModel, defaultIntensity, toggles, customPrompt)
- **New API**: `GET/POST /api/admin/settings` — returns merged defaults + DB overrides, upserts per room
- **New page**: `/admin/settings` — collapsible cards per room (11 rooms in 3 groups), model/intensity dropdowns, toggle switches, custom prompt textarea, save/reset buttons
- **New file**: `lib/model-configs.ts` — `MODEL_OPTIONS`, `DEFAULT_MODEL_ID`, `MODEL_DISPLAY_NAMES`
- **Updated**: Auto-enhance route fetches room settings from DB before processing
- **Updated**: Admin detail page pre-fills enhancement settings when a photo is selected

### Per-Room Photo Limits
- Default `maxPhotos` changed from 60 to 10 per room
- "Upload up to X photos" messaging in drop zone
- Photo count display ("X of 10 photos uploaded")
- Alert when room limit exceeded
- API validation: max 60 total, max 10 per room

### Photo Caption Wizard
- **New component**: `components/ui/photo-caption-wizard.tsx`
- Full-screen modal triggered after file selection
- Processes photos one at a time (not grid)
- Per photo: preview, required caption (max 50 chars), subcategory dropdown, delete option
- Progress bar + "Photo X of Y" indicator
- Portrait orientation warning
- Enter key advances to next photo
- Cancel discards uncaptioned photos from batch

### Bug Fix
- Caption validation in `submission-form.tsx`: improved `updatePhotosForRoom` for proper state immutability

---

## Round 2 — Six UX Improvements

### 1. Settings Page Shows Default Prompts Pre-Populated
- Settings API returns `ROOM_PROMPTS[roomKey]` as default when no DB record exists
- Renamed "Custom Prompt" → "Enhancement Prompt"
- Textarea always shows full prompt text
- "Reset to Defaults" resets to code defaults

### 2. Settings for All Sub-Room Types
- Removed parent categories ("Living Spaces", "Exterior") from settings
- Final 12 rooms: Kitchen, Bedroom, Living Room, Dining Room/Dining Area, Foyer/Entryway, Home Theater, Game Room, Bathroom, Pool/Hot Tub, Building Exterior, Lawn/Backyard, Miscellaneous
- **New prompts**: Foyer/Entryway, Home Theater, Game Room added to `lib/enhancement-prompts.ts`

### 3. Logo — 20% Larger + Blend Background
- Landing page logo: `w-32 h-32` → `w-40 h-40` (md: `w-40 h-40` → `w-48 h-48`)
- Submission form & admin headers: `w-10 h-10` → `w-12 h-12`
- Added `rounded-lg overflow-hidden` to remove visible square around PNG

### 4. Scroll to Top on Step Navigation
- Added `useEffect` with `window.scrollTo({ top: 0, behavior: 'smooth' })` on `currentStep` change
- Users see room tips/instructions at top when navigating between steps

### 5. Per-Sub-Room Variable Photo Limits
- **New export**: `ROOM_PHOTO_LIMITS` in `lib/enhancement-prompts.ts` — variable limits per room (5–10)
- Added `getMaxPhotosForRoom()` helper that sums sub-room limits for multi-room categories
- API validation updated to check per-subcategory limits

### 6. Mandatory Room Selection in Wizard
- Initial subcategory state is now empty string (not pre-selected)
- `canProceed` requires both caption AND subcategory selection for rooms with subcategories
- "— Select room type —" blank placeholder added
- Validation message shown when caption filled but room not selected

---

## Round 3 — Preservation-First Prompt Rewrite

**Goal**: Eliminate AI-generated artifacts. Make enhancements look like professional Lightroom edits, not AI generation.

### Complete Rewrite of All Room Prompts
All 14 room types rewritten with this structure:
1. Room-specific texture reminders (what to preserve)
2. "Adjust ONLY" list: exposure, white balance, contrast, sharpness, vertical straightening, lens distortion
3. "PRESERVE EXACTLY as-is" list: everything in the scene
4. "DO NOT under any circumstances" list: no adding/removing objects, no sky replacement, no texture smoothing
5. Closing: "real property guests will visit...only professional exposure and color correction applied"

### Intensity Modifiers Rewritten
- **Light**: Minor corrections only (+/- 0.5 stops max), explicit restrictions
- **Moderate**: Standard professional corrections (+/- 1 stop), explicit restrictions
- **Significant**: Comprehensive corrections, HDR-style shadow/highlight recovery, explicit restrictions

### Added `input_fidelity: "high"` to API Calls
- Added to both manual enhance and auto-enhance routes
- Included in `image_config` block alongside `quality: 'high'`

---

## Round 4 — Unified Enhancement Presets System

Replaced the 6 boolean toggles + 3 creative additions with a comprehensive preset system. Content-changing enhancements (removed from auto-enhancement in Round 3) made available as manual presets only.

### Key Decision: Single-Pass Enhancement
- User raised: should content presets (add towels, clear counters) be a second pass on the already-enhanced image?
- Research showed GPT-Image-1.5 degrades after re-editing — "blotchy mess of globs" after 6-8 passes
- **Solution**: Single-pass with `CREATIVE OVERRIDES` prompt section that explicitly tells the model to override preservation rules for selected presets only
- Enhancement API always works from `originalUrl` (never re-edits enhanced images)

### New File: `lib/enhancement-presets.ts`
- ~35 presets across 11 categories:
  - **Universal Corrections** (5): Sky Replacement, Window Recovery, Brightness Boost, Perspective Fix, Reflection Removal
  - **Kitchen** (4): Clear Countertops, Texture Smoothing, Add Greenery, Under-Cabinet Glow
  - **Bedroom** (3): Smooth Linens, Add Throw Pillows, Bedside Styling
  - **Bathroom** (5): Clean Grout & Tile, Add Toiletries, Add Countertop Plant, Add Toilet Paper, Add Towels
  - **Living Room** (3): Style Coffee Table, Add Indoor Plant, Fireplace Glow
  - **Dining Room** (2): Set the Table, Add Centerpiece
  - **Exterior / Pool** (3): Pool Water Color, Add Pool Toys, Golden Hour Lighting
  - **Lawn / Backyard** (3): Greener Grass, Enhanced Landscaping, Add String Lights
  - **Foyer / Entryway** (2): Add Welcome Plant, Door/Hardware Polish
  - **Home Theater** (2): Screen Glow, Ambient LED Lighting
  - **Game Room** (2): Enhanced Ambient Lighting, Equipment Polish
- Helper functions: `getCategoriesForRoom()`, `buildPresetPromptText()`, `legacyTogglesToPresetIds()`
- Legacy backward compatibility mapping for old boolean fields

### Schema Update
- Added `presetIds String?` to `EnhancementVersion` (JSON array)
- Kept all existing boolean fields for backward compatibility

### Admin UI Redesigned
- Old checkbox grid replaced with collapsible accordion of preset categories
- "Recommended" badges for room-relevant categories
- Count badges showing selected presets per category
- Enhancement history reads `presetIds` JSON for new records, falls back to booleans for legacy

---

## Round 5 — Client Delivery Workflow

Full post-review workflow: admin review → retake requests → client retake wizard → final delivery → client feedback. **Cyclical** — retake rounds can repeat as many times as needed, tracked by `retakeRound` counter.

### Schema Changes
- **`MagicLink`**: Added `type` field (`"reupload"` | `"retake_batch"` | `"delivery"`)
- **`Submission`**: Added `reviewStatus`, `retakeRound`, `retakesSentAt`, `deliveredAt`
- **New model `ClientReview`**: submissionId, status, reviewedAt, clientNotes

### Multiple Hero Photos
- Removed single-hero constraint — multiple photos can be heroes
- New API: `POST /api/photos/[id]/generate-hero` — creates 4000x2667 hero version
- Admin hero button changed to toggle with hero count indicator

### Email Templates (`lib/email.ts`)
- `generateRetakesRequiredEmail()` — styled list of photos to retake with instructions + magic link
- `generatePhotosReadyEmail()` — delivery link + ZIP download link + hero count callout
- `generateRetakesReceivedAdminEmail()` — progress notification for admin

### Admin Complete Review
- **New API**: `POST /api/submissions/[id]/complete-review`
- Categorizes photos: approved, rejected, retakeNeeded, unreviewed
- Validation: errors if any unreviewed or zero approved
- If retakes needed: creates 30-day `retake_batch` magic link, sends email, increments retake round
- If all approved: generates hero versions, creates `delivery` magic link, sends email, marks completed
- Review Summary card in admin sidebar with counts and action buttons

### Client Retake Wizard (`/retakes/[token]`)
- Mobile-first design (target: retirees on smartphones)
- 48px+ buttons, 56px+ primary CTAs, 16px+ body text
- State machine: welcome → upload (one photo at a time) → summary → done
- Per photo: progress dots, room name, caption, admin instructions, original thumbnail, upload area
- HEIC support via `accept="image/*"`
- No login required (magic link auth)
- Links remain reusable for 30 days (not marked as used)

### Client Delivery Page (`/delivery/[token]`)
- Cover photos section: hero photos with before/after comparison
- All photos grid with before/after lightbox on tap
- Lightbox: side-by-side on desktop, stacked on mobile
- "Download This Photo" per image
- Sticky bottom bar on mobile for "Download All"
- Feedback section: thumbs up/down with optional notes

### ZIP Downloads
- **Admin**: `GET /api/submissions/[id]/download-zip` — streams ZIP with `enhanced/`, `originals/`, `cover-photos/` folders
- **Client**: `GET /api/delivery/download?token=` — enhanced + hero only (no originals)
- Uses `archiver` library for ZIP streaming
- Files named: `{02}-{Room}-{Caption}.jpg`

---

## Photo Guidance Round — Banners, Room Reassignment, File Naming

### Photo Guidance Banners
- **Problem**: Clients taking all photos ahead of time before starting submission, missing room-by-room tips
- **Landing page**: Added accent-green subtitle (`text-[#5a6349]`) between hero description and CTA — styled as inline text (not a banner) to match the landing page's card-based design language
- **Landing page**: Updated "How It Works" Step 1: "Upload Photos" → "Follow Our Guided Process"
- **Submission form**: Added warm beige info callout (`bg-[#f9f7f4] border-[#e2dfda]`) at top of Step 0 with `Smartphone` Lucide icon: "You don't need your photos ready yet!"
- **Visual consistency approach**: Audited existing CSS patterns per-page (colors, shadows, border styles, icon patterns) and documented them in the Deep Agent prompt to prevent styling drift — each page uses its own design language

### Admin Room Reassignment
- **Problem**: No way to fix photos submitted under the wrong room category
- Photo update API (`PATCH /api/photos/[id]`): added `roomCategory` and `subCategory` to accepted fields
- Admin detail page: static room labels (lines 643-646) replaced with inline `<select>` dropdowns matching existing status dropdown styling (`border border-gray-200 rounded-lg`)
- Subcategory dropdown conditionally appears for rooms with subcategories (Living Spaces, Exterior), disappears otherwise
- `handleRoomChange()`: clears subcategory, saves via PATCH, re-fetches submission to update sidebar grouping, auto-triggers re-enhancement with new room prompt if photo was already enhanced
- `handleSubCategoryChange()`: updates DB, auto-triggers re-enhancement
- **Enhancement history preserved**: Old `EnhancementVersion` records from the wrong room stay intact. New enhancement adds a new version on top — admin can see full progression in the Enhancement History panel
- **Design decision**: Auto re-enhancement after room change (not just save) because the enhancement used the wrong room's prompt

### Download File Naming
- **Problem**: S3 files have cryptic names (`1706123456-IMG_4523.jpg`) — meaningless when downloaded
- **Design decision**: Download-layer naming only — S3 paths stay as-is (no migration risk, no broken URLs)
- **New helper**: `buildDownloadFileName()` in `lib/s3.ts`
- Naming convention: `{Room}-{Caption}.jpg` (enhanced), `{Room}-{Caption}-original.jpg` (original), `HERO-{Room}-{Caption}.jpg` (hero)
- Uses subcategory when available (e.g., "Living-Room" not "Living-Spaces")
- Numbered variant for ZIP files: `01-Kitchen-Main-View.jpg`
- Designed to be reusable by Round 5 ZIP endpoints (replaces inline name-building in `DEEP_AGENT_PROMPT_ROUND5.md`)

---

## Round 6 — Parallel Enhancements + Multi-Model Selector

### Parallel Enhancements
- Replaced single `enhancing` boolean with per-photo `enhancingPhotos: Set<string>`
- `handleEnhance()` rewritten as fire-and-forget (`.then()/.catch()/.finally()`)
- Users can navigate to other photos and trigger multiple enhancements simultaneously
- Polling: `fetchSubmission()` every 5 seconds while any enhancements are in progress
- Spinner overlay on enhancing thumbnails in the photo grid
- Toast notifications (via `sonner`) for success/error instead of blocking `alert()`

### Multi-Model Selector
- **Schema**: Added `model String?` to `EnhancementVersion`
- **4 models available**:
  | Model | API ID | Strength |
  |---|---|---|
  | GPT Image 1.5 | `gpt-image-1.5` | Strong photorealism (default) |
  | FLUX.1 Kontext | `flux-kontext` | Structural edits |
  | Qwen Image Edit | `qwen-image-edit` | SOTA consistency |
  | Magnific Upscaler | `magnific` | Detail enhancement |
- 2x2 grid of model selection buttons in admin UI
- Enhancement history displays model name per version
- Auto-enhance route uses imported `DEFAULT_MODEL_ID`

---

## Key Architectural Decisions

Decisions made across sessions that shaped the codebase:

| Decision | Context | Choice | Why |
|----------|---------|--------|-----|
| Single-pass vs two-pass enhancement | Round 4 — content presets (add towels, clear counters) vs preservation prompts | Single-pass with `CREATIVE OVERRIDES` prompt section | GPT-Image-1.5 degrades after re-editing (compounding artifacts after 6-8 passes). Always enhance from `originalUrl`, never from previously enhanced image. |
| Retake workflow: linear vs cyclical | Round 5 — what happens after admin reviews retakes? | Cyclical — admin can request unlimited retake rounds | Real-world scenario: first retake round may still have issues. `retakeRound` counter tracks which cycle. Same `complete-review` endpoint handles every round. |
| Magic link reusability | Round 5 — retake links for retirees who need multiple sessions | `retake_batch` links never marked as `usedAt` | Retirees may take exterior shots on a sunny day and interior shots another day. 30-day window, progress preserved between sessions. |
| File naming: S3 vs download layer | Photo Guidance Round — photos have cryptic S3 names | Download-layer only | No migration needed, no risk of breaking existing URLs. `buildDownloadFileName()` applies human-readable names at ZIP/download time. |
| Visual consistency for Deep Agent | Photo Guidance Round — Deep Agent tends to introduce inconsistent styling | Audit CSS patterns per-page, document in prompt | Each page has its own design language (landing = beige cards no shadow, form = white cards with shadow-lg, admin = shadow-md). Prompt bans introducing new Tailwind colors. |
| Auto re-enhancement on room change | Photo Guidance Round — what happens after room reassignment? | Auto-trigger enhancement with new room prompt | The old enhancement used the wrong room's prompt. Old `EnhancementVersion` records preserved for history. |

---

## Implementation Status

| Round | Feature | Deep Agent Prompt | Deployed |
|-------|---------|-------------------|----------|
| Initial Build | Core platform | N/A (built directly) | ✅ |
| Debug A–D | S3, HEIC, enhancement fixes | N/A (debugged directly) | ✅ |
| Round 1 | Admin settings, photo limits, caption wizard | `DEEP_AGENT_PROMPT.md` | ✅ |
| Round 2 | Six UX improvements | `DEEP_AGENT_PROMPT_ROUND2.md` | ✅ |
| Round 3 | Preservation-first prompts | `DEEP_AGENT_PROMPT_ROUND3.md` | ✅ |
| Round 4 | Unified enhancement presets | `DEEP_AGENT_PROMPT_ROUND4.md` | ✅ |
| Round 5 | Client delivery workflow | `DEEP_AGENT_PROMPT_ROUND5.md` | ✅ |
| Round 6 | Parallel enhancements + multi-model | N/A (built directly) | ✅ |
| Photo Guidance | Banners + room reassignment + file naming | `DEEP_AGENT_PROMPT_PHOTO_GUIDANCE.md` | ✅ |

All Deep Agent prompts archived in `/Volumes/FastSSD/Downloads/Listing lift code/Old Prompts/` and `/Listing-Lift/Listing_Lift_Prototype_Development/Uploads/`.

---

## AI Model Evolution

| # | Model | Aspect Ratio | Outcome |
|---|---|---|---|
| 1 | `gpt-5.1` | — | Stream termination — wrong model type |
| 2 | `gpt-image-1` | `4:3` | 524 Cloudflare timeout (>100s) |
| 3 | `flux-kontext` | `4:3` | Fast but poor quality, added fake objects |
| 4 | `gpt-image-1.5` | `4:3` | Good quality — adopted as default |
| 5 | `gpt-image-1.5` | `3:2` | 504 timeout — unsupported ratio |
| 6 | `gpt-image-1.5` | `4:3` (reverted) | **Current production model** |

---

## Final Architecture

### Tech Stack
| Layer | Technology |
|---|---|
| Framework | Next.js 14.2 (App Router) |
| Language | TypeScript |
| Database | Prisma + PostgreSQL |
| Storage | AWS S3 (presigned URLs) |
| AI | Abacus AI RouteLLM (`gpt-image-1.5` default) |
| Image Processing | Sharp 0.34.5 (lanczos3 kernel) |
| HEIC Conversion | `heic-to` (client-side) + Sharp (server fallback) |
| ZIP Streaming | `archiver` |
| Auth | NextAuth (admin), Magic Links (clients) |
| UI | Tailwind CSS, Lucide React icons, Sonner toasts |

### Database Models
| Model | Purpose |
|---|---|
| `AdminUser` | Admin authentication |
| `Submission` | Property submission with contact info, status, review/delivery tracking |
| `Photo` | Per-photo metadata, S3 paths, enhancement status, hero flag |
| `EnhancementVersion` | Version history per photo with model, intensity, presets |
| `MagicLink` | Auth tokens for retake and delivery flows |
| `ClientReview` | Client feedback on delivered photos |
| `RoomEnhancementSettings` | Per-room AI enhancement configuration |

### All API Routes
| Route | Method | Purpose |
|---|---|---|
| `/api/upload/presigned` | POST | S3 presigned upload URL |
| `/api/file-url` | GET | Resolve S3 path to signed URL |
| `/api/convert-heic` | POST | Server-side HEIC conversion |
| `/api/submissions` | POST | Create submission |
| `/api/submissions/[id]` | GET | Submission detail |
| `/api/submissions/[id]/auto-enhance` | POST | Auto-enhance all photos |
| `/api/submissions/[id]/complete-review` | POST | Complete admin review |
| `/api/submissions/[id]/download-zip` | GET | Admin ZIP download |
| `/api/photos/[id]` | PATCH | Update photo metadata |
| `/api/photos/[id]/enhance` | POST | Manual enhancement |
| `/api/photos/[id]/generate-hero` | POST | Generate hero-size version |
| `/api/admin/settings` | GET/POST | Room enhancement settings |
| `/api/admin/cleanup-stale-urls` | POST | Clear old external URLs |
| `/api/auth/*` | * | NextAuth endpoints |
| `/api/magic-link/*` | GET/POST | Magic link validation |
| `/api/retakes` | GET | Validate retake link |
| `/api/retakes/upload` | POST | Presigned URL for retake |
| `/api/retakes/complete` | POST | Save/submit retakes |
| `/api/delivery` | GET | Validate delivery link |
| `/api/delivery/download` | GET | Client ZIP download |
| `/api/delivery/feedback` | POST | Client thumbs up/down |
