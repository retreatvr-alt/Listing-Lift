import { NextResponse } from "next/server";
import { getFileUrl } from "@/lib/s3";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json({ error: "Path required" }, { status: 400 });
    }

    // Use presigned URL (isPublic: false) to ensure access works regardless of bucket policy
    const url = await getFileUrl(path, false);
    return NextResponse.json({ url });
  } catch (error) {
    console.error("Get file URL error:", error);
    return NextResponse.json({ error: "Failed to get URL" }, { status: 500 });
  }
}
