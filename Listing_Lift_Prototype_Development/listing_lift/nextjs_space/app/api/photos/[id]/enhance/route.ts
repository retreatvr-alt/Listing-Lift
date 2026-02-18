import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { ROOM_PROMPTS, INTENSITY_MODIFIERS } from "@/lib/enhancement-prompts";
import { PRESET_MAP, buildPresetPromptText } from "@/lib/enhancement-presets";
import { getFileUrl, uploadBufferToS3, resizeImageToAirbnb } from "@/lib/s3";
import { ALLOWED_MODELS, DEFAULT_MODEL_ID } from "@/lib/model-configs";

export const dynamic = "force-dynamic";
export const maxDuration = 180; // Allow up to 3 minutes for image generation + resize

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await request.json();
    const {
      intensity = "Moderate",
      skyReplacement = false,
      bedFixing = false,
      windowRecovery = false,
      brightness = false,
      perspective = false,
      reflection = false,
      additionalNotes = "",
      customPrompt = "",
      addTowels = false,
      smoothLinens = false,
      addToiletPaper = false,
      model: requestedModel = DEFAULT_MODEL_ID
    } = data;
    const presetIds: string[] = data.presetIds || [];

    // Validate and sanitize model
    const model = ALLOWED_MODELS.includes(requestedModel) ? requestedModel : DEFAULT_MODEL_ID;

    // Get photo with original URL
    const photo = await prisma.photo.findUnique({
      where: { id: params.id },
      include: {
        enhancementVersions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
        },
      },
    });

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Mark photo as "Enhancing" so UI can show progress
    await prisma.photo.update({
      where: { id: params.id },
      data: { status: "Enhancing" },
    });

    // Always use ORIGINAL photo URL, never the enhanced one
    const originalUrl = await getFileUrl(photo.originalUrl, true);

    // Build the prompt - use customPrompt if provided, otherwise build from templates
    let prompt: string;

    if (customPrompt && customPrompt.trim().length > 0) {
      prompt = customPrompt.trim();
    } else {
      const roomKey = photo.subCategory || photo.roomCategory;
      prompt = ROOM_PROMPTS[roomKey] || ROOM_PROMPTS[photo.roomCategory] || ROOM_PROMPTS["Kitchen"];
      prompt += INTENSITY_MODIFIERS[intensity] || INTENSITY_MODIFIERS["Moderate"];

      // NEW: If presetIds are provided, use the preset system
      if (presetIds.length > 0) {
        prompt += buildPresetPromptText(presetIds);
      } else {
        // LEGACY: Fall back to boolean toggles for backward compatibility
        const toggles: string[] = [];
        if (skyReplacement) toggles.push("Replace the sky with a pleasant blue sky with natural clouds.");
        if (bedFixing) toggles.push("Smooth and fix bed linens to appear crisp, clean, and hotel-quality.");
        if (windowRecovery) toggles.push("Recover blown-out windows to reveal the exterior view.");
        if (brightness) toggles.push("Increase overall brightness and open up shadow areas.");
        if (perspective) toggles.push("Correct perspective distortion and straighten vertical lines.");
        if (reflection) toggles.push("Remove photographer reflections from mirrors, glass, and screens.");
        if (addTowels) toggles.push("Add fresh, neatly folded white towels if towels are missing or sparse.");
        if (smoothLinens) toggles.push("Smooth bed linens and duvet to appear freshly made and wrinkle-free.");
        if (addToiletPaper) toggles.push("Add a toilet paper roll if one is not visible.");
        if (toggles.length > 0) {
          prompt += `\n\nADDITIONAL SPECIFIC INSTRUCTIONS:\n${toggles.join("\n")}`;
        }
      }

      if (additionalNotes) {
        prompt += `\n\nADMIN NOTES:\n${additionalNotes}`;
      }
    }

    console.log("[Enhancement] Starting for photo:", params.id);
    console.log("[Enhancement] Model:", model);
    console.log("[Enhancement] Orientation:", photo.orientation);
    console.log("[Enhancement] Is Hero:", photo.isHero);
    console.log("[Enhancement] Prompt length:", prompt.length);

    // Determine image_size for the API call
    // gpt-image-1.5 via RouteLLM supports: "1024x1024", "1536x1024", "1024x1536"
    // 1536x1024 = 3:2 landscape, 1024x1536 = 2:3 portrait
    const imageSize = photo.orientation === "portrait" ? "1024x1536" : "1536x1024";

    // AbortController for timeout (150 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 150000);

    try {
      // Call Abacus AI with selected model - synchronous JSON response, NOT streaming
      const response = await fetch("https://apps.abacus.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.ABACUSAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: { url: originalUrl },
                },
                {
                  type: "text",
                  text: prompt,
                },
              ],
            },
          ],
          modalities: ["image"],
          image_config: {
            num_images: 1,
            image_size: imageSize,
            quality: "high",
            input_fidelity: "high",
          },
          max_tokens: 1000,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Enhancement] API error:", response.status, errorText);
        await prisma.photo.update({
          where: { id: params.id },
          data: { status: photo.status },
        });
        return NextResponse.json(
          { error: `Enhancement API failed: ${response.status}` },
          { status: 500 }
        );
      }

      const result = await response.json();
      console.log("[Enhancement] Response received, extracting image...");

      // Extract enhanced image URL from response
      let enhancedImageUrl = "";

      // Primary: choices[0].message.content array (gpt-image-1.5 format)
      const content = result?.choices?.[0]?.message?.content;
      if (Array.isArray(content)) {
        for (const item of content) {
          if (item?.type === "image_url" && item?.image_url?.url) {
            enhancedImageUrl = item.image_url.url;
            break;
          }
        }
      }

      // Fallback: check .images property
      if (!enhancedImageUrl) {
        const images = result?.choices?.[0]?.message?.images;
        if (images && images.length > 0) {
          enhancedImageUrl = images[0]?.image_url?.url || images[0]?.url || "";
        }
      }

      if (!enhancedImageUrl) {
        console.error("[Enhancement] No image in response:", JSON.stringify(result).substring(0, 500));
        await prisma.photo.update({
          where: { id: params.id },
          data: { status: photo.status },
        });
        return NextResponse.json(
          { error: "No enhanced image returned from API" },
          { status: 500 }
        );
      }

      console.log("[Enhancement] Got enhanced image URL, downloading for resize...");

      // Download the enhanced image
      const imageResponse = await fetch(enhancedImageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to download enhanced image: ${imageResponse.status}`);
      }
      const rawBuffer = Buffer.from(await imageResponse.arrayBuffer());

      // Resize to exact Airbnb dimensions using sharp
      // Standard: 3000x2000 (landscape) or 2000x3000 (portrait)
      // Hero: 4000x2667 (landscape) or 2667x4000 (portrait)
      console.log("[Enhancement] Resizing to Airbnb dimensions (hero:", photo.isHero, ")...");
      const standardBuffer = await resizeImageToAirbnb(rawBuffer, photo.orientation, false);

      // Upload standard version to S3
      const standardS3Key = await uploadBufferToS3(
        standardBuffer,
        `enhanced-${photo.id}.jpg`,
        "image/jpeg"
      );
      console.log("[Enhancement] Standard version uploaded:", standardS3Key);

      // If this is a hero photo, also generate the higher-res hero version
      let heroS3Key: string | null = null;
      if (photo.isHero) {
        console.log("[Enhancement] Generating hero version (4000x2667)...");
        const heroBuffer = await resizeImageToAirbnb(rawBuffer, photo.orientation, true);
        heroS3Key = await uploadBufferToS3(
          heroBuffer,
          `hero-${photo.id}.jpg`,
          "image/jpeg"
        );
        console.log("[Enhancement] Hero version uploaded:", heroS3Key);
      }

      // Save to database
      const versionNumber =
        (photo?.enhancementVersions?.[0]?.versionNumber || 0) + 1;

      await prisma.enhancementVersion.create({
        data: {
          photoId: params.id,
          versionNumber,
          enhancedUrl: standardS3Key,
          intensity,
          model,
          skyReplacement,
          bedFixing,
          windowRecovery,
          brightness,
          perspective,
          reflection,
          additionalNotes: additionalNotes || null,
          presetIds: presetIds.length > 0 ? JSON.stringify(presetIds) : null,
        },
      });

      await prisma.photo.update({
        where: { id: params.id },
        data: {
          enhancedUrl: standardS3Key,
          ...(heroS3Key ? { heroUrl: heroS3Key } : {}),
          status: "Enhanced",
        },
      });

      console.log("[Enhancement] Complete! Version:", versionNumber, "Model:", model);

      return NextResponse.json({
        status: "completed",
        enhancedUrl: standardS3Key,
        heroUrl: heroS3Key || null,
        versionNumber,
        model,
      });
    } catch (abortError: unknown) {
      clearTimeout(timeoutId);
      if (abortError instanceof Error && abortError.name === "AbortError") {
        console.error("[Enhancement] Timed out after 150 seconds");
        await prisma.photo.update({
          where: { id: params.id },
          data: { status: photo.status },
        });
        return NextResponse.json(
          { error: "Enhancement timed out after 150 seconds. Please try again — processing times can vary." },
          { status: 504 }
        );
      }
      throw abortError;
    }
  } catch (error) {
    console.error("[Enhancement] Error:", error);
    return NextResponse.json(
      { error: "Enhancement failed" },
      { status: 500 }
    );
  }
}
