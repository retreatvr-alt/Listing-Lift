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
      const room = (photo.subCategory || photo.roomCategory).replace(/[\/\\]/g, "-");
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

      // Hero version (in separate folder)
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
