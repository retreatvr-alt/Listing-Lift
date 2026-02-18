import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generatePresignedUploadUrl } from "@/lib/s3";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { token, photoId, fileName, contentType } = await request.json();

    if (!token || !photoId || !fileName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate magic link
    const magicLink = await prisma.magicLink.findUnique({
      where: { token },
    });

    if (!magicLink || magicLink.type !== "retake_batch" || magicLink.expiresAt < new Date()) {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 400 });
    }

    // Validate photo belongs to this submission
    const photo = await prisma.photo.findFirst({
      where: { id: photoId, submissionId: magicLink.submissionId },
    });

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Generate presigned upload URL
    const { uploadUrl, cloud_storage_path } = await generatePresignedUploadUrl(
      fileName,
      contentType || "image/jpeg"
    );

    return NextResponse.json({
      success: true,
      uploadUrl,
      cloud_storage_path,
    });
  } catch (error) {
    console.error("Retake upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
