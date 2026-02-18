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
              where: { status: "Re-upload Requested" },
              orderBy: { sortOrder: "asc" },
            },
          },
        },
      },
    });

    if (!magicLink) {
      return NextResponse.json({ error: "Invalid link" }, { status: 404 });
    }

    if (magicLink.type !== "retake_batch") {
      return NextResponse.json({ error: "Invalid link type" }, { status: 400 });
    }

    if (magicLink.expiresAt < new Date()) {
      return NextResponse.json({ error: "Link expired" }, { status: 410 });
    }

    // Note: we do NOT check usedAt for retake_batch links (multi-session)

    // Resolve original photo URLs for thumbnails
    const photosWithUrls = await Promise.all(
      magicLink.submission.photos.map(async (photo) => ({
        id: photo.id,
        roomCategory: photo.roomCategory,
        subCategory: photo.subCategory,
        caption: photo.caption,
        reuploadInstructions: photo.reuploadInstructions,
        originalUrl: photo.originalUrl ? await getFileUrl(photo.originalUrl) : null,
        status: photo.status,
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
      retakePhotos: photosWithUrls,
    });
  } catch (error) {
    console.error("Validate retakes error:", error);
    return NextResponse.json({ error: "Validation failed" }, { status: 500 });
  }
}
