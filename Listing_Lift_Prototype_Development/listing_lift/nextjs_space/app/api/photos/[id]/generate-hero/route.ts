import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getFileUrl, resizeImageToAirbnb, uploadBufferToS3 } from "@/lib/s3";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const photo = await prisma.photo.findUnique({
      where: { id: params.id },
    });

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    if (!photo.enhancedUrl) {
      return NextResponse.json({ error: "Photo not yet enhanced" }, { status: 400 });
    }

    // Download the enhanced image from S3
    const enhancedImageUrl = await getFileUrl(photo.enhancedUrl, true);
    const imageResponse = await fetch(enhancedImageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download enhanced image: ${imageResponse.status}`);
    }
    const rawBuffer = Buffer.from(await imageResponse.arrayBuffer());

    // Resize to hero dimensions (4000x2667 or 2667x4000)
    const heroBuffer = await resizeImageToAirbnb(rawBuffer, photo.orientation, true);

    // Upload hero version to S3
    const heroS3Key = await uploadBufferToS3(
      heroBuffer,
      `hero-${photo.id}.jpg`,
      "image/jpeg"
    );

    // Update photo record
    await prisma.photo.update({
      where: { id: params.id },
      data: { heroUrl: heroS3Key },
    });

    return NextResponse.json({ success: true, heroUrl: heroS3Key });
  } catch (error) {
    console.error("Generate hero error:", error);
    return NextResponse.json({ error: "Failed to generate hero version" }, { status: 500 });
  }
}
