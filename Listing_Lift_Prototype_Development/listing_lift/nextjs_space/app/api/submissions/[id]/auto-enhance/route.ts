import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ROOM_PROMPTS, INTENSITY_MODIFIERS } from "@/lib/enhancement-prompts";
import { getFileUrl, uploadBufferToS3, resizeImageToAirbnb } from "@/lib/s3";
import { sendNotificationEmail, generateAutoEnhanceCompleteEmail } from "@/lib/email";
import { DEFAULT_MODEL_ID } from "@/lib/model-configs";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // Allow up to 5 minutes for batch processing

// Internal API key for auto-enhancement (simple security)
const AUTO_ENHANCE_KEY = process.env.AUTO_ENHANCE_KEY || 'internal-auto-enhance';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Simple security check
    const authHeader = request.headers.get('x-auto-enhance-key');
    if (authHeader !== AUTO_ENHANCE_KEY) {
      console.log('[AUTO-ENHANCE] Invalid key, ignoring request');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const submissionId = params.id;
    console.log('[AUTO-ENHANCE] Starting auto-enhancement for submission:', submissionId);

    // Get all photos for this submission
    const photos = await prisma.photo.findMany({
      where: { submissionId },
      include: {
        enhancementVersions: {
          orderBy: { versionNumber: 'desc' },
          take: 1
        }
      }
    });

    console.log('[AUTO-ENHANCE] Found', photos.length, 'photos to enhance');

    // Fetch all room settings from DB (one query, not per-photo)
    const roomSettings = await prisma.roomEnhancementSettings.findMany();
    const settingsMap = new Map(roomSettings.map(s => [s.roomKey, s]));

    let successCount = 0;
    let errorCount = 0;

    // Process photos one at a time to avoid rate limits
    for (const photo of photos) {
      try {
        // Skip if already enhanced
        if (photo.enhancedUrl) {
          console.log('[AUTO-ENHANCE] Photo', photo.id, 'already enhanced, skipping');
          continue;
        }

        console.log('[AUTO-ENHANCE] Enhancing photo:', photo.id, 'category:', photo.roomCategory);

        // Get the original URL
        const originalUrl = await getFileUrl(photo.originalUrl, true);

        // Build prompt using DB settings if available
        const roomKey = photo.subCategory || photo.roomCategory;
        const dbSettings = settingsMap.get(roomKey) || settingsMap.get(photo.roomCategory);

        // Use custom prompt from DB if set, otherwise use code defaults
        let prompt = dbSettings?.customPrompt || ROOM_PROMPTS[roomKey] || ROOM_PROMPTS[photo.roomCategory] || ROOM_PROMPTS["Kitchen"];

        // Use DB intensity or default to Moderate
        const intensity = dbSettings?.defaultIntensity || "Moderate";
        prompt += INTENSITY_MODIFIERS[intensity];

        // Use DB model or default
        const modelToUse = dbSettings?.defaultModel || DEFAULT_MODEL_ID;

        // Call the Abacus AI API
        const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`
          },
          body: JSON.stringify({
            model: modelToUse,
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'image_url', image_url: { url: originalUrl } },
                  { type: 'text', text: prompt }
                ]
              }
            ],
            modalities: ['image'],
            image_config: {
              num_images: 1,
              // Use image_size instead of aspect_ratio for gpt-image-1.5
              // 1536x1024 = 3:2 landscape, 1024x1536 = 2:3 portrait
              image_size: photo.orientation === 'portrait' ? '1024x1536' : '1536x1024',
              quality: 'high',
              input_fidelity: 'high'
            },
            max_tokens: 1000
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[AUTO-ENHANCE] API error for photo', photo.id, ':', errorText.substring(0, 200));
          errorCount++;
          continue;
        }

        const result = await response.json();

        // Extract image URL
        let enhancedImageUrl = '';
        const content = result.choices?.[0]?.message?.content;
        if (Array.isArray(content)) {
          for (const item of content) {
            if (item?.type === 'image_url' && item?.image_url?.url) {
              enhancedImageUrl = item.image_url.url;
              break;
            }
          }
        }
        if (!enhancedImageUrl) {
          const images = result.choices?.[0]?.message?.images;
          if (images && images.length > 0) {
            enhancedImageUrl = images[0]?.image_url?.url || images[0]?.url || '';
          }
        }
        if (!enhancedImageUrl && typeof content === 'string' && content.startsWith('http')) {
          enhancedImageUrl = content;
        }

        if (!enhancedImageUrl) {
          console.error('[AUTO-ENHANCE] No image URL for photo', photo.id);
          errorCount++;
          continue;
        }

        // Download, resize to Airbnb dimensions, and re-upload to our S3
        let s3Key = '';
        try {
          const imageResponse = await fetch(enhancedImageUrl);
          if (imageResponse.ok) {
            const rawBuffer = Buffer.from(await imageResponse.arrayBuffer());
            
            // Resize to exact Airbnb dimensions (3000x2000 for landscape, 2000x3000 for portrait)
            const resizedBuffer = await resizeImageToAirbnb(rawBuffer, photo.orientation, false);
            
            s3Key = await uploadBufferToS3(
              resizedBuffer,
              `enhanced-${photo.id}-auto.jpg`,
              'image/jpeg'
            );
          }
        } catch (reuploadError) {
          console.warn('[AUTO-ENHANCE] Resize/re-upload failed for photo', photo.id, reuploadError);
          errorCount++;
          continue;
        }

        if (!s3Key) {
          console.error('[AUTO-ENHANCE] No S3 key for photo', photo.id);
          errorCount++;
          continue;
        }

        // Save to database (store S3 key, not URL)
        const versionNumber = (photo.enhancementVersions?.[0]?.versionNumber || 0) + 1;

        await prisma.enhancementVersion.create({
          data: {
            photoId: photo.id,
            versionNumber,
            enhancedUrl: s3Key,
            intensity: intensity,
            model: modelToUse,
            skyReplacement: dbSettings?.skyReplacement || false,
            bedFixing: dbSettings?.bedFixing || false,
            windowRecovery: dbSettings?.windowRecovery || false,
            brightness: dbSettings?.brightness || false,
            perspective: dbSettings?.perspective || false,
            reflection: dbSettings?.reflection || false,
            additionalNotes: 'Auto-enhanced on submission'
          }
        });

        await prisma.photo.update({
          where: { id: photo.id },
          data: {
            enhancedUrl: s3Key,
            status: 'Enhanced'
          }
        });

        console.log('[AUTO-ENHANCE] Photo', photo.id, 'enhanced successfully');
        successCount++;

        // Small delay between photos to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (photoError) {
        console.error('[AUTO-ENHANCE] Error enhancing photo', photo.id, ':', photoError);
        errorCount++;
      }
    }

    console.log('[AUTO-ENHANCE] Completed. Success:', successCount, 'Errors:', errorCount);

    // Send email notification to admin that auto-enhancement is complete
    try {
      const submission = await prisma.submission.findUnique({
        where: { id: submissionId },
        select: {
          submissionNumber: true,
          homeownerName: true,
          propertyAddress: true,
          city: true,
          provinceState: true,
          postalZip: true,
        }
      });

      if (submission) {
        const fullAddress = [
          submission.propertyAddress,
          submission.city,
          submission.provinceState,
          submission.postalZip
        ].filter(Boolean).join(', ');

        await sendNotificationEmail({
          notificationId: process.env.NOTIF_ID_AUTOENHANCEMENT_COMPLETE || '',
          recipientEmail: 'dan@retreatvr.ca',
          subject: `✅ Enhancements Ready - #${submission.submissionNumber} (${successCount}/${photos.length} photos)`,
          body: generateAutoEnhanceCompleteEmail({
            submissionNumber: submission.submissionNumber,
            homeownerName: submission.homeownerName,
            propertyAddress: fullAddress,
            totalPhotos: photos.length,
            successCount,
            errorCount
          })
        });
        console.log('[AUTO-ENHANCE] Admin notification email sent');
      }
    } catch (emailError) {
      console.error('[AUTO-ENHANCE] Failed to send notification email:', emailError);
      // Don't fail the whole response if email fails
    }

    // Also update submission status to "In Progress" since enhancements are done
    try {
      await prisma.submission.update({
        where: { id: submissionId },
        data: { status: 'In Progress' }
      });
    } catch (statusError) {
      console.error('[AUTO-ENHANCE] Failed to update submission status:', statusError);
    }

    return NextResponse.json({
      status: 'completed',
      total: photos.length,
      success: successCount,
      errors: errorCount
    });

  } catch (error) {
    console.error('[AUTO-ENHANCE] Error:', error);
    return NextResponse.json({
      error: "Auto-enhancement failed",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
