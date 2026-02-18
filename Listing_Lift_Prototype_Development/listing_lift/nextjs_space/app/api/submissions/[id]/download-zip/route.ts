import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { createS3Client, getBucketConfig } from "@/lib/aws-config";
import archiver from "archiver";

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
      const room = (photo.subCategory || photo.roomCategory).replace(/[\/\\]/g, "-");
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
