# Listing Lift - Enhancement Quality Issues V3

## Date: February 10, 2026

## Context for Claude Code

This document summarizes the current state of the photo enhancement feature after multiple iterations. The user has tested the latest deployment and provided feedback. **No fixes should be made yet** - this is for analysis and planning.

---

## Current Architecture

### Model in Use
- **Model**: `flux-kontext` (switched from `gpt-image-1` due to 524 timeout errors)
- **API**: Abacus AI `/v1/chat/completions`
- **Max Duration**: 60 seconds

### S3 Re-upload Flow (CORS Fix)
When enhancement completes:
1. API returns enhanced image URL from Abacus AI's S3
2. Server downloads that image
3. Server re-uploads to user's own S3 bucket (`public/enhanced/` prefix)
4. Database stores the re-uploaded URL

### Relevant Files
- `/app/api/photos/[id]/enhance/route.ts` - Enhancement API endpoint
- `/app/api/submissions/[id]/auto-enhance/route.ts` - Auto-enhancement on submission
- `/lib/enhancement-prompts.ts` - Room-specific prompts
- `/lib/s3.ts` - S3 utilities including `uploadBufferToS3`
- `/app/admin/submissions/[id]/page.tsx` - Admin UI with lightbox

---

## User's Latest Observations (Screenshot Attached)

### 1. CORS Errors Still Appearing in Console

From the screenshot, the console shows:
```
Access to image at 'https://lh3.googleusercontent.com/tdHQwJccDlaIcizTI7faQQzdsYGAWz-cNW4Bjl_c6pUdD3nxr5nuQeUTHwZ-OP96ihJSAE7pUh_Qfl4Voq6H5LKGUw=s1280-w1280-h800' 
from origin 'https://listinglift.abacusai.app' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**Analysis**: The CORS error is appearing for what looks like an OLD enhanced URL that's still stored in the database. The re-upload logic was added, but:
- Either the re-upload failed silently and fell back to the original URL
- Or there are old records in the database with URLs from before the CORS fix was implemented

**Question**: Is the displayed "ENHANCED" image actually loading and visible despite the CORS error? If yes, the error might be from a background prefetch or old cached reference.

---

### 2. Enhancement Quality Issues

The user reports the enhanced image is:

#### A. Too AI-Generated Looking
- Textures (like wood grain) appear too smooth/blurry
- Not photorealistic enough
- Small details are lost or look artificial

#### B. Shape Distortions
- Railings appear warped
- Cabinet door handles are not accurate
- Fine geometric details are corrupted

#### C. Comparison Between Versions
- **First enhancement attempt (before prompt changes)**: Better photorealism, but added objects that didn't exist
- **Latest enhancement (with conservative prompts)**: Better accuracy (doesn't add fake objects), but worse photorealism and detail preservation

---

### 3. Root Cause Analysis

This is likely a **model characteristic issue**, not purely a prompting issue:

#### Why `flux-kontext` may not be ideal for this use case:

1. **flux-kontext is optimized for**: Creative image editing, style transfer, artistic modifications
2. **Real estate photo enhancement needs**: Color correction, exposure adjustment, minimal changes to geometry/texture

#### The Trade-off We're Seeing:
- **Strong restrictions** ("DO NOT change anything") → Model interprets this as "recreate the image while following rules" → Results in AI-generated texture artifacts
- **Weaker restrictions** → Model follows enhancement instructions more literally → Adds objects that don't exist

#### Evidence:
The user noted: "The first version was slightly better than this one [in terms of photorealism]" - this was before we added the ultra-conservative prompts.

---

## Current Prompt Structure (After V2 Changes)

```
REAL ESTATE PHOTO ENHANCEMENT - KITCHEN

⛔ ABSOLUTE RESTRICTIONS - NEVER VIOLATE:
- DO NOT add, remove, or move ANY objects
- DO NOT add furniture, appliances, decorations, or items
- DO NOT change the scene or composition in any way
- DO NOT create or generate new elements
- The output must show EXACTLY the same scene as input

✅ ALLOWED CORRECTIONS ONLY:
- Adjust exposure and brightness levels
- Correct white balance and color temperature
- Reduce shadows and increase highlight detail
- Straighten vertical lines and fix lens distortion
- Sharpen existing details slightly
- Improve overall clarity

This is a legal document photo - accuracy is critical. Guests will visit this exact space.

INTENSITY: MODERATE - Apply standard corrections...
```

---

## User's Suggestions

### 1. Move "Creative" Features to Manual Checkboxes
The user suggests that features like "add missing amenities (towels, toilet paper)" should NOT be in the base prompt. Instead:
- Keep base prompt ultra-conservative (lighting/color only)
- Add checkboxes in the UI for optional creative additions:
  - [ ] Add towels (bathrooms)
  - [ ] Smooth bed linens (bedrooms)
  - [ ] Sky replacement (exteriors)
  - etc.

This way, the admin can consciously choose when to allow the AI to make creative additions.

### 2. Auto-Refresh Enhanced Image Preview
Currently, after enhancement completes, the user must manually refresh the page to see the result. Request:
- Automatically update the "ENHANCED" image in the UI when enhancement completes
- Show loading state during enhancement
- Swap in the new image when ready

---

## Possible Solutions to Explore

### Option A: Different Model
Consider switching to a model better suited for photo correction rather than creative editing:

1. **Traditional photo enhancement** (non-AI):
   - Could use Sharp.js or similar for basic corrections
   - Pros: Predictable, no hallucinations
   - Cons: Limited capability, no intelligent scene understanding

2. **Different AI model**:
   - `flux-2-pro` - Higher quality variant
   - `dall-e` - Different architecture, may handle restrictions differently
   - A dedicated "photo restoration" or "photo enhancement" model if available

### Option B: Hybrid Approach
Use AI for specific tasks only:
1. Basic corrections (exposure, white balance) via Sharp.js or similar
2. AI only for complex tasks (sky replacement, window recovery) when explicitly requested

### Option C: Refined Prompting
Try a different prompt strategy:

```
You are a professional photo editor. Make ONLY these adjustments:
1. Increase exposure by 0.5 stops
2. Set white balance to 5500K
3. Lift shadows by 20%
4. Add subtle sharpening

Do NOT regenerate or recreate any part of the image.
Do NOT change any objects, textures, or geometry.
Apply adjustments as a Lightroom/Photoshop editor would.
```

This is more "technical" and less "creative" - treating it like photo editing software rather than image generation.

### Option D: Lower the "Creativity" Parameters
Check if the API supports parameters like:
- `temperature` - Lower values = more deterministic
- `creativity` or `variation` settings
- `strength` parameter (how much to modify vs preserve)

---

## Questions for Investigation

1. **What models are available through Abacus AI for image editing?**
   - Is there a model specifically designed for photo enhancement/restoration?
   - What parameters does flux-kontext accept?

2. **Can we reduce the "creativity" of the model?**
   - Temperature settings?
   - Guidance scale?
   - Preserve/modify ratio?

3. **CORS error investigation**:
   - Is the enhanced image actually displaying correctly despite the console error?
   - Are there old database records with pre-CORS-fix URLs?
   - Is the re-upload actually succeeding?

4. **Why does tighter prompting = worse photorealism?**
   - Is the model interpreting "don't change" as "regenerate conservatively"?
   - Would a different prompt structure help?

---

## UI Feature Requests

1. **Auto-refresh enhanced image** - No manual page refresh needed
2. **Optional creative checkboxes** - For features like:
   - Add staging items (towels, etc.)
   - Smooth bed linens
   - Sky replacement
   - Window view recovery

---

## Files for Reference

### Enhancement API Route
`/app/api/photos/[id]/enhance/route.ts`

### Enhancement Prompts
`/lib/enhancement-prompts.ts`

### S3 Upload Utility
`/lib/s3.ts` - specifically `uploadBufferToS3` function

### Admin UI
`/app/admin/submissions/[id]/page.tsx`

---

## Summary

The core issue is that `flux-kontext` (and likely similar generative models) is designed for **creative image generation**, not **photo correction**. When we tell it "don't change anything," it still has to regenerate the image through its neural network, which introduces artifacts.

Possible paths forward:
1. Find a model designed for photo enhancement, not generation
2. Use traditional image processing for basic corrections, AI only for creative features
3. Experiment with different prompt structures that frame it as "adjustment" rather than "enhancement"
4. Investigate model parameters that could reduce creativity/variation

**User's priority**: Photorealism and accuracy over creative enhancements. They'd rather have a photo that looks real with minor improvements than a heavily-enhanced photo that looks AI-generated.
