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
