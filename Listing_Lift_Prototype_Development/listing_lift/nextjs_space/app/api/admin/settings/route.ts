import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { ROOM_PROMPTS } from "@/lib/enhancement-prompts";
import { DEFAULT_MODEL_ID } from "@/lib/model-configs";

export const dynamic = "force-dynamic";

// Complete list of room keys (only actual sub-rooms, not parent categories)
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

// Default settings for a room
function getDefaultSettings(roomKey: string) {
  return {
    roomKey,
    defaultModel: DEFAULT_MODEL_ID,
    defaultIntensity: "Moderate",
    skyReplacement: false,
    bedFixing: false,
    windowRecovery: false,
    brightness: false,
    perspective: false,
    reflection: false,
    customPrompt: ROOM_PROMPTS[roomKey] ?? null,
    hasDbRecord: false
  };
}

// GET: Fetch all room settings (merged with defaults)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all saved settings from DB
    const dbSettings = await prisma.roomEnhancementSettings.findMany();
    const dbSettingsMap = new Map(dbSettings.map(s => [s.roomKey, s]));

    // Merge with defaults for all room keys
    const settings = ALL_ROOM_KEYS.map(roomKey => {
      const dbRecord = dbSettingsMap.get(roomKey);
      if (dbRecord) {
        return {
          roomKey: dbRecord.roomKey,
          defaultModel: dbRecord.defaultModel,
          defaultIntensity: dbRecord.defaultIntensity,
          skyReplacement: dbRecord.skyReplacement,
          bedFixing: dbRecord.bedFixing,
          windowRecovery: dbRecord.windowRecovery,
          brightness: dbRecord.brightness,
          perspective: dbRecord.perspective,
          reflection: dbRecord.reflection,
          customPrompt: dbRecord.customPrompt ?? ROOM_PROMPTS[roomKey] ?? null,
          hasDbRecord: true
        };
      }
      return getDefaultSettings(roomKey);
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("[SETTINGS GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// POST: Upsert settings for a room
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      roomKey,
      defaultModel,
      defaultIntensity,
      skyReplacement,
      bedFixing,
      windowRecovery,
      brightness,
      perspective,
      reflection,
      customPrompt
    } = body;

    if (!roomKey || !ALL_ROOM_KEYS.includes(roomKey)) {
      return NextResponse.json(
        { error: "Invalid or missing roomKey" },
        { status: 400 }
      );
    }

    const data = {
      defaultModel: defaultModel || DEFAULT_MODEL_ID,
      defaultIntensity: defaultIntensity || "Moderate",
      skyReplacement: skyReplacement ?? false,
      bedFixing: bedFixing ?? false,
      windowRecovery: windowRecovery ?? false,
      brightness: brightness ?? false,
      perspective: perspective ?? false,
      reflection: reflection ?? false,
      customPrompt: customPrompt || null
    };

    const result = await prisma.roomEnhancementSettings.upsert({
      where: { roomKey },
      update: data,
      create: {
        roomKey,
        ...data
      }
    });

    return NextResponse.json({
      success: true,
      setting: {
        ...result,
        hasDbRecord: true
      }
    });
  } catch (error) {
    console.error("[SETTINGS POST] Error:", error);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}
