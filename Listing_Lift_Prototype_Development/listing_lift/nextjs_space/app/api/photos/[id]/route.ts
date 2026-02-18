import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export const dynamic = "force-dynamic";

// PATCH - Update photo status/settings
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const { status, isHero, rejectionReason, reuploadInstructions, enhancedUrl, heroUrl, roomCategory, subCategory } = data;

    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status;
    if (isHero !== undefined) {
      updateData.isHero = isHero;
    }
    if (rejectionReason !== undefined) updateData.rejectionReason = rejectionReason;
    if (reuploadInstructions !== undefined) updateData.reuploadInstructions = reuploadInstructions;
    if (enhancedUrl !== undefined) updateData.enhancedUrl = enhancedUrl;
    if (heroUrl !== undefined) updateData.heroUrl = heroUrl;
    if (roomCategory !== undefined) updateData.roomCategory = roomCategory;
    if (subCategory !== undefined) updateData.subCategory = subCategory;

    const photo = await prisma.photo.update({
      where: { id: params.id },
      data: updateData
    });

    return NextResponse.json({ success: true, photo });
  } catch (error) {
    console.error("Update photo error:", error);
    return NextResponse.json({ error: "Failed to update photo" }, { status: 500 });
  }
}
