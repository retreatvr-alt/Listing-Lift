import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendNotificationEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { token, status, notes } = await request.json();

    if (!token || !status) {
      return NextResponse.json({ error: "Token and status required" }, { status: 400 });
    }

    const magicLink = await prisma.magicLink.findUnique({
      where: { token },
      include: { submission: true },
    });

    if (!magicLink || magicLink.type !== "delivery" || magicLink.expiresAt < new Date()) {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 400 });
    }

    // Upsert client review
    await prisma.clientReview.upsert({
      where: { submissionId: magicLink.submissionId },
      create: {
        submissionId: magicLink.submissionId,
        status,
        clientNotes: notes || null,
        reviewedAt: new Date(),
      },
      update: {
        status,
        clientNotes: notes || null,
        reviewedAt: new Date(),
      },
    });

    // If changes requested, notify admin
    if (status === "Changes Requested") {
      const adminEmail = process.env.ADMIN_EMAIL || "dan@retreatvr.ca";
      await sendNotificationEmail({
        notificationId: process.env.NOTIF_ID_RETAKES_RECEIVED || "",
        recipientEmail: adminEmail,
        subject: `Client Feedback - #${magicLink.submission.submissionNumber}`,
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #383D31; padding: 20px; text-align: center;">
              <h1 style="color: #f9f7f4; margin: 0;">Client Feedback</h1>
            </div>
            <div style="padding: 30px; background: #f9f7f4;">
              <div style="background: white; border-radius: 8px; padding: 20px; border-left: 4px solid #f59e0b;">
                <h2 style="color: #383D31; margin-top: 0;">Changes Requested</h2>
                <p><strong>Submission:</strong> #${magicLink.submission.submissionNumber}</p>
                <p><strong>Homeowner:</strong> ${magicLink.submission.homeownerName}</p>
                ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
              </div>
              <div style="text-align: center; margin-top: 20px;">
                <a href="${process.env.NEXTAUTH_URL}/admin/submissions/${magicLink.submissionId}" style="background: #383D31; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">View Submission →</a>
              </div>
            </div>
          </div>
        `,
      });
    }

    // Update submission if approved
    if (status === "Approved") {
      await prisma.submission.update({
        where: { id: magicLink.submissionId },
        data: { reviewStatus: "client_approved" },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Feedback error:", error);
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
  }
}
