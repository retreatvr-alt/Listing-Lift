import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createS3Client, getBucketConfig } from "./aws-config";
import sharp from "sharp";

const s3Client = createS3Client();
const { bucketName, folderPrefix } = getBucketConfig();

export async function generatePresignedUploadUrl(
  fileName: string,
  contentType: string,
  isPublic: boolean = false
): Promise<{ uploadUrl: string; cloud_storage_path: string }> {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const cloud_storage_path = isPublic
    ? `${folderPrefix}public/uploads/${timestamp}-${sanitizedFileName}`
    : `${folderPrefix}uploads/${timestamp}-${sanitizedFileName}`;

  // Don't set ContentDisposition for images - we want them to display inline, not download
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: cloud_storage_path,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

  return { uploadUrl, cloud_storage_path };
}

export async function initiateMultipartUpload(
  fileName: string,
  isPublic: boolean = false
): Promise<{ uploadId: string; cloud_storage_path: string }> {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const cloud_storage_path = isPublic
    ? `${folderPrefix}public/uploads/${timestamp}-${sanitizedFileName}`
    : `${folderPrefix}uploads/${timestamp}-${sanitizedFileName}`;

  // Don't set ContentDisposition for images - we want them to display inline
  const command = new CreateMultipartUploadCommand({
    Bucket: bucketName,
    Key: cloud_storage_path,
  });

  const response = await s3Client.send(command);

  return {
    uploadId: response.UploadId ?? "",
    cloud_storage_path,
  };
}

export async function getPresignedUrlForPart(
  cloud_storage_path: string,
  uploadId: string,
  partNumber: number
): Promise<string> {
  const command = new UploadPartCommand({
    Bucket: bucketName,
    Key: cloud_storage_path,
    UploadId: uploadId,
    PartNumber: partNumber,
  });

  return getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

export async function completeMultipartUpload(
  cloud_storage_path: string,
  uploadId: string,
  parts: { ETag: string; PartNumber: number }[]
): Promise<void> {
  const command = new CompleteMultipartUploadCommand({
    Bucket: bucketName,
    Key: cloud_storage_path,
    UploadId: uploadId,
    MultipartUpload: { Parts: parts },
  });

  await s3Client.send(command);
}

export async function getFileUrl(
  cloud_storage_path: string,
  isPublic: boolean = false
): Promise<string> {
  if (isPublic) {
    const region = process.env.AWS_REGION || "us-east-1";
    return `https://${bucketName}.s3.${region}.amazonaws.com/${cloud_storage_path}`;
  }

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: cloud_storage_path,
    // Don't set ResponseContentDisposition - let browser display images inline
  });

  return getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

export async function deleteFile(cloud_storage_path: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: cloud_storage_path,
  });

  await s3Client.send(command);
}

export async function uploadBufferToS3(
  buffer: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const cloud_storage_path = `${folderPrefix}public/enhanced/${timestamp}-${sanitizedFileName}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: cloud_storage_path,
    Body: buffer,
    ContentType: contentType,
    ContentDisposition: "inline",
  });

  await s3Client.send(command);

  return cloud_storage_path;
}

/**
 * Resize an image buffer to exact Airbnb dimensions using sharp.
 * Standard: 3000x2000 (landscape) or 2000x3000 (portrait)
 * Hero: 4000x2667 (landscape) or 2667x4000 (portrait)
 * 
 * Uses "inside" fit so nothing gets cropped, then extends to exact dimensions.
 * Applies lanczos3 kernel for sharpest upscale and post-resize sharpening.
 */
export async function resizeImageToAirbnb(
  inputBuffer: Buffer,
  orientation: string,
  isHero: boolean
): Promise<Buffer> {
  let targetWidth: number;
  let targetHeight: number;

  if (isHero) {
    targetWidth = orientation === "portrait" ? 2667 : 4000;
    targetHeight = orientation === "portrait" ? 4000 : 2667;
  } else {
    targetWidth = orientation === "portrait" ? 2000 : 3000;
    targetHeight = orientation === "portrait" ? 3000 : 2000;
  }

  // Get the input image dimensions to decide strategy
  const metadata = await sharp(inputBuffer).metadata();
  const inputWidth = metadata.width || 1536;
  const inputHeight = metadata.height || 1024;
  const inputRatio = inputWidth / inputHeight;
  const targetRatio = targetWidth / targetHeight;

  // If aspect ratios match closely (within 2%), just resize directly — no crop needed
  const ratioMatch = Math.abs(inputRatio - targetRatio) / targetRatio < 0.02;

  let pipeline = sharp(inputBuffer);

  if (ratioMatch) {
    // Aspect ratios match — direct resize, no cropping
    pipeline = pipeline.resize(targetWidth, targetHeight, {
      fit: "fill",            // Stretch to exact dimensions (no visible distortion since ratios match)
      kernel: "lanczos3",     // Sharpest resize kernel
    });
  } else {
    // Aspect ratios don't match — resize to fit inside, then pad with white to reach exact dimensions
    pipeline = pipeline.resize(targetWidth, targetHeight, {
      fit: "inside",          // Scale to fit within bounds, no cropping
      kernel: "lanczos3",
      withoutEnlargement: false,
    }).extend({
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      background: { r: 255, g: 255, b: 255 },
    });
    // After inside+extend, we need to ensure exact dimensions
    pipeline = pipeline.resize(targetWidth, targetHeight, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255 },
      kernel: "lanczos3",
    });
  }

  // Apply post-resize sharpening to counteract upscale softness
  pipeline = pipeline.sharpen({
    sigma: 0.8,       // Subtle sharpening radius
    m1: 1.0,          // Flat area sharpening
    m2: 0.7,          // Edge sharpening (slightly less to avoid halos)
  });

  const resized = await pipeline
    .jpeg({
      quality: 95,          // Higher quality to preserve detail after upscale
      mozjpeg: true,        // Better compression
      chromaSubsampling: '4:4:4',  // No chroma subsampling for maximum color accuracy
    })
    .toBuffer();

  return resized;
}

/**
 * Builds a human-readable download filename from photo metadata.
 * Used at the download layer (ZIP downloads, individual download buttons).
 * S3 storage paths remain unchanged.
 *
 * Examples:
 *   - Enhanced: "Kitchen-Main-View.jpg"
 *   - Original: "Kitchen-Main-View-original.jpg"
 *   - Hero:     "HERO-Kitchen-Main-View.jpg"
 *   - With subcategory: "Living-Room-Open-Layout.jpg" (uses subCategory, not "Living Spaces")
 *   - Numbered (for ZIP): "01-Kitchen-Main-View.jpg"
 */
export function buildDownloadFileName(
  photo: { roomCategory: string; subCategory?: string | null; caption: string },
  variant: 'enhanced' | 'original' | 'hero',
  index?: number  // Optional 1-based index for numbered files in ZIP downloads
): string {
  // Use subCategory if available (e.g., "Living Room" not "Living Spaces")
  const room = (photo.subCategory || photo.roomCategory)
    .replace(/[/\\]/g, "-")        // Replace slashes (e.g., "Pool/Hot Tub" → "Pool-Hot Tub")
    .replace(/\s+/g, "-");          // Replace spaces with hyphens

  const caption = photo.caption
    .replace(/[^a-zA-Z0-9 _-]/g, "") // Strip special chars
    .replace(/\s+/g, "-")             // Replace spaces with hyphens
    .replace(/-+/g, "-")              // Collapse multiple hyphens
    .replace(/^-|-$/g, "");           // Trim leading/trailing hyphens

  const base = caption ? `${room}-${caption}` : room;
  const numbered = index !== undefined ? `${String(index).padStart(2, "0")}-${base}` : base;

  switch (variant) {
    case 'original':
      return `${numbered}-original.jpg`;
    case 'hero':
      return `HERO-${numbered}.jpg`;
    case 'enhanced':
    default:
      return `${numbered}.jpg`;
  }
}
