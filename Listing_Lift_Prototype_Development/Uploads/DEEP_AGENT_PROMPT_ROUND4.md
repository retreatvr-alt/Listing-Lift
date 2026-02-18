# Listing Lift — Round 4: Unified Enhancement Presets System

## Overview

Replace the existing 6 hardcoded toggles (Sky Replacement, Window Recovery, Brightness Boost, Bed Fixing, Perspective Fix, Reflection Removal) and 3 "Creative Additions" (Add Towels, Smooth Linens, Add Toilet Paper) in the admin re-enhancement UI with a **unified, category-organized preset system** containing ~35 presets across 11 room categories.

**Key concept**: Presets append prompt text under a `CREATIVE OVERRIDES` section that explicitly tells the AI model these changes override the base preservation rules. All enhancements still start from the ORIGINAL photo (single-pass, never re-edit an already-enhanced image).

**Important**: This change ONLY affects **manual re-enhancement** (admin dashboard). Auto-enhancement (`auto-enhance/route.ts`) is NOT modified and remains preservation-only.

---

## Files to Create/Modify

| # | File | Action |
|---|------|--------|
| 1 | `lib/enhancement-presets.ts` | **CREATE NEW** — Preset definitions, types, and helper functions |
| 2 | `prisma/schema.prisma` | Add `presetIds String?` to `EnhancementVersion` model |
| 3 | `app/api/photos/[id]/enhance/route.ts` | Accept `presetIds[]`, build prompt from presets |
| 4 | `app/admin/submissions/[id]/page.tsx` | Replace toggles/creative additions with unified preset UI |

**DO NOT modify**: `app/api/submissions/[id]/auto-enhance/route.ts`, `app/admin/settings/page.tsx`

---

## Change 1: Create `lib/enhancement-presets.ts`

Create this new file as the single source of truth for all enhancement presets:

```typescript
// Enhancement Presets — Single source of truth for all manual re-enhancement presets
// These presets append prompt text to override the base preservation rules
// Used ONLY in manual re-enhancement, NOT in auto-enhancement

export interface EnhancementPreset {
  id: string;
  label: string;
  description: string;
  promptText: string;
  roomTypes: string[]; // ["*"] = universal, or specific room keys
}

export interface PresetCategory {
  id: string;
  label: string;
  presets: EnhancementPreset[];
}

export const ENHANCEMENT_PRESET_CATEGORIES: PresetCategory[] = [
  {
    id: "universal",
    label: "Universal Corrections",
    presets: [
      {
        id: "sky-replacement",
        label: "Sky Replacement",
        description: "Replace overcast or gray sky with blue sky",
        promptText: "Replace the sky with a pleasant blue sky with natural clouds.",
        roomTypes: ["*"],
      },
      {
        id: "window-recovery",
        label: "Window Recovery",
        description: "Recover blown-out windows to show exterior view",
        promptText: "Recover blown-out windows to reveal the exterior view.",
        roomTypes: ["*"],
      },
      {
        id: "brightness-boost",
        label: "Brightness Boost",
        description: "Increase overall brightness and open shadows",
        promptText: "Increase overall brightness and open up shadow areas.",
        roomTypes: ["*"],
      },
      {
        id: "perspective-fix",
        label: "Perspective Fix",
        description: "Correct perspective distortion and straighten lines",
        promptText: "Correct perspective distortion and straighten vertical lines.",
        roomTypes: ["*"],
      },
      {
        id: "reflection-removal",
        label: "Reflection Removal",
        description: "Remove photographer reflections from glass/mirrors",
        promptText: "Remove photographer reflections from mirrors, glass, and screens.",
        roomTypes: ["*"],
      },
    ],
  },
  {
    id: "kitchen",
    label: "Kitchen",
    presets: [
      {
        id: "clear-countertops",
        label: "Clear Countertops",
        description: "Remove clutter from countertops",
        promptText: "Remove clutter and unnecessary items from countertops, leaving only decorative and essential items.",
        roomTypes: ["Kitchen"],
      },
      {
        id: "texture-smoothing",
        label: "Texture Smoothing",
        description: "Smooth and clean surface textures",
        promptText: "Smooth and clean countertop and surface textures for a polished appearance.",
        roomTypes: ["Kitchen"],
      },
      {
        id: "add-greenery-kitchen",
        label: "Add Greenery",
        description: "Add a small potted plant on the counter",
        promptText: "Add a small potted herb or plant on the counter for warmth.",
        roomTypes: ["Kitchen"],
      },
      {
        id: "under-cabinet-glow",
        label: "Under-Cabinet Glow",
        description: "Add warm under-cabinet lighting",
        promptText: "Enhance or add warm under-cabinet lighting.",
        roomTypes: ["Kitchen"],
      },
    ],
  },
  {
    id: "bedroom",
    label: "Bedroom",
    presets: [
      {
        id: "smooth-linens",
        label: "Smooth Linens",
        description: "Smooth bed linens to appear freshly made",
        promptText: "Smooth bed linens and duvet to appear freshly made and wrinkle-free.",
        roomTypes: ["Bedroom"],
      },
      {
        id: "add-throw-pillows",
        label: "Add Throw Pillows",
        description: "Add accent throw pillows",
        promptText: "Add accent throw pillows for a styled, inviting look.",
        roomTypes: ["Bedroom"],
      },
      {
        id: "bedside-styling",
        label: "Bedside Styling",
        description: "Add books, candle, or plant on nightstand",
        promptText: "Add tasteful bedside styling (books, candle, or small plant on nightstand).",
        roomTypes: ["Bedroom"],
      },
    ],
  },
  {
    id: "bathroom",
    label: "Bathroom",
    presets: [
      {
        id: "clean-grout-tile",
        label: "Clean Grout & Tile",
        description: "Brighten grout lines and tile surfaces",
        promptText: "Clean and brighten grout lines and tile surfaces for a fresh appearance.",
        roomTypes: ["Bathroom"],
      },
      {
        id: "add-toiletries",
        label: "Add Toiletries",
        description: "Add soap dispenser and amenity basket",
        promptText: "Add a soap dispenser and small amenity basket on the counter.",
        roomTypes: ["Bathroom"],
      },
      {
        id: "add-countertop-plant-bathroom",
        label: "Add Countertop Plant",
        description: "Add a small succulent or orchid",
        promptText: "Add a small succulent or orchid on the bathroom counter.",
        roomTypes: ["Bathroom"],
      },
      {
        id: "add-toilet-paper",
        label: "Add Toilet Paper",
        description: "Add a toilet paper roll if not visible",
        promptText: "Add a toilet paper roll next to the toilet if one is not visible.",
        roomTypes: ["Bathroom"],
      },
      {
        id: "add-towels",
        label: "Add Towels",
        description: "Add towels on towel rack if missing",
        promptText: "Add fresh, neatly folded white towels on the towel rack if towels are missing or sparse.",
        roomTypes: ["Bathroom"],
      },
    ],
  },
  {
    id: "living-room",
    label: "Living Room",
    presets: [
      {
        id: "style-coffee-table",
        label: "Style Coffee Table",
        description: "Add books, candle, and decorative tray",
        promptText: "Add tasteful styling to the coffee table (books, candle, decorative tray).",
        roomTypes: ["Living Room"],
      },
      {
        id: "add-indoor-plant",
        label: "Add Indoor Plant",
        description: "Add a green plant to bring life to the space",
        promptText: "Add a green indoor plant to bring life to the space.",
        roomTypes: ["Living Room"],
      },
      {
        id: "fireplace-glow",
        label: "Fireplace Glow",
        description: "Add warm firelight if fireplace exists",
        promptText: "Add warm firelight glow from the fireplace if one exists in the scene.",
        roomTypes: ["Living Room"],
      },
    ],
  },
  {
    id: "dining-room",
    label: "Dining Room",
    presets: [
      {
        id: "set-the-table",
        label: "Set the Table",
        description: "Add plates, glasses, and napkins",
        promptText: "Set the dining table with plates, glasses, and neatly folded napkins.",
        roomTypes: ["Dining Room/Dining Area"],
      },
      {
        id: "add-centerpiece",
        label: "Add Centerpiece",
        description: "Add flowers or candles to the table",
        promptText: "Add a centerpiece arrangement (flowers or candles) to the dining table.",
        roomTypes: ["Dining Room/Dining Area"],
      },
    ],
  },
  {
    id: "exterior-pool",
    label: "Exterior / Pool",
    presets: [
      {
        id: "pool-water-color",
        label: "Pool Water Color",
        description: "Make pool water crystal clear and blue",
        promptText: "Enhance pool water to appear crystal clear and vibrant blue.",
        roomTypes: ["Pool/Hot Tub", "Building Exterior"],
      },
      {
        id: "add-pool-toys",
        label: "Add Pool Toys",
        description: "Add colorful pool floats and noodles",
        promptText: "Add colorful pool toys (float, noodles) for a fun, inviting look.",
        roomTypes: ["Pool/Hot Tub"],
      },
      {
        id: "golden-hour-lighting",
        label: "Golden Hour Lighting",
        description: "Apply warm golden hour atmosphere",
        promptText: "Apply warm golden hour lighting for a dramatic, inviting atmosphere.",
        roomTypes: ["Pool/Hot Tub", "Building Exterior"],
      },
    ],
  },
  {
    id: "lawn-backyard",
    label: "Lawn / Backyard",
    presets: [
      {
        id: "greener-grass",
        label: "Greener Grass",
        description: "Make grass lush and vibrant green",
        promptText: "Enhance grass to appear lush, vibrant green.",
        roomTypes: ["Lawn/Backyard"],
      },
      {
        id: "enhanced-landscaping",
        label: "Enhanced Landscaping",
        description: "Fuller hedges and bushes",
        promptText: "Make hedges and bushes appear fuller and more maintained.",
        roomTypes: ["Lawn/Backyard"],
      },
      {
        id: "add-string-lights",
        label: "Add String Lights",
        description: "Add outdoor string lights for ambiance",
        promptText: "Add warm string lights or outdoor lighting for ambiance.",
        roomTypes: ["Lawn/Backyard"],
      },
    ],
  },
  {
    id: "foyer-entryway",
    label: "Foyer / Entryway",
    presets: [
      {
        id: "add-welcome-plant",
        label: "Add Welcome Plant",
        description: "Add a potted plant near the entryway",
        promptText: "Add a potted plant near the entryway for a welcoming touch.",
        roomTypes: ["Foyer/Entryway"],
      },
      {
        id: "door-hardware-polish",
        label: "Door/Hardware Polish",
        description: "Polish door hardware and handles",
        promptText: "Polish and enhance the appearance of door hardware and handles.",
        roomTypes: ["Foyer/Entryway"],
      },
    ],
  },
  {
    id: "home-theater",
    label: "Home Theater",
    presets: [
      {
        id: "screen-glow",
        label: "Screen Glow",
        description: "Add movie content glow on the screen",
        promptText: "Add a movie or content glow on the screen for an immersive feel.",
        roomTypes: ["Home Theater"],
      },
      {
        id: "ambient-led-lighting",
        label: "Ambient LED Lighting",
        description: "Add ambient LED strip lighting",
        promptText: "Enhance or add ambient LED strip lighting for atmosphere.",
        roomTypes: ["Home Theater"],
      },
    ],
  },
  {
    id: "game-room",
    label: "Game Room",
    presets: [
      {
        id: "enhanced-ambient-lighting-game",
        label: "Enhanced Ambient Lighting",
        description: "Enhance ambient or neon lighting",
        promptText: "Enhance ambient or neon lighting for an energetic atmosphere.",
        roomTypes: ["Game Room"],
      },
      {
        id: "equipment-polish",
        label: "Equipment Polish",
        description: "Clean and polish game equipment",
        promptText: "Clean and polish game equipment (pool table felt, arcade screens).",
        roomTypes: ["Game Room"],
      },
    ],
  },
];

// ── Flat lookup map: preset ID → EnhancementPreset ──
export const PRESET_MAP: Record<string, EnhancementPreset> = {};
for (const category of ENHANCEMENT_PRESET_CATEGORIES) {
  for (const preset of category.presets) {
    PRESET_MAP[preset.id] = preset;
  }
}

// ── Legacy boolean → preset ID mapping (backward compatibility) ──
export const LEGACY_TOGGLE_TO_PRESET: Record<string, string> = {
  skyReplacement: "sky-replacement",
  windowRecovery: "window-recovery",
  brightness: "brightness-boost",
  perspective: "perspective-fix",
  reflection: "reflection-removal",
  bedFixing: "smooth-linens",
  addTowels: "add-towels",
  smoothLinens: "smooth-linens",
  addToiletPaper: "add-toilet-paper",
};

// ── Helper: Get categories sorted with relevant ones first ──
export function getCategoriesForRoom(roomKey: string): PresetCategory[] {
  const universal: PresetCategory[] = [];
  const relevant: PresetCategory[] = [];
  const other: PresetCategory[] = [];

  for (const category of ENHANCEMENT_PRESET_CATEGORIES) {
    if (category.id === "universal") {
      universal.push(category);
    } else if (isCategoryRelevantToRoom(category, roomKey)) {
      relevant.push(category);
    } else {
      other.push(category);
    }
  }

  return [...universal, ...relevant, ...other];
}

// ── Helper: Check if a category is relevant to a room ──
export function isCategoryRelevantToRoom(
  category: PresetCategory,
  roomKey: string
): boolean {
  if (category.id === "universal") return true;
  return category.presets.some(
    (p) => p.roomTypes.includes("*") || p.roomTypes.includes(roomKey)
  );
}

// ── Helper: Build prompt text from an array of preset IDs ──
export function buildPresetPromptText(presetIds: string[]): string {
  const texts = presetIds
    .map((id) => PRESET_MAP[id]?.promptText)
    .filter(Boolean);
  if (texts.length === 0) return "";
  return `\n\nCREATIVE OVERRIDES — The following changes are INTENTIONAL and override the preservation rules above. Apply ONLY these specific modifications while keeping everything else exactly as-is:\n${texts.map(t => `- ${t}`).join("\n")}`;
}

// ── Helper: Convert legacy boolean flags to preset IDs (for history display) ──
export function legacyTogglesToPresetIds(version: {
  skyReplacement?: boolean;
  bedFixing?: boolean;
  windowRecovery?: boolean;
  brightness?: boolean;
  perspective?: boolean;
  reflection?: boolean;
  addTowels?: boolean;
  smoothLinens?: boolean;
  addToiletPaper?: boolean;
}): string[] {
  const ids: string[] = [];
  for (const [key, presetId] of Object.entries(LEGACY_TOGGLE_TO_PRESET)) {
    if ((version as Record<string, unknown>)[key]) {
      ids.push(presetId);
    }
  }
  return ids;
}
```

---

## Change 2: Update `prisma/schema.prisma`

Add `presetIds` field to the `EnhancementVersion` model. Find the model around line 62-78. Add the new field AFTER `additionalNotes` (line 76):

**Before:**
```prisma
  additionalNotes String?
  createdAt       DateTime @default(now())
```

**After:**
```prisma
  additionalNotes String?
  presetIds       String?  // JSON array of preset IDs, e.g. '["sky-replacement","add-towels"]'
  createdAt       DateTime @default(now())
```

**IMPORTANT:** Do NOT remove any existing boolean fields (`skyReplacement`, `bedFixing`, etc.). They must remain for backward compatibility with existing enhancement history records.

After modifying the schema, run:
```bash
npx prisma migrate dev --name add-preset-ids
```

Then regenerate the Prisma client:
```bash
npx prisma generate
```

---

## Change 3: Update `app/api/photos/[id]/enhance/route.ts`

### 3a. Add import at the top of the file

After the existing imports (around line 3-4), add:

```typescript
import { PRESET_MAP, buildPresetPromptText } from "@/lib/enhancement-presets";
```

### 3b. Accept `presetIds` in the destructured request body

Find the destructured body around lines 23-37. Add `presetIds`:

**Add this line** alongside the existing destructured variables:

```typescript
const presetIds: string[] = data.presetIds || [];
```

### 3c. Update prompt building logic

Find the prompt building section (lines 66-97). Replace the ELSE branch with a dual approach that supports both new presets AND legacy booleans:

**Replace lines 71-92** (the else branch after `if (customPrompt && customPrompt.trim().length > 0)`) with:

```typescript
    } else {
      const roomKey = photo.subCategory || photo.roomCategory;
      prompt = ROOM_PROMPTS[roomKey] || ROOM_PROMPTS[photo.roomCategory] || ROOM_PROMPTS["Kitchen"];
      prompt += INTENSITY_MODIFIERS[intensity] || INTENSITY_MODIFIERS["Moderate"];

      // NEW: If presetIds are provided, use the preset system
      if (presetIds.length > 0) {
        prompt += buildPresetPromptText(presetIds);
      } else {
        // LEGACY: Fall back to boolean toggles for backward compatibility
        const toggles: string[] = [];
        if (skyReplacement) toggles.push("Replace the sky with a pleasant blue sky with natural clouds.");
        if (bedFixing) toggles.push("Smooth and fix bed linens to appear crisp, clean, and hotel-quality.");
        if (windowRecovery) toggles.push("Recover blown-out windows to reveal the exterior view.");
        if (brightness) toggles.push("Increase overall brightness and open up shadow areas.");
        if (perspective) toggles.push("Correct perspective distortion and straighten vertical lines.");
        if (reflection) toggles.push("Remove photographer reflections from mirrors, glass, and screens.");
        if (addTowels) toggles.push("Add fresh, neatly folded white towels if towels are missing or sparse.");
        if (smoothLinens) toggles.push("Smooth bed linens and duvet to appear freshly made and wrinkle-free.");
        if (addToiletPaper) toggles.push("Add a toilet paper roll if one is not visible.");
        if (toggles.length > 0) {
          prompt += `\n\nADDITIONAL SPECIFIC INSTRUCTIONS:\n${toggles.join("\n")}`;
        }
      }

      if (additionalNotes) {
        prompt += `\n\nADMIN NOTES:\n${additionalNotes}`;
      }
    }
```

### 3d. Update EnhancementVersion.create()

Find the `prisma.enhancementVersion.create()` call (around line 243-258). Add `presetIds` to the data object:

**Add this line** after `additionalNotes: additionalNotes || null,`:

```typescript
          presetIds: presetIds.length > 0 ? JSON.stringify(presetIds) : null,
```

---

## Change 4: Update `app/admin/submissions/[id]/page.tsx`

This is the largest change — replacing the toggles UI with the unified preset system.

### 4a. Update imports (line 13-14)

**Replace:**
```typescript
import { ROOM_PROMPTS, INTENSITY_MODIFIERS } from "@/lib/enhancement-prompts";
import { MODEL_OPTIONS, DEFAULT_MODEL_ID, MODEL_DISPLAY_NAMES } from "@/lib/model-configs";
```

**With:**
```typescript
import { ROOM_PROMPTS, INTENSITY_MODIFIERS } from "@/lib/enhancement-prompts";
import { MODEL_OPTIONS, DEFAULT_MODEL_ID, MODEL_DISPLAY_NAMES } from "@/lib/model-configs";
import {
  ENHANCEMENT_PRESET_CATEGORIES,
  PRESET_MAP,
  getCategoriesForRoom,
  isCategoryRelevantToRoom,
  buildPresetPromptText,
  legacyTogglesToPresetIds,
} from "@/lib/enhancement-presets";
```

Also add `ChevronDown` to the lucide-react imports (line 10-11). Find the existing import line and add it:

```typescript
import {
  Loader2, ArrowLeft, User, Mail, Phone, MapPin, FileText,
  Camera, CheckCircle, XCircle, X, RotateCcw, Star, Download,
  ChevronLeft, ChevronRight, ChevronDown, Sliders, Send, Archive, History, Clock
} from "lucide-react";
```

### 4b. Update the Photo interface (lines 29-43)

Add `presetIds` to the enhancementVersions type:

**Find:**
```typescript
    additionalNotes?: string;
    createdAt: string;
  }>;
```

**Replace with:**
```typescript
    additionalNotes?: string;
    presetIds?: string;
    createdAt: string;
  }>;
```

### 4c. Update `enhanceSettings` state (lines 71-84)

**Replace:**
```typescript
  const [enhanceSettings, setEnhanceSettings] = useState({
    intensity: 'Moderate',
    model: DEFAULT_MODEL_ID,
    skyReplacement: false,
    bedFixing: false,
    windowRecovery: false,
    brightness: false,
    perspective: false,
    reflection: false,
    additionalNotes: '',
    addTowels: false,
    smoothLinens: false,
    addToiletPaper: false
  });
```

**With:**
```typescript
  const [enhanceSettings, setEnhanceSettings] = useState({
    intensity: 'Moderate',
    model: DEFAULT_MODEL_ID,
    additionalNotes: '',
    selectedPresets: new Set<string>(),
  });
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
```

### 4d. Update `buildCurrentPrompt()` (lines 224-252)

**Replace the entire function with:**
```typescript
  const buildCurrentPrompt = (): string => {
    if (!selectedPhoto) return '';

    const roomKey = selectedPhoto.subCategory || selectedPhoto.roomCategory;
    let prompt = ROOM_PROMPTS[roomKey] || ROOM_PROMPTS[selectedPhoto.roomCategory] || ROOM_PROMPTS["Kitchen"];
    prompt += INTENSITY_MODIFIERS[enhanceSettings.intensity] || INTENSITY_MODIFIERS["Moderate"];

    const presetIds = Array.from(enhanceSettings.selectedPresets);
    if (presetIds.length > 0) {
      prompt += buildPresetPromptText(presetIds);
    }

    if (enhanceSettings.additionalNotes) {
      prompt += `\n\nADMIN NOTES:\n${enhanceSettings.additionalNotes}`;
    }

    return prompt;
  };
```

### 4e. Update `handleEnhance()` (lines 254-305)

**Replace the body construction (line 269):**

**Find:**
```typescript
    const body: Record<string, unknown> = { ...enhanceSettings };
```

**Replace with:**
```typescript
    const body: Record<string, unknown> = {
      intensity: enhanceSettings.intensity,
      model: enhanceSettings.model,
      additionalNotes: enhanceSettings.additionalNotes,
      presetIds: Array.from(enhanceSettings.selectedPresets),
    };
```

### 4f. Update photo selection handler (lines 531-551)

**Replace the entire onClick handler body** (inside the `onClick={() => {` block starting at line 531):

```typescript
                          onClick={() => {
                              setSelectedPhoto(photo);
                              // Load room-specific defaults
                              const roomKey = photo.subCategory || photo.roomCategory;
                              const dbSettings = roomSettingsMap.get(roomKey) || roomSettingsMap.get(photo.roomCategory);

                              // Convert legacy DB room defaults to preset IDs
                              const defaultPresets = new Set<string>();
                              if (dbSettings) {
                                const legacyIds = legacyTogglesToPresetIds(dbSettings);
                                legacyIds.forEach(id => defaultPresets.add(id));
                                setEnhanceSettings({
                                  intensity: dbSettings.defaultIntensity || 'Moderate',
                                  model: dbSettings.defaultModel || DEFAULT_MODEL_ID,
                                  additionalNotes: '',
                                  selectedPresets: defaultPresets,
                                });
                              } else {
                                setEnhanceSettings({
                                  intensity: 'Moderate',
                                  model: DEFAULT_MODEL_ID,
                                  additionalNotes: '',
                                  selectedPresets: new Set(),
                                });
                              }

                              // Auto-expand relevant categories, collapse others
                              const newCollapsed = new Set<string>();
                              ENHANCEMENT_PRESET_CATEGORIES.forEach(cat => {
                                if (cat.id !== "universal" && !isCategoryRelevantToRoom(cat, roomKey)) {
                                  newCollapsed.add(cat.id);
                                }
                              });
                              setCollapsedCategories(newCollapsed);
                            }}
```

### 4g. Replace Toggles + Creative Additions UI (lines 795-846)

Find these two sections and **REMOVE** them entirely:

1. The "Toggles" grid (lines 795-818): `{/* Toggles */}` ... `</div>`
2. The "Creative Additions" section (lines 820-846): `{/* Creative Additions */}` ... `</div>`

**Replace both sections with this unified preset UI:**

```tsx
                    {/* Enhancement Presets */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        Enhancement Presets
                        {enhanceSettings.selectedPresets.size > 0 && (
                          <span className="text-xs text-[#383D31] bg-[#383D31]/10 px-2 py-0.5 rounded-full">
                            {enhanceSettings.selectedPresets.size} selected
                          </span>
                        )}
                      </label>

                      <div className="space-y-2">
                        {(() => {
                          const roomKey = selectedPhoto?.subCategory || selectedPhoto?.roomCategory || '';
                          const sortedCategories = getCategoriesForRoom(roomKey);

                          return sortedCategories.map((category) => {
                            const isRelevant = isCategoryRelevantToRoom(category, roomKey);
                            const isUniversal = category.id === "universal";
                            const isCollapsed = collapsedCategories.has(category.id);
                            const selectedInCategory = category.presets.filter(
                              p => enhanceSettings.selectedPresets.has(p.id)
                            ).length;

                            return (
                              <div
                                key={category.id}
                                className={`border rounded-lg overflow-hidden ${
                                  isRelevant
                                    ? 'border-[#383D31]/30 bg-[#383D31]/[0.02]'
                                    : 'border-gray-200'
                                }`}
                              >
                                {/* Category header */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCollapsedCategories(prev => {
                                      const next = new Set(prev);
                                      if (next.has(category.id)) {
                                        next.delete(category.id);
                                      } else {
                                        next.add(category.id);
                                      }
                                      return next;
                                    });
                                  }}
                                  className={`w-full flex items-center justify-between px-3 py-2 text-left ${
                                    isRelevant
                                      ? 'bg-[#383D31]/5 hover:bg-[#383D31]/10'
                                      : 'bg-gray-50 hover:bg-gray-100'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className={`text-sm font-medium ${
                                      isRelevant ? 'text-[#383D31]' : 'text-gray-600'
                                    }`}>
                                      {category.label}
                                    </span>
                                    {isRelevant && !isUniversal && (
                                      <span className="text-xs bg-[#383D31]/10 text-[#383D31] px-1.5 py-0.5 rounded">
                                        Recommended
                                      </span>
                                    )}
                                    {selectedInCategory > 0 && (
                                      <span className="text-xs bg-[#383D31] text-white px-1.5 py-0.5 rounded-full">
                                        {selectedInCategory}
                                      </span>
                                    )}
                                  </div>
                                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${
                                    isCollapsed ? '-rotate-90' : ''
                                  }`} />
                                </button>

                                {/* Presets list */}
                                {!isCollapsed && (
                                  <div className="px-3 py-2 space-y-1">
                                    {category.presets.map((preset) => (
                                      <label
                                        key={preset.id}
                                        className="flex items-start gap-2 p-1.5 rounded cursor-pointer hover:bg-gray-50"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={enhanceSettings.selectedPresets.has(preset.id)}
                                          onChange={(e) => {
                                            setEnhanceSettings(prev => {
                                              const next = new Set(prev.selectedPresets);
                                              if (e.target.checked) {
                                                next.add(preset.id);
                                              } else {
                                                next.delete(preset.id);
                                              }
                                              return { ...prev, selectedPresets: next };
                                            });
                                          }}
                                          className="rounded text-[#383D31] mt-0.5"
                                        />
                                        <div>
                                          <span className="text-sm font-medium">{preset.label}</span>
                                          <p className="text-xs text-gray-500">{preset.description}</p>
                                        </div>
                                      </label>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
```

### 4h. Update Enhancement History display (lines 935-942)

**Find:**
```typescript
                          const activeToggles = [
                            version.skyReplacement && 'Sky',
                            version.bedFixing && 'Bed',
                            version.windowRecovery && 'Window',
                            version.brightness && 'Brightness',
                            version.perspective && 'Perspective',
                            version.reflection && 'Reflection',
                          ].filter(Boolean);
```

**Replace with:**
```typescript
                          const activeToggles = (() => {
                            // New records: use presetIds JSON
                            if (version.presetIds) {
                              try {
                                const ids: string[] = JSON.parse(version.presetIds);
                                return ids.map(id => PRESET_MAP[id]?.label || id);
                              } catch { /* fall through to legacy */ }
                            }
                            // Legacy records: use boolean fields
                            return [
                              version.skyReplacement && 'Sky',
                              version.bedFixing && 'Bed',
                              version.windowRecovery && 'Window',
                              version.brightness && 'Brightness',
                              version.perspective && 'Perspective',
                              version.reflection && 'Reflection',
                            ].filter(Boolean);
                          })();
```

---

## Verification Checklist

After implementing all changes:

1. **Database migration**: Run `npx prisma migrate dev --name add-preset-ids` and `npx prisma generate` — should complete without errors.

2. **Preset UI renders**: Navigate to admin dashboard → select a submission → select a photo. You should see:
   - Model selector (unchanged)
   - Intensity selector (unchanged)
   - **NEW**: "Enhancement Presets" section with collapsible categories
   - Additional Notes textarea (unchanged)
   - Prompt editor (unchanged)

3. **Room-aware categories**:
   - Select a Kitchen photo → "Universal Corrections" and "Kitchen" categories auto-expanded, all others collapsed
   - Select a Bathroom photo → "Universal Corrections" and "Bathroom" auto-expanded
   - "Kitchen" category should show "Recommended" badge when viewing Kitchen photos

4. **Cross-room access**: Click on a collapsed category → it expands → you can select presets from other room types

5. **Preset selection**: Check "Sky Replacement" and "Clear Countertops" → the "2 selected" badge should appear at the top. Category badges should update.

6. **Prompt preview**: Click "Edit Prompt" → the prompt should show the base preservation prompt + intensity modifier + `CREATIVE OVERRIDES` section with the selected preset texts.

7. **Enhancement works**: Click "Enhance" → the API should receive `presetIds: ["sky-replacement", "clear-countertops"]` → enhancement should complete successfully.

8. **Enhancement History**:
   - New enhancements should show preset labels (e.g., "+Sky Replacement, Clear Countertops")
   - Old enhancements (before this change) should still show legacy toggle names (e.g., "+Sky, Bed")

9. **Auto-enhancement NOT affected**: Submit a new listing → auto-enhancement should still use preservation-only prompts with NO presets.

---

## Important Notes

- **Do NOT modify** `app/api/submissions/[id]/auto-enhance/route.ts` — auto-enhancement remains preservation-only
- **Do NOT modify** `app/admin/settings/page.tsx` — admin settings control auto-enhancement defaults only
- **Do NOT remove** existing boolean fields from `prisma/schema.prisma` — needed for backward compatibility
- **Keep legacy toggle handling** in the enhance API — for backward compatibility with any old calls
- All enhancements always use the **original photo** (`originalUrl`), never the enhanced version — this is correct and must not change
