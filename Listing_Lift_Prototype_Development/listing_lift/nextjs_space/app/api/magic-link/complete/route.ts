import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { token, photos } = await request.json();

    if (!token || !photos) {
      return NextResponse.json({ error: "Token and photos required" }, { status: 400 });
    }

    const magicLink = await prisma.magicLink.findUnique({
      where: { token },
      include: { submission: true }
    });

    if (!magicLink || magicLink.expiresAt < new Date()) {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 400 });
    }

    // Update photos with new URLs
    for (const photo of photos) {
      await prisma.photo.update({
        where: { id: photo.id },
        data: {
          originalUrl: photo.originalUrl,
          status: 'Pending',
          enhancedUrl: null,
          reuploadInstructions: null
        }
      });
    }

    // Mark magic link as used
    await prisma.magicLink.update({
      where: { token },
      data: { usedAt: new Date() }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Complete reupload error:", error);
    return NextResponse.json({ error: "Failed to complete reupload" }, { status: 500 });
  }
}
