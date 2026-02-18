# Listing Lift — Round 5: Post-Review Client Delivery Workflow

## Overview

Build the entire "second half" of the photo workflow — everything that happens after the admin finishes reviewing enhanced photos. This includes: admin completing review, sending retake requests, client re-upload wizard, delivering final photos to clients, before/after comparison page, ZIP downloads, and optional client feedback.

**Target audience for client pages**: Retirees who are NOT tech-savvy. MUST be dead simple — wizard-style, large buttons, minimal text, mobile-first.

**NOTE**: This is a large feature spanning 12 new files and 5 modified files. Follow the implementation sequence exactly — each phase depends on the previous one.

---

## Implementation Sequence

1. Schema changes + migration
2. Multi-hero support (API + admin UI)
3. Email templates
4. Complete Review API + admin UI
5. Client retake wizard (API + page)
6. Client delivery page (API + page)
7. ZIP download (admin + client)
8. Client feedback

---

## New Dependency

Install `archiver` for ZIP streaming:
```bash
npm install archiver @types/archiver
```

## New Environment Variables

Add to `.env`:
```
NOTIF_ID_RETAKES_REQUIRED=<notification_id>
NOTIF_ID_PHOTOS_DELIVERED=<notification_id>
NOTIF_ID_RETAKES_RECEIVED=<notification_id>
```

These need to be created in the Abacus AI notification system. If you can't create them, use placeholder values and document them.

---

## Phase 1: Schema Changes

### File: `prisma/schema.prisma`

**1. Add `type` field to `MagicLink` model (around line 81-89):**

Current:
```prisma
model MagicLink {
  id           String    @id @default(cuid())
  token        String    @unique
  submissionId String
  submission   Submission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  expiresAt    DateTime
  usedAt       DateTime?
  createdAt    DateTime  @default(now())
}
```

Change to:
```prisma
model MagicLink {
  id           String    @id @default(cuid())
  token        String    @unique
  submissionId String
  submission   Submission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  type         String    @default("reupload")  // "reupload" | "retake_batch" | "delivery"
  expiresAt    DateTime
  usedAt       DateTime?
  createdAt    DateTime  @default(now())
}
```

**2. Add new `ClientReview` model** (after the `MagicLink` model):

```prisma
model ClientReview {
  id           String    @id @default(cuid())
  submissionId String    @unique
  submission   Submission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  status       String    @default("Pending")  // "Pending" | "Approved" | "Changes Requested"
  reviewedAt   DateTime?
  clientNotes  String?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}
```

**3. Add fields to `Submission` model (around line 21-39):**

Add these fields BEFORE the `photos` relation:
```prisma
  reviewStatus        String?    // "retakes_pending" | "delivered" | "client_approved"
  retakeRound         Int        @default(0)  // increments each retake cycle
  retakesSentAt       DateTime?
  deliveredAt         DateTime?
```

Add the `clientReview` relation after `magicLinks`:
```prisma
  clientReview        ClientReview?
```

So the full updated Submission model becomes:
```prisma
model Submission {
  id                    String    @id @default(cuid())
  submissionNumber      String    @unique
  homeownerName         String
  email                 String
  phone                 String
  propertyAddress       String
  city                  String?
  provinceState         String?
  postalZip             String?
  notes                 String?
  status                String    @default("New")
  reviewStatus          String?
  retakeRound           Int       @default(0)
  retakesSentAt         DateTime?
  deliveredAt           DateTime?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  completedAt           DateTime?
  deletionScheduledAt   DateTime?
  photos                Photo[]
  magicLinks            MagicLink[]
  clientReview          ClientReview?
}
```

**4. Run migration:**
```bash
npx prisma migrate dev --name add-delivery-workflow
npx prisma generate
```

---

## Phase 2: Multiple Hero Photos

### File: `app/api/photos/[id]/route.ts`

**Remove the single-hero constraint.** Currently lines 27-37 unset `isHero` on all other photos when one is set as hero. Remove this block entirely.

Change the `if (isHero !== undefined)` block from:
```typescript
    if (isHero !== undefined) {
      updateData.isHero = isHero;
      // If setting as hero, unset other heroes in same submission
      if (isHero) {
        const photo = await prisma.photo.findUnique({
          where: { id: params.id },
          select: { submissionId: true }
        });
        if (photo) {
          await prisma.photo.updateMany({
            where: { submissionId: photo.submissionId, id: { not: params.id } },
            data: { isHero: false }
          });
        }
      }
    }
```

To simply:
```typescript
    if (isHero !== undefined) {
      updateData.isHero = isHero;
    }
```

### NEW File: `app/api/photos/[id]/generate-hero/route.ts`

Generates hero version (4000x2667) from an already-enhanced photo. Used when admin marks a photo as hero AFTER it was enhanced.

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getFileUrl, resizeImageToAirbnb, uploadBufferToS3 } from "@/lib/s3";

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

    const photo = await prisma.photo.findUnique({
      where: { id: params.id },
    });

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    if (!photo.enhancedUrl) {
      return NextResponse.json({ error: "Photo not yet enhanced" }, { status: 400 });
    }

    // Download the enhanced image from S3
    const enhancedImageUrl = await getFileUrl(photo.enhancedUrl, true);
    const imageResponse = await fetch(enhancedImageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download enhanced image: ${imageResponse.status}`);
    }
    const rawBuffer = Buffer.from(await imageResponse.arrayBuffer());

    // Resize to hero dimensions (4000x2667 or 2667x4000)
    const heroBuffer = await resizeImageToAirbnb(rawBuffer, photo.orientation, true);

    // Upload hero version to S3
    const heroS3Key = await uploadBufferToS3(
      heroBuffer,
      `hero-${photo.id}.jpg`,
      "image/jpeg"
    );

    // Update photo record
    await prisma.photo.update({
      where: { id: params.id },
      data: { heroUrl: heroS3Key },
    });

    return NextResponse.json({ success: true, heroUrl: heroS3Key });
  } catch (error) {
    console.error("Generate hero error:", error);
    return NextResponse.json({ error: "Failed to generate hero version" }, { status: 500 });
  }
}
```

### Admin UI: `app/admin/submissions/[id]/page.tsx`

**Change the hero button to be a toggle** (currently around line 735-744 area where "Set as Hero" button is). Make it toggle between "Set as Hero" and "Remove Hero":

```tsx
<button
  onClick={async () => {
    const newIsHero = !selectedPhoto.isHero;
    try {
      await fetch(`/api/photos/${selectedPhoto.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isHero: newIsHero })
      });
      // If setting as hero and no hero URL, generate it
      if (newIsHero && selectedPhoto.enhancedUrl && !selectedPhoto.heroUrl) {
        fetch(`/api/photos/${selectedPhoto.id}/generate-hero`, { method: 'POST' });
        toast.success('Hero version generating...');
      }
      setSelectedPhoto(prev => prev ? { ...prev, isHero: newIsHero } : null);
      fetchSubmission();
      toast.success(newIsHero ? 'Marked as hero photo' : 'Removed hero status');
    } catch (err) {
      toast.error('Failed to update hero status');
    }
  }}
  className={`flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg ${
    selectedPhoto.isHero
      ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
  }`}
>
  <Star className={`w-4 h-4 ${selectedPhoto.isHero ? 'fill-amber-500' : ''}`} />
  {selectedPhoto.isHero ? 'Remove Hero' : 'Set as Hero'}
</button>
```

**Also add hero count in the sidebar** — below the photo grid, show how many heroes are selected:

```tsx
{(() => {
  const heroCount = submission.photos.filter(p => p.isHero).length;
  return heroCount > 0 ? (
    <p className="text-sm text-amber-700 mt-2">
      ⭐ {heroCount} hero photo{heroCount > 1 ? 's' : ''} selected
    </p>
  ) : null;
})()}
```

---

## Phase 3: Email Templates

### File: `lib/email.ts`

Add these 3 new email template functions at the end of the file.

**1. `generateRetakesRequiredEmail()`:**

```typescript
export function generateRetakesRequiredEmail({
  name,
  submissionNumber,
  propertyAddress,
  approvedCount,
  retakePhotos,
  rejectedPhotos,
  magicLink,
  round
}: {
  name: string;
  submissionNumber: string;
  propertyAddress: string;
  approvedCount: number;
  retakePhotos: Array<{ roomCategory: string; subCategory?: string; caption: string; reuploadInstructions?: string }>;
  rejectedPhotos: Array<{ roomCategory: string; subCategory?: string; caption: string; rejectionReason?: string }>;
  magicLink: string;
  round: number;
}): string {
  const retakeList = retakePhotos.map(p => `
    <div style="background: white; border-radius: 8px; padding: 15px; margin: 10px 0; border-left: 4px solid #f59e0b;">
      <p style="margin: 0 0 5px 0; font-weight: bold; color: #383D31;">${p.subCategory || p.roomCategory} — ${p.caption}</p>
      ${p.reuploadInstructions ? `<p style="margin: 0; color: #555; font-size: 14px;">${p.reuploadInstructions}</p>` : ''}
    </div>
  `).join('');

  const rejectedList = rejectedPhotos.length > 0 ? `
    <div style="margin-top: 30px;">
      <h3 style="color: #ef4444; font-size: 16px;">Photos We Won't Be Using</h3>
      <p style="color: #555; font-size: 14px;">These photos have been excluded from your listing:</p>
      ${rejectedPhotos.map(p => `
        <div style="background: #fef2f2; border-radius: 8px; padding: 12px; margin: 8px 0;">
          <p style="margin: 0; font-weight: bold; color: #383D31; font-size: 14px;">${p.subCategory || p.roomCategory} — ${p.caption}</p>
          ${p.rejectionReason ? `<p style="margin: 5px 0 0 0; color: #777; font-size: 13px;">${p.rejectionReason}</p>` : ''}
        </div>
      `).join('')}
    </div>
  ` : '';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f7f4;">
      <div style="background: #383D31; padding: 30px; text-align: center;">
        <h1 style="color: #f9f7f4; margin: 0; font-size: 28px;">Listing Lift</h1>
        <p style="color: #d4d1c8; margin: 10px 0 0 0;">by Retreat Vacation Rentals</p>
      </div>
      <div style="padding: 40px 30px;">
        <h2 style="color: #383D31; margin-top: 0;">Almost There${round > 1 ? ` (Round ${round})` : ''}!</h2>
        <p style="color: #555; line-height: 1.6; font-size: 16px;">Hi ${name},</p>
        <p style="color: #555; line-height: 1.6; font-size: 16px;">
          <strong>${approvedCount} photos look fantastic!</strong> We just need ${retakePhotos.length} new shot${retakePhotos.length > 1 ? 's' : ''} to complete your listing at ${propertyAddress}.
        </p>

        <h3 style="color: #f59e0b; font-size: 16px; margin-top: 25px;">Photos To Retake</h3>
        ${retakeList}

        <div style="text-align: center; margin: 30px 0;">
          <a href="${magicLink}" style="background: #383D31; color: white; padding: 18px 50px; text-decoration: none; border-radius: 8px; display: inline-block; font-size: 18px; font-weight: bold;">Upload Replacement Photos</a>
        </div>

        <p style="color: #888; font-size: 14px; text-align: center;">
          You can upload photos at different times — no need to do everything at once.<br/>
          Your link works for 30 days.
        </p>

        ${rejectedList}

        <p style="color: #888; font-size: 14px; margin-top: 30px;">Questions? Reply to this email or contact us at dan@retreatvr.ca</p>
      </div>
      <div style="background: #383D31; padding: 20px; text-align: center;">
        <p style="color: #d4d1c8; margin: 0; font-size: 12px;">© ${new Date().getFullYear()} Retreat Vacation Rentals</p>
      </div>
    </div>
  `;
}
```

**2. `generatePhotosReadyEmail()`:**

```typescript
export function generatePhotosReadyEmail({
  name,
  submissionNumber,
  propertyAddress,
  approvedCount,
  heroCount,
  deliveryLink,
  downloadLink
}: {
  name: string;
  submissionNumber: string;
  propertyAddress: string;
  approvedCount: number;
  heroCount: number;
  deliveryLink: string;
  downloadLink: string;
}): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f7f4;">
      <div style="background: #383D31; padding: 30px; text-align: center;">
        <h1 style="color: #f9f7f4; margin: 0; font-size: 28px;">Listing Lift</h1>
        <p style="color: #d4d1c8; margin: 10px 0 0 0;">by Retreat Vacation Rentals</p>
      </div>
      <div style="padding: 40px 30px;">
        <h2 style="color: #22c55e; margin-top: 0;">Your Photos Are Ready! 🎉</h2>
        <p style="color: #555; line-height: 1.6; font-size: 16px;">Hi ${name},</p>
        <p style="color: #555; line-height: 1.6; font-size: 16px;">
          Great news! Your <strong>${approvedCount} enhanced photos</strong> for ${propertyAddress} are ready to view and download.
        </p>

        ${heroCount > 0 ? `
        <div style="background: #fffbeb; border-radius: 8px; padding: 15px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <p style="margin: 0; color: #92400e; font-size: 14px;">
            ⭐ <strong>${heroCount} cover photo${heroCount > 1 ? 's' : ''}</strong> optimized for Airbnb (4000×2667 pixels)
          </p>
        </div>
        ` : ''}

        <div style="background: white; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center;">
          <p style="margin: 0 0 8px 0; color: #383D31; font-weight: bold;">Submission #${submissionNumber}</p>
          <p style="margin: 0; color: #555;">${propertyAddress}</p>
          <p style="margin: 8px 0 0 0; color: #555;">${approvedCount} enhanced photos</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${deliveryLink}" style="background: #383D31; color: white; padding: 18px 50px; text-decoration: none; border-radius: 8px; display: inline-block; font-size: 18px; font-weight: bold;">View & Download Your Photos</a>
        </div>

        <p style="color: #555; text-align: center; font-size: 14px;">
          Or <a href="${downloadLink}" style="color: #383D31; font-weight: bold;">download all as a ZIP file</a>
        </p>

        <p style="color: #888; font-size: 14px; text-align: center; margin-top: 25px;">
          Your photos will be available for 30 days.
        </p>

        <p style="color: #888; font-size: 14px; margin-top: 30px;">Questions? Reply to this email or contact us at dan@retreatvr.ca</p>
      </div>
      <div style="background: #383D31; padding: 20px; text-align: center;">
        <p style="color: #d4d1c8; margin: 0; font-size: 12px;">© ${new Date().getFullYear()} Retreat Vacation Rentals</p>
      </div>
    </div>
  `;
}
```

**3. `generateRetakesReceivedAdminEmail()`:**

```typescript
export function generateRetakesReceivedAdminEmail({
  submissionNumber,
  homeownerName,
  propertyAddress,
  uploadedCount,
  totalRetakes
}: {
  submissionNumber: string;
  homeownerName: string;
  propertyAddress: string;
  uploadedCount: number;
  totalRetakes: number;
}): string {
  const allDone = uploadedCount >= totalRetakes;
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #383D31; padding: 20px; text-align: center;">
        <h1 style="color: #f9f7f4; margin: 0;">Retakes Received</h1>
      </div>
      <div style="padding: 30px; background: #f9f7f4;">
        <div style="background: white; border-radius: 8px; padding: 20px; border-left: 4px solid ${allDone ? '#22c55e' : '#f59e0b'};">
          <h2 style="color: #383D31; margin-top: 0;">
            ${allDone ? '✅ All Retakes Received' : `📷 ${uploadedCount} of ${totalRetakes} Retakes Uploaded`}
          </h2>
          <p><strong>Submission:</strong> #${submissionNumber}</p>
          <p><strong>Homeowner:</strong> ${homeownerName}</p>
          <p><strong>Property:</strong> ${propertyAddress}</p>
        </div>
        <div style="text-align: center; margin-top: 20px;">
          <a href="${process.env.NEXTAUTH_URL}/admin" style="background: #383D31; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
            ${allDone ? 'Review Retakes →' : 'View Dashboard →'}
          </a>
        </div>
      </div>
    </div>
  `;
}
```

---

## Phase 4: Admin Complete Review

### NEW File: `app/api/submissions/[id]/complete-review/route.ts`

This is the core orchestration endpoint. It can be called MULTIPLE TIMES — once after initial review, and again after each round of retakes.

```typescript
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
```

### Admin UI: `app/admin/submissions/[id]/page.tsx`

**Add Review Summary card** in the left sidebar, ABOVE the existing "Batch Actions" section (before line 614).

This card should:
1. Count photos by status (approved, rejected, re-upload requested, unreviewed)
2. Show when ALL photos have been reviewed (no unreviewed remaining)
3. Show the appropriate CTA button

```tsx
{/* Review Summary */}
{(() => {
  const approved = submission.photos.filter(p => p.status === 'Approved');
  const rejected = submission.photos.filter(p => p.status === 'Rejected');
  const retakes = submission.photos.filter(p => p.status === 'Re-upload Requested');
  const unreviewed = submission.photos.filter(p => !['Approved', 'Rejected', 'Re-upload Requested'].includes(p.status));
  const allReviewed = unreviewed.length === 0;

  return (
    <div className="bg-white rounded-xl shadow-md p-4">
      <h3 className="font-semibold text-[#383D31] mb-3">Review Summary</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-green-600">✅ Approved</span>
          <span className="font-medium">{approved.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-amber-600">🔄 Need Retakes</span>
          <span className="font-medium">{retakes.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-red-500">❌ Rejected</span>
          <span className="font-medium">{rejected.length}</span>
        </div>
        {unreviewed.length > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-400">⏳ Not reviewed</span>
            <span className="font-medium">{unreviewed.length}</span>
          </div>
        )}
      </div>

      {submission.retakeRound > 0 && (
        <div className="mt-2 text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded">
          Retake Round {submission.retakeRound}
        </div>
      )}

      {submission.reviewStatus === 'retakes_pending' && (
        <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
          ⏳ Waiting for client retakes...
        </div>
      )}

      {submission.reviewStatus === 'delivered' && (
        <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          ✅ Photos delivered to client
        </div>
      )}

      {allReviewed && approved.length > 0 && submission.reviewStatus !== 'delivered' && (
        <button
          onClick={async () => {
            if (!confirm(
              retakes.length > 0
                ? `Send retake request for ${retakes.length} photo(s) to ${submission.homeownerName}?`
                : `Deliver ${approved.length} enhanced photo(s) to ${submission.homeownerName}?`
            )) return;

            try {
              const res = await fetch(`/api/submissions/${submission.id}/complete-review`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
              });
              const result = await res.json();
              if (res.ok && result.success) {
                if (result.outcome === 'retakes_sent') {
                  toast.success(`Retake request sent! (${result.retakeCount} photos, round ${result.round})`);
                } else {
                  toast.success(`Photos delivered to ${submission.homeownerName}!`);
                }
                fetchSubmission();
              } else {
                toast.error(result.error || 'Failed to complete review');
              }
            } catch (err) {
              toast.error('Failed to complete review');
            }
          }}
          className={`w-full mt-3 flex items-center justify-center gap-2 px-4 py-3 text-white rounded-lg font-medium ${
            retakes.length > 0
              ? 'bg-amber-500 hover:bg-amber-600'
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          <Send className="w-4 h-4" />
          {retakes.length > 0 ? 'Send Retake Requests' : 'Deliver to Client'}
        </button>
      )}
    </div>
  );
})()}
```

**Also update the Submission interface** at the top of the file to include the new fields. Add after the existing fields:

```typescript
interface Submission {
  // ... existing fields ...
  reviewStatus?: string;
  retakeRound?: number;
  retakesSentAt?: string;
  deliveredAt?: string;
}
```

**Also update the fetch call for submission** to include these new fields (the Prisma query in the API should already return them since they're direct fields on the Submission model).

---

## Phase 5: Client Retake Wizard

### NEW File: `app/api/retakes/route.ts`

GET handler to validate retake magic link and return retake data:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFileUrl } from "@/lib/s3";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    const magicLink = await prisma.magicLink.findUnique({
      where: { token },
      include: {
        submission: {
          include: {
            photos: {
              where: { status: "Re-upload Requested" },
              orderBy: { sortOrder: "asc" },
            },
          },
        },
      },
    });

    if (!magicLink) {
      return NextResponse.json({ error: "Invalid link" }, { status: 404 });
    }

    if (magicLink.type !== "retake_batch") {
      return NextResponse.json({ error: "Invalid link type" }, { status: 400 });
    }

    if (magicLink.expiresAt < new Date()) {
      return NextResponse.json({ error: "Link expired" }, { status: 410 });
    }

    // Note: we do NOT check usedAt for retake_batch links (multi-session)

    // Resolve original photo URLs for thumbnails
    const photosWithUrls = await Promise.all(
      magicLink.submission.photos.map(async (photo) => ({
        id: photo.id,
        roomCategory: photo.roomCategory,
        subCategory: photo.subCategory,
        caption: photo.caption,
        reuploadInstructions: photo.reuploadInstructions,
        originalUrl: photo.originalUrl ? await getFileUrl(photo.originalUrl) : null,
        status: photo.status,
      }))
    );

    return NextResponse.json({
      valid: true,
      submission: {
        id: magicLink.submission.id,
        homeownerName: magicLink.submission.homeownerName,
        propertyAddress: magicLink.submission.propertyAddress,
        submissionNumber: magicLink.submission.submissionNumber,
      },
      retakePhotos: photosWithUrls,
    });
  } catch (error) {
    console.error("Validate retakes error:", error);
    return NextResponse.json({ error: "Validation failed" }, { status: 500 });
  }
}
```

### NEW File: `app/api/retakes/upload/route.ts`

Handles presigned URL generation for retake uploads:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generatePresignedUploadUrl } from "@/lib/s3";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { token, photoId, fileName, contentType } = await request.json();

    if (!token || !photoId || !fileName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate magic link
    const magicLink = await prisma.magicLink.findUnique({
      where: { token },
    });

    if (!magicLink || magicLink.type !== "retake_batch" || magicLink.expiresAt < new Date()) {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 400 });
    }

    // Validate photo belongs to this submission
    const photo = await prisma.photo.findFirst({
      where: { id: photoId, submissionId: magicLink.submissionId },
    });

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Generate presigned upload URL
    const { uploadUrl, cloud_storage_path } = await generatePresignedUploadUrl(
      fileName,
      contentType || "image/jpeg"
    );

    return NextResponse.json({
      success: true,
      uploadUrl,
      cloud_storage_path,
    });
  } catch (error) {
    console.error("Retake upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
```

### NEW File: `app/api/retakes/complete/route.ts`

Handles completing a retake upload (updating the photo record) and the final submit:

```typescript
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
      const totalRetakes = retakePhotos.length + pendingPhotos.filter(p => {
        // Count photos that WERE retake-requested but are now pending (just uploaded)
        return true; // We consider all pending as potentially uploaded retakes
      }).length;

      // Count how many retakes have been uploaded (now have status "Pending")
      // Total retakes = photos that are still "Re-upload Requested" + photos that were just reset to "Pending"
      const stillNeeded = retakePhotos.length;
      const uploadedCount = submission.retakeRound > 0 ?
        (pendingPhotos.length) : 0; // Approximate — photos reset to Pending from Re-upload Requested

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
```

### NEW File: `app/retakes/[token]/page.tsx`

**This is the most UX-critical piece.** Mobile-first wizard for retirees.

Build this as a `"use client"` page with these wizard steps:

**State machine**: `welcome` → `upload` (photo-by-photo) → `summary` → `done`

**CRITICAL UX rules** (retirees on smartphones):
- ALL buttons minimum 48px tall, primary CTAs 56px+ and full-width
- Body text minimum 16px, headers 20px+
- ONE photo at a time in upload step (not a list)
- Progress bar + "Photo X of Y" always visible
- "Skip for Now" on every upload screen (small text link, not a button)
- "Come Back Later" prominently shown on summary
- Large camera icon on upload button
- Immediate visual feedback on upload (green checkmark animation)
- Sticky bottom navigation bar on mobile
- No login required (magic link auth)

**Key implementation details:**
1. On mount, call `GET /api/retakes?token={token}` to validate and get data
2. Track which photos have been uploaded locally (in state) and via API
3. Each photo upload: call `POST /api/retakes/upload` to get presigned URL, upload to S3, then call `POST /api/retakes/complete` with `action: "save_photo"` to update DB
4. On final submit: call `POST /api/retakes/complete` with `action: "submit"`
5. Support HEIC/HEIF from iPhones (accept="image/*" on file input)
6. Show original photo thumbnail (from API) so client knows which angle is needed

**Page structure:**

```
Welcome Screen:
  - "Hi {name}!" heading (24px+)
  - "We need {count} more photos for your listing at {address}"
  - Green progress bar ({uploaded}/{total})
  - Big green "Let's Get Started" button (full-width, 56px tall)

Upload Screen (one per photo):
  - "Photo {X} of {Y}" with dot indicators
  - Room name in large text (20px)
  - Caption below (16px)
  - Amber instruction box with admin's notes
  - Small thumbnail of original photo
  - HUGE upload area (full-width, 200px tall, dashed border, camera icon)
    - input type="file" accept="image/*" capture="environment"
  - After upload: photo preview with "✓ Use This Photo" / "Try Again" buttons
  - "Skip for Now" text link at bottom
  - Bottom nav: ← Previous | Next →

Summary Screen:
  - Grid of all retake photos (2 columns)
  - Each: thumbnail + room name + ✅ or ⏳ badge
  - "Submit {N} Photos" big green button
  - "Come Back Later" link with reassuring text
  - After submit: confetti/success screen
    - "All done! We'll email you when your photos are ready."
    - Or if partial: "We received {N} photos. Come back to upload the rest!"
```

---

## Phase 6: Client Delivery Page

### NEW File: `app/api/delivery/route.ts`

GET handler to validate delivery link and return photo data with resolved URLs:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFileUrl } from "@/lib/s3";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    const magicLink = await prisma.magicLink.findUnique({
      where: { token },
      include: {
        submission: {
          include: {
            photos: {
              where: { status: "Approved" },
              orderBy: { sortOrder: "asc" },
            },
          },
        },
      },
    });

    if (!magicLink) {
      return NextResponse.json({ error: "Invalid link" }, { status: 404 });
    }

    if (magicLink.type !== "delivery") {
      return NextResponse.json({ error: "Invalid link type" }, { status: 400 });
    }

    if (magicLink.expiresAt < new Date()) {
      return NextResponse.json({ error: "Link expired" }, { status: 410 });
    }

    // Resolve all photo URLs
    const photosWithUrls = await Promise.all(
      magicLink.submission.photos.map(async (photo) => ({
        id: photo.id,
        roomCategory: photo.roomCategory,
        subCategory: photo.subCategory,
        caption: photo.caption,
        isHero: photo.isHero,
        orientation: photo.orientation,
        originalUrl: photo.originalUrl ? await getFileUrl(photo.originalUrl) : null,
        enhancedUrl: photo.enhancedUrl ? await getFileUrl(photo.enhancedUrl) : null,
        heroUrl: photo.heroUrl ? await getFileUrl(photo.heroUrl) : null,
      }))
    );

    return NextResponse.json({
      valid: true,
      submission: {
        id: magicLink.submission.id,
        homeownerName: magicLink.submission.homeownerName,
        propertyAddress: magicLink.submission.propertyAddress,
        submissionNumber: magicLink.submission.submissionNumber,
      },
      photos: photosWithUrls,
      heroPhotos: photosWithUrls.filter((p) => p.isHero),
      expiresAt: magicLink.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Delivery validation error:", error);
    return NextResponse.json({ error: "Validation failed" }, { status: 500 });
  }
}
```

### NEW File: `app/delivery/[token]/page.tsx`

**Mobile-first delivery page with before/after comparisons.**

**CRITICAL UX rules** (same as retake wizard — retirees on smartphones):
- Large buttons, large text (16px+ body, 20px+ headers)
- Before/after labels in BIG text ("BEFORE" / "AFTER")
- Side-by-side on desktop, stacked vertically on mobile
- Tap any photo → full-screen lightbox with before/after
- Sticky "Download All" button at bottom on mobile
- No login required

**Page structure:**

```
Header:
  - Listing Lift logo + branding
  - "Your Enhanced Photos" heading
  - Property address + photo count

Section 1 — Cover Photos (if any hero photos):
  - "⭐ Your Cover Photos" heading
  - For each hero:
    - Side-by-side before/after (stacked on mobile)
    - "BEFORE" / "AFTER" labels
    - "Download Cover Photo" button
    - Small note: "4000×2667 — Optimized for Airbnb"

Section 2 — All Photos:
  - "Your Enhanced Photos" heading with count
  - Grid: 2 columns mobile, 3 desktop
  - Each card:
    - Enhanced photo thumbnail (using Next.js Image)
    - Room name + caption
    - Tap → opens before/after lightbox modal

Before/After Lightbox (modal):
  - Full-screen overlay
  - Side-by-side on desktop (50/50), stacked on mobile
  - "BEFORE" / "AFTER" labels in 20px bold
  - "Download This Photo" button
  - Large X close button (top right, 48px tap target)

Section 3 — Download All:
  - Sticky bottom bar on mobile (fixed position, full-width)
  - "Download All Photos" big green button
  - Triggers: window.location.href = `/api/delivery/download?token={token}`

Section 4 — Feedback (at bottom, optional):
  - "Happy with your photos?"
  - Two large buttons side by side:
    - 👍 "Love them!" (green)
    - 👎 "Need changes" (gray)
  - If thumbs down: shows textarea + submit button
  - After feedback: "Thank you for your feedback!" message
```

### NEW File: `app/api/delivery/feedback/route.ts`

```typescript
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
```

---

## Phase 7: ZIP Download

### NEW File: `app/api/submissions/[id]/download-zip/route.ts` (Admin)

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { createS3Client, getBucketConfig } from "@/lib/aws-config";
import archiver from "archiver";
import { Readable } from "stream";

export const dynamic = "force-dynamic";

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
          where: { status: "Approved" },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    const s3Client = createS3Client();
    const { bucketName } = getBucketConfig();
    const archive = archiver("zip", { zlib: { level: 5 } });

    // Create a readable stream from the archiver
    const chunks: Buffer[] = [];
    archive.on("data", (chunk: Buffer) => chunks.push(chunk));

    const archivePromise = new Promise<Buffer>((resolve, reject) => {
      archive.on("end", () => resolve(Buffer.concat(chunks)));
      archive.on("error", reject);
    });

    const prefix = `ListingLift-${submission.submissionNumber}`;

    for (let i = 0; i < submission.photos.length; i++) {
      const photo = submission.photos[i];
      const num = String(i + 1).padStart(2, "0");
      const room = (photo.subCategory || photo.roomCategory).replace(/[/\\]/g, "-");
      const caption = photo.caption.replace(/[^a-zA-Z0-9 _-]/g, "").replace(/\s+/g, "-");
      const baseName = `${num}-${room}-${caption}`;

      // Enhanced photo
      if (photo.enhancedUrl) {
        try {
          const command = new GetObjectCommand({ Bucket: bucketName, Key: photo.enhancedUrl });
          const response = await s3Client.send(command);
          if (response.Body) {
            const bodyBytes = await response.Body.transformToByteArray();
            archive.append(Buffer.from(bodyBytes), { name: `${prefix}/enhanced/${baseName}.jpg` });
          }
        } catch (err) {
          console.error(`Failed to fetch enhanced photo ${photo.id}:`, err);
        }
      }

      // Original photo
      if (photo.originalUrl) {
        try {
          const command = new GetObjectCommand({ Bucket: bucketName, Key: photo.originalUrl });
          const response = await s3Client.send(command);
          if (response.Body) {
            const bodyBytes = await response.Body.transformToByteArray();
            archive.append(Buffer.from(bodyBytes), { name: `${prefix}/originals/${baseName}-original.jpg` });
          }
        } catch (err) {
          console.error(`Failed to fetch original photo ${photo.id}:`, err);
        }
      }

      // Hero version
      if (photo.isHero && photo.heroUrl) {
        try {
          const command = new GetObjectCommand({ Bucket: bucketName, Key: photo.heroUrl });
          const response = await s3Client.send(command);
          if (response.Body) {
            const bodyBytes = await response.Body.transformToByteArray();
            archive.append(Buffer.from(bodyBytes), { name: `${prefix}/cover-photos/HERO-${baseName}.jpg` });
          }
        } catch (err) {
          console.error(`Failed to fetch hero photo ${photo.id}:`, err);
        }
      }
    }

    archive.finalize();
    const zipBuffer = await archivePromise;

    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${prefix}.zip"`,
      },
    });
  } catch (error) {
    console.error("Download ZIP error:", error);
    return NextResponse.json({ error: "Failed to create ZIP" }, { status: 500 });
  }
}
```

### NEW File: `app/api/delivery/download/route.ts` (Client)

Same ZIP logic but authenticated via magic link token, and only includes enhanced + hero (no originals):

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { createS3Client, getBucketConfig } from "@/lib/aws-config";
import archiver from "archiver";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    const magicLink = await prisma.magicLink.findUnique({
      where: { token },
      include: {
        submission: {
          include: {
            photos: {
              where: { status: "Approved" },
              orderBy: { sortOrder: "asc" },
            },
          },
        },
      },
    });

    if (!magicLink || magicLink.type !== "delivery" || magicLink.expiresAt < new Date()) {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 400 });
    }

    const s3Client = createS3Client();
    const { bucketName } = getBucketConfig();
    const archive = archiver("zip", { zlib: { level: 5 } });
    const submission = magicLink.submission;

    const chunks: Buffer[] = [];
    archive.on("data", (chunk: Buffer) => chunks.push(chunk));

    const archivePromise = new Promise<Buffer>((resolve, reject) => {
      archive.on("end", () => resolve(Buffer.concat(chunks)));
      archive.on("error", reject);
    });

    const prefix = `ListingLift-${submission.submissionNumber}`;

    for (let i = 0; i < submission.photos.length; i++) {
      const photo = submission.photos[i];
      const room = (photo.subCategory || photo.roomCategory).replace(/[/\\]/g, "-");
      const caption = photo.caption.replace(/[^a-zA-Z0-9 _-]/g, "").replace(/\s+/g, "-");
      const baseName = `${room}-${caption}`;

      // Enhanced photo
      if (photo.enhancedUrl) {
        try {
          const command = new GetObjectCommand({ Bucket: bucketName, Key: photo.enhancedUrl });
          const response = await s3Client.send(command);
          if (response.Body) {
            const bodyBytes = await response.Body.transformToByteArray();
            archive.append(Buffer.from(bodyBytes), { name: `${prefix}/${baseName}.jpg` });
          }
        } catch (err) {
          console.error(`Failed to fetch enhanced photo ${photo.id}:`, err);
        }
      }

      // Hero version in subfolder
      if (photo.isHero && photo.heroUrl) {
        try {
          const command = new GetObjectCommand({ Bucket: bucketName, Key: photo.heroUrl });
          const response = await s3Client.send(command);
          if (response.Body) {
            const bodyBytes = await response.Body.transformToByteArray();
            archive.append(Buffer.from(bodyBytes), { name: `${prefix}/cover-photos/HERO-${baseName}.jpg` });
          }
        } catch (err) {
          console.error(`Failed to fetch hero photo ${photo.id}:`, err);
        }
      }
    }

    archive.finalize();
    const zipBuffer = await archivePromise;

    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${prefix}.zip"`,
      },
    });
  } catch (error) {
    console.error("Client download ZIP error:", error);
    return NextResponse.json({ error: "Failed to create ZIP" }, { status: 500 });
  }
}
```

### Wire up admin "Download All (ZIP)" button

In `app/admin/submissions/[id]/page.tsx`, find the Download All button (around line 626-629):

```tsx
<button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#383D31] text-white rounded-lg hover:bg-[#2a2e24]">
  <Download className="w-4 h-4" />
  Download All (ZIP)
</button>
```

Add an onClick handler:

```tsx
<button
  onClick={() => {
    window.location.href = `/api/submissions/${submissionId}/download-zip`;
  }}
  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#383D31] text-white rounded-lg hover:bg-[#2a2e24]"
>
  <Download className="w-4 h-4" />
  Download All (ZIP)
</button>
```

---

## Phase 8: Update Magic Link Complete API

### File: `app/api/magic-link/complete/route.ts`

Update to only mark as used for legacy `reupload` type links. Find line 37-40 where `usedAt` is set:

```typescript
    // Mark magic link as used
    await prisma.magicLink.update({
      where: { token },
      data: { usedAt: new Date() }
    });
```

Change to:

```typescript
    // Mark magic link as used (only for legacy single-use reupload links)
    if (!magicLink.type || magicLink.type === "reupload") {
      await prisma.magicLink.update({
        where: { token },
        data: { usedAt: new Date() }
      });
    }
```

Also update the GET handler (line 100-102) to not reject `retake_batch` and `delivery` links that have been "used":

```typescript
    if (magicLink.usedAt) {
      return NextResponse.json({ error: "Link already used" }, { status: 410 });
    }
```

Change to:

```typescript
    if (magicLink.usedAt && (!magicLink.type || magicLink.type === "reupload")) {
      return NextResponse.json({ error: "Link already used" }, { status: 410 });
    }
```

---

## Verification Checklist

1. **Schema migration**: Run `npx prisma migrate dev` — should complete without errors
2. **Multi-hero**: Mark 3 photos as hero → all show star badge → all included in ZIP
3. **Complete Review (retakes)**: Review all photos (some as retake) → click "Send Retake Requests" → verify email sent with correct photos and instructions
4. **Complete Review (delivery)**: All photos approved → click "Deliver to Client" → verify delivery email sent
5. **Retake wizard**: Open retake link on phone → upload 2 of 4 photos → close browser → reopen same link → see 2 already uploaded → upload remaining 2 → submit → verify admin email received
6. **Multiple retake rounds**: After retakes reviewed, request more retakes → new email with fresh link → previous link expired
7. **Delivery page**: Open delivery link → see before/after comparisons for all photos → hero photos highlighted → download individual → download ZIP
8. **Admin ZIP**: Click "Download All (ZIP)" → opens ZIP with enhanced/, originals/, cover-photos/ folders
9. **Client feedback**: Click thumbs up → see thank you → or click thumbs down → enter notes → admin notified
10. **Email rendering**: All 3 new email templates render with correct Listing Lift branding (dark green header, beige body)

---

## Important Notes

- **Do NOT modify** `app/api/submissions/[id]/auto-enhance/route.ts` — auto-enhancement is unchanged
- **Do NOT modify** `app/admin/settings/page.tsx` — admin settings are unchanged
- All client-facing pages MUST work on mobile phones (retirees using smartphones)
- All buttons 48px+ tall, primary CTAs 56px+ and full-width on mobile
- Body text 16px minimum on mobile, headers 20px+
- No login required for any client page (magic link auth only)
- The retake wizard shows ONE photo at a time, not a list
- The `retake_batch` magic link is NEVER marked as used — supports multiple sessions over 30 days
- Use the existing Listing Lift color scheme: dark green #383D31, warm beige #f9f7f4
