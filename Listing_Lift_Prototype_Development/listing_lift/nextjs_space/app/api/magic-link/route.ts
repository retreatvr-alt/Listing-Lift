import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { sendNotificationEmail, generateMagicLinkEmail } from "@/lib/email";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// POST - Create magic link (admin only)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { submissionId, instructions } = await request.json();

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        photos: {
          where: { status: 'Re-upload Requested' }
        }
      }
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiry

    await prisma.magicLink.create({
      data: {
        token,
        submissionId,
        expiresAt
      }
    });

    const magicLink = `${process.env.NEXTAUTH_URL}/reupload/${token}`;

    // Send email with magic link
    await sendNotificationEmail({
      notificationId: process.env.NOTIF_ID_REUPLOAD_ACCESS_LINK || '',
      recipientEmail: submission.email,
      subject: `Re-upload Photos - #${submission.submissionNumber}`,
      body: generateMagicLinkEmail({
        name: submission.homeownerName,
        submissionNumber: submission.submissionNumber,
        magicLink,
        instructions
      })
    });

    return NextResponse.json({ success: true, magicLink });
  } catch (error) {
    console.error("Magic link error:", error);
    return NextResponse.json({ error: "Failed to create magic link" }, { status: 500 });
  }
}

// GET - Validate magic link (public)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    const magicLink = await prisma.magicLink.findUnique({
      where: { token },
      include: {
        submission: {
          include: {
            photos: {
              where: { status: 'Re-upload Requested' },
              orderBy: { roomCategory: 'asc' }
            }
          }
        }
      }
    });

    if (!magicLink) {
      return NextResponse.json({ error: "Invalid link" }, { status: 404 });
    }

    if (magicLink.expiresAt < new Date()) {
      return NextResponse.json({ error: "Link expired" }, { status: 410 });
    }

    if (magicLink.usedAt) {
      return NextResponse.json({ error: "Link already used" }, { status: 410 });
    }

    return NextResponse.json({
      valid: true,
      submission: magicLink.submission
    });
  } catch (error) {
    console.error("Validate magic link error:", error);
    return NextResponse.json({ error: "Validation failed" }, { status: 500 });
  }
}
