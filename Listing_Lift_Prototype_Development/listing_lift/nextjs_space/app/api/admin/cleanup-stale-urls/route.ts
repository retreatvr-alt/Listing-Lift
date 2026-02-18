import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Clear Photo records with external URLs as enhancedUrl
  const photoResult = await prisma.photo.updateMany({
    where: {
      enhancedUrl: { startsWith: "http" }
    },
    data: {
      enhancedUrl: null,
      status: "Pending"
    }
  });

  // 2. Delete EnhancementVersion records that point to external URLs
  // These cause CORS errors when the UI tries to resolve them
  const versionResult = await prisma.enhancementVersion.deleteMany({
    where: {
      enhancedUrl: { startsWith: "http" }
    }
  });

  // 3. Also clean up any Photo heroUrl that points to external URLs
  const heroResult = await prisma.photo.updateMany({
    where: {
      heroUrl: { startsWith: "http" }
    },
    data: {
      heroUrl: null
    }
  });

  console.log(`[CLEANUP] Photos cleared: ${photoResult.count}, Versions deleted: ${versionResult.count}, Hero URLs cleared: ${heroResult.count}`);

  return NextResponse.json({ 
    photosCleared: photoResult.count,
    versionsDeleted: versionResult.count,
    heroUrlsCleared: heroResult.count,
    message: `Cleared ${photoResult.count} photo URLs, deleted ${versionResult.count} stale enhancement versions, cleared ${heroResult.count} hero URLs` 
  });
}
