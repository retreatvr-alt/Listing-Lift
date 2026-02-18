import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFileUrl } from "@/lib/s3";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    const magicLink = await prisma.magicLink.findUnique({
      where: { token },
      include: {
        submission: {
          include: {
            photos: {
              where: { status: "Approved" },
              orderBy: { sortOrder: "asc" },
            },
          },
        },
      },
    });

    if (!magicLink) {
      return NextResponse.json({ error: "Invalid link" }, { status: 404 });
    }

    if (magicLink.type !== "delivery") {
      return NextResponse.json({ error: "Invalid link type" }, { status: 400 });
    }

    if (magicLink.expiresAt < new Date()) {
      return NextResponse.json({ error: "Link expired" }, { status: 410 });
    }

    // Resolve all photo URLs
    const photosWithUrls = await Promise.all(
      magicLink.submission.photos.map(async (photo) => ({
        id: photo.id,
        roomCategory: photo.roomCategory,
        subCategory: photo.subCategory,
        caption: photo.caption,
        isHero: photo.isHero,
        orientation: photo.orientation,
        originalUrl: photo.originalUrl ? await getFileUrl(photo.originalUrl) : null,
        enhancedUrl: photo.enhancedUrl ? await getFileUrl(photo.enhancedUrl) : null,
        heroUrl: photo.heroUrl ? await getFileUrl(photo.heroUrl) : null,
      }))
    );

    return NextResponse.json({
      valid: true,
      submission: {
        id: magicLink.submission.id,
        homeownerName: magicLink.submission.homeownerName,
        propertyAddress: magicLink.submission.propertyAddress,
        submissionNumber: magicLink.submission.submissionNumber,
      },
      photos: photosWithUrls,
      heroPhotos: photosWithUrls.filter((p) => p.isHero),
      expiresAt: magicLink.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Delivery validation error:", error);
    return NextResponse.json({ error: "Validation failed" }, { status: 500 });
  }
}
