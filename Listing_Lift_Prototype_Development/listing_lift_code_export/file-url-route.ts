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

    const url = await getFileUrl(path, true);
    return NextResponse.json({ url });
  } catch (error) {
    console.error("Get file URL error:", error);
    return NextResponse.json({ error: "Failed to get URL" }, { status: 500 });
  }
}
