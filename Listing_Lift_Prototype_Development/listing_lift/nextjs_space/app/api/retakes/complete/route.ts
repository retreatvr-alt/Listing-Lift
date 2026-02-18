import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendNotificationEmail, generateRetakesReceivedAdminEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { token, photoId, cloud_storage_path, action } = await request.json();

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    const magicLink = await prisma.magicLink.findUnique({
      where: { token },
      include: { submission: true },
    });

    if (!magicLink || magicLink.type !== "retake_batch" || magicLink.expiresAt < new Date()) {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 400 });
    }

    // Action: save a single photo upload
    if (action === "save_photo" && photoId && cloud_storage_path) {
      await prisma.photo.update({
        where: { id: photoId },
        data: {
          originalUrl: cloud_storage_path,
          status: "Pending",
          enhancedUrl: null,
          heroUrl: null,
          reuploadInstructions: null,
        },
      });
      return NextResponse.json({ success: true });
    }

    // Action: submit all retakes (final submit)
    if (action === "submit") {
      const submission = await prisma.submission.findUnique({
        where: { id: magicLink.submissionId },
        include: { photos: true },
      });

      if (!submission) {
        return NextResponse.json({ error: "Submission not found" }, { status: 404 });
      }

      const retakePhotos = submission.photos.filter(
        (p) => p.status === "Re-upload Requested"
      );
      const pendingPhotos = submission.photos.filter(
        (p) => p.status === "Pending"
      );

      // Count how many photos were reset to Pending (retakes uploaded)
      const stillNeeded = retakePhotos.length;
      const uploadedCount = pendingPhotos.length;

      // Send admin notification
      const adminEmail = process.env.ADMIN_EMAIL || "dan@retreatvr.ca";
      await sendNotificationEmail({
        notificationId: process.env.NOTIF_ID_RETAKES_RECEIVED || "",
        recipientEmail: adminEmail,
        subject: `Retakes Received - #${submission.submissionNumber}`,
        body: generateRetakesReceivedAdminEmail({
          submissionNumber: submission.submissionNumber,
          homeownerName: submission.homeownerName,
          propertyAddress: submission.propertyAddress,
          uploadedCount: uploadedCount,
          totalRetakes: uploadedCount + stillNeeded,
        }),
      });

      // If all retakes are done (no more "Re-upload Requested"), trigger auto-enhancement
      if (stillNeeded === 0) {
        // Trigger auto-enhancement for the newly uploaded photos
        try {
          await fetch(
            `${process.env.NEXTAUTH_URL}/api/submissions/${submission.id}/auto-enhance`,
            { method: "POST" }
          );
        } catch (err) {
          console.error("Auto-enhance trigger failed:", err);
        }
      }

      return NextResponse.json({
        success: true,
        allComplete: stillNeeded === 0,
        stillNeeded,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Retake complete error:", error);
    return NextResponse.json({ error: "Failed to complete" }, { status: 500 });
  }
}
