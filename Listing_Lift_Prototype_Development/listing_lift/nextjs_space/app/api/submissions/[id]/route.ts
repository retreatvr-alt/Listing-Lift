import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export const dynamic = "force-dynamic";

// GET - Get single submission
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const submission = await prisma.submission.findUnique({
      where: { id: params.id },
      include: {
        photos: {
          include: {
            enhancementVersions: {
              orderBy: { versionNumber: 'desc' }
            }
          },
          orderBy: [{ roomCategory: 'asc' }, { sortOrder: 'asc' }]
        }
      }
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    return NextResponse.json({ submission });
  } catch (error) {
    console.error("Get submission error:", error);
    return NextResponse.json({ error: "Failed to fetch submission" }, { status: 500 });
  }
}

// PATCH - Update submission status
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
    const { status } = data;

    const updateData: Record<string, unknown> = { status };
    
    if (status === 'Completed') {
      updateData.completedAt = new Date();
      // Schedule deletion for 3 weeks from now
      const deletionDate = new Date();
      deletionDate.setDate(deletionDate.getDate() + 21);
      updateData.deletionScheduledAt = deletionDate;
    }

    const submission = await prisma.submission.update({
      where: { id: params.id },
      data: updateData
    });

    return NextResponse.json({ success: true, submission });
  } catch (error) {
    console.error("Update submission error:", error);
    return NextResponse.json({ error: "Failed to update submission" }, { status: 500 });
  }
}
