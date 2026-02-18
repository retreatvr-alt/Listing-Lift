import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import {
  sendNotificationEmail,
  generateRetakesRequiredEmail,
  generatePhotosReadyEmail,
} from "@/lib/email";
import { getFileUrl, resizeImageToAirbnb, uploadBufferToS3 } from "@/lib/s3";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(
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
        photos: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    // Categorize photos
    const approved = submission.photos.filter((p) => p.status === "Approved");
    const rejected = submission.photos.filter((p) => p.status === "Rejected");
    const retakeNeeded = submission.photos.filter((p) => p.status === "Re-upload Requested");
    const unreviewed = submission.photos.filter(
      (p) => !["Approved", "Rejected", "Re-upload Requested"].includes(p.status)
    );

    // Validation
    if (unreviewed.length > 0) {
      return NextResponse.json(
        {
          error: `${unreviewed.length} photo(s) still need review. Please approve, reject, or request retake for all photos.`,
          unreviewedPhotos: unreviewed.map((p) => ({
            id: p.id,
            caption: p.caption,
            status: p.status,
          })),
        },
        { status: 400 }
      );
    }

    if (approved.length === 0) {
      return NextResponse.json(
        { error: "At least one photo must be approved before completing review." },
        { status: 400 }
      );
    }

    // ── RETAKES NEEDED ──
    if (retakeNeeded.length > 0) {
      // Expire any previous retake_batch magic links
      await prisma.magicLink.updateMany({
        where: {
          submissionId: params.id,
          type: "retake_batch",
          usedAt: null,
        },
        data: { usedAt: new Date() },
      });

      // Create new retake magic link (30-day, reusable)
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await prisma.magicLink.create({
        data: {
          token,
          submissionId: params.id,
          type: "retake_batch",
          expiresAt,
        },
      });

      const newRound = submission.retakeRound + 1;
      const magicLink = `${process.env.NEXTAUTH_URL}/retakes/${token}`;

      // Send retakes email
      await sendNotificationEmail({
        notificationId: process.env.NOTIF_ID_RETAKES_REQUIRED || "",
        recipientEmail: submission.email,
        subject: `Your Listing Lift Photos - ${retakeNeeded.length} Retake${retakeNeeded.length > 1 ? "s" : ""} Needed${newRound > 1 ? ` (Round ${newRound})` : ""}`,
        body: generateRetakesRequiredEmail({
          name: submission.homeownerName,
          submissionNumber: submission.submissionNumber,
          propertyAddress: submission.propertyAddress,
          approvedCount: approved.length,
          retakePhotos: retakeNeeded.map((p) => ({
            roomCategory: p.roomCategory,
            subCategory: p.subCategory || undefined,
            caption: p.caption,
            reuploadInstructions: p.reuploadInstructions || undefined,
          })),
          rejectedPhotos: rejected.map((p) => ({
            roomCategory: p.roomCategory,
            subCategory: p.subCategory || undefined,
            caption: p.caption,
            rejectionReason: p.rejectionReason || undefined,
          })),
          magicLink,
          round: newRound,
        }),
      });

      await prisma.submission.update({
        where: { id: params.id },
        data: {
          status: "In Progress",
          reviewStatus: "retakes_pending",
          retakeRound: newRound,
          retakesSentAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        outcome: "retakes_sent",
        retakeCount: retakeNeeded.length,
        approvedCount: approved.length,
        rejectedCount: rejected.length,
        round: newRound,
      });
    }

    // ── NO RETAKES — DELIVER TO CLIENT ──

    // Generate hero versions for any hero photos missing heroUrl
    for (const photo of approved.filter((p) => p.isHero && !p.heroUrl && p.enhancedUrl)) {
      try {
        const enhancedImageUrl = await getFileUrl(photo.enhancedUrl!, true);
        const imageResponse = await fetch(enhancedImageUrl);
        if (imageResponse.ok) {
          const rawBuffer = Buffer.from(await imageResponse.arrayBuffer());
          const heroBuffer = await resizeImageToAirbnb(rawBuffer, photo.orientation, true);
          const heroS3Key = await uploadBufferToS3(heroBuffer, `hero-${photo.id}.jpg`, "image/jpeg");
          await prisma.photo.update({
            where: { id: photo.id },
            data: { heroUrl: heroS3Key },
          });
        }
      } catch (err) {
        console.error(`Failed to generate hero for photo ${photo.id}:`, err);
      }
    }

    // Create delivery magic link (30-day)
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await prisma.magicLink.create({
      data: {
        token,
        submissionId: params.id,
        type: "delivery",
        expiresAt,
      },
    });

    const deliveryLink = `${process.env.NEXTAUTH_URL}/delivery/${token}`;
    const downloadLink = `${process.env.NEXTAUTH_URL}/api/delivery/download?token=${token}`;
    const heroCount = approved.filter((p) => p.isHero).length;

    // Send delivery email
    await sendNotificationEmail({
      notificationId: process.env.NOTIF_ID_PHOTOS_DELIVERED || "",
      recipientEmail: submission.email,
      subject: `Your Enhanced Listing Photos Are Ready! | #${submission.submissionNumber}`,
      body: generatePhotosReadyEmail({
        name: submission.homeownerName,
        submissionNumber: submission.submissionNumber,
        propertyAddress: submission.propertyAddress,
        approvedCount: approved.length,
        heroCount,
        deliveryLink,
        downloadLink,
      }),
    });

    await prisma.submission.update({
      where: { id: params.id },
      data: {
        status: "Completed",
        reviewStatus: "delivered",
        deliveredAt: new Date(),
        completedAt: new Date(),
        deletionScheduledAt: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days
      },
    });

    return NextResponse.json({
      success: true,
      outcome: "delivered",
      approvedCount: approved.length,
      rejectedCount: rejected.length,
      heroCount,
    });
  } catch (error) {
    console.error("Complete review error:", error);
    return NextResponse.json({ error: "Failed to complete review" }, { status: 500 });
  }
}
