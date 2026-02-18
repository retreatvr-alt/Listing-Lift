import { NextResponse } from "next/server";
import { generatePresignedUploadUrl } from "@/lib/s3";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { fileName, contentType, isPublic = true } = await request.json();

    if (!fileName || !contentType) {
      return NextResponse.json(
        { error: "fileName and contentType are required" },
        { status: 400 }
      );
    }

    const { uploadUrl, cloud_storage_path } = await generatePresignedUploadUrl(
      fileName,
      contentType,
      isPublic
    );

    return NextResponse.json({
      uploadUrl,
      cloud_storage_path
    });
  } catch (error) {
    console.error("Presigned URL error:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}
