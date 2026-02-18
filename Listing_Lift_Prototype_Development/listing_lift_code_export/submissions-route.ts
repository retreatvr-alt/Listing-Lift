import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { sendNotificationEmail, generateSubmissionConfirmationEmail, generateAdminAlertEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

// Generate submission number like 2026-0205-001
function generateSubmissionNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  return `${year}-${month}${day}-${random}`;
}

// GET - List submissions (admin only)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const email = searchParams.get('email');

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (email) where.email = email;

    const submissions = await prisma.submission.findMany({
      where,
      include: {
        photos: {
          select: {
            id: true,
            roomCategory: true,
            status: true,
            isHero: true
          }
        },
        _count: {
          select: { photos: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ submissions });
  } catch (error) {
    console.error("Get submissions error:", error);
    return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 });
  }
}

// POST - Create new submission (public)
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { homeownerName, email, phone, propertyAddress, city, provinceState, postalZip, notes, photos } = data;

    if (!homeownerName || !email || !phone || !propertyAddress) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!photos || photos.length === 0) {
      return NextResponse.json(
        { error: "At least one photo is required" },
        { status: 400 }
      );
    }

    if (photos.length > 60) {
      return NextResponse.json(
        { error: "Maximum 60 photos allowed per submission" },
        { status: 400 }
      );
    }

    const submissionNumber = generateSubmissionNumber();

    const submission = await prisma.submission.create({
      data: {
        submissionNumber,
        homeownerName,
        email,
        phone,
        propertyAddress,
        city: city || null,
        provinceState: provinceState || null,
        postalZip: postalZip || null,
        notes: notes || null,
        status: "New",
        photos: {
          create: photos.map((photo: { roomCategory: string; subCategory?: string; caption: string; originalUrl: string; orientation: string }, index: number) => ({
            roomCategory: photo.roomCategory,
            subCategory: photo.subCategory || null,
            caption: photo.caption,
            originalUrl: photo.originalUrl,
            orientation: photo.orientation || 'landscape',
            status: 'Pending',
            sortOrder: index
          }))
        }
      },
      include: {
        photos: true
      }
    });

    // Send confirmation email to homeowner
    const fullAddress = [propertyAddress, city, provinceState, postalZip].filter(Boolean).join(', ');
    await sendNotificationEmail({
      notificationId: process.env.NOTIF_ID_SUBMISSION_CONFIRMATION || '',
      recipientEmail: email,
      subject: `Submission Received - #${submissionNumber}`,
      body: generateSubmissionConfirmationEmail({
        name: homeownerName,
        submissionNumber,
        propertyAddress: fullAddress,
        photoCount: photos.length
      })
    });

    // Send alert to admin
    await sendNotificationEmail({
      notificationId: process.env.NOTIF_ID_NEW_SUBMISSION_ALERT || '',
      recipientEmail: 'dan@retreatvr.ca',
      subject: `New Submission - #${submissionNumber} from ${homeownerName}`,
      body: generateAdminAlertEmail({
        submissionNumber,
        homeownerName,
        email,
        propertyAddress: fullAddress,
        photoCount: photos.length
      })
    });

    return NextResponse.json({
      success: true,
      submission: {
        id: submission.id,
        submissionNumber: submission.submissionNumber
      }
    });
  } catch (error) {
    console.error("Create submission error:", error);
    return NextResponse.json({ error: "Failed to create submission" }, { status: 500 });
  }
}
