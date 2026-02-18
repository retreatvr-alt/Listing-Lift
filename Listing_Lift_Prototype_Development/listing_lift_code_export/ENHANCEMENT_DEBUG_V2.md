# Claude Code Debug Prompt V2: Enhancement API Timeout (524)

## Current Error

The enhancement API is returning a **524 timeout error** from Cloudflare. Screenshots show:

```
Enhancement failed: Enhancement API failed
Details: <!DOCTYPE html>...
<title>abacus.ai | 524: A timeout occurred</title>
status: 524
```

And a **CORS error** for the S3 image:
```
Access to image at 'https://abacusai-apps-92d1307...s3.us-west-2.amazonaws.com/...' 
from origin 'https://listinglift.abacusai.app' has been blocked by CORS policy
```

---

## Root Cause Analysis

1. **524 Timeout**: The `gpt-image-1` model is taking longer than Cloudflare's ~100 second timeout. Even though `maxDuration = 120` was set, Cloudflare's proxy cuts off at ~100s.

2. **CORS on S3 images**: This is a secondary issue - the enhanced image URL returned by the API might be from a different S3 bucket that doesn't have CORS configured for the app's domain.

---

## Current Enhancement API Code

```typescript
// /app/api/photos/[id]/enhance/route.ts
const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`
  },
  body: JSON.stringify({
    model: 'gpt-image-1',
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
      aspect_ratio: photo.orientation === 'portrait' ? '3:4' : '4:3',
      quality: 'high'
    },
    max_tokens: 1000
  })
});
```

---

## Questions for You (Claude Code)

1. **Is `gpt-image-1` the correct model for image editing/enhancement on Abacus AI?**
   - The 524 timeout suggests the request is failing or taking too long
   - What models are available for image generation/editing?
   - Should we use a different model like `flux-kontext`, `dall-e`, `stable-diffusion`?

2. **Is the API endpoint and request format correct?**
   - `https://apps.abacus.ai/v1/chat/completions`
   - Is this the right endpoint for image generation?
   - Should we use a different endpoint?

3. **Is the request payload structured correctly?**
   - `modalities: ['image']`
   - `image_config: { num_images: 1, aspect_ratio: '4:3', quality: 'high' }`
   - Are these parameters correct?

4. **How to handle long-running image generation?**
   - Should we implement a polling/webhook pattern instead of synchronous request?
   - Is there an async image generation API?

5. **CORS issue with returned image URLs**
   - The enhanced image URL is from `abacusai-apps-*.s3.us-west-2.amazonaws.com`
   - How do we ensure the returned images are accessible from our app?
   - Should we proxy or re-upload the enhanced images to our own S3?

---

## Potential Solutions to Explore

### Option 1: Use a different/faster model
If `gpt-image-1` is slow or wrong, what's the correct model for real estate photo enhancement?

### Option 2: Implement async pattern
```typescript
// 1. Start enhancement job (returns job_id)
// 2. Return immediately to client
// 3. Poll for completion OR use webhook
// 4. Update database when complete
```

### Option 3: Reduce timeout expectations
- Use simpler prompts
- Lower quality setting
- Smaller image dimensions

### Option 4: Background job with status polling
Create a separate endpoint that:
1. `/api/photos/[id]/enhance` - Starts enhancement, returns job ID immediately
2. `/api/photos/[id]/enhance/status` - Client polls this for completion
3. Store enhancement job status in database

---

## What I Need From You

1. **Confirm the correct Abacus AI model and API format** for image enhancement
2. **Provide the exact API call** that works for image editing
3. **Recommend architecture** for handling long-running image generation (sync vs async)
4. **Solution for CORS issue** with returned image URLs

Please provide exact code changes for DeepAgent to implement.

---

## Server Logs (Production)

The server logs show:

```
[ENHANCE] Starting enhancement for photo: cmlg4az0d0001qc08q2bnv6if
[ENHANCE] Using model: gpt-image-1
[ENHANCE] Original URL: https://abacusai-apps-92d1307...s3.us-west-2.amazonaws.com/22837/public/upl...
[ENHANCE] Prompt length: 2681
[ENHANCE] API error: 524 <!DOCTYPE html>
<title>abacus.ai | 524: A timeout occurred</title>
```

**The request IS being made correctly, but the Abacus AI API (`apps.abacus.ai`) is timing out after ~100 seconds.**

This confirms:
- The API key is valid (request went through)
- The model name is accepted
- The prompt is being sent
- But the **response is taking too long** and Cloudflare is cutting it off

---

## Possible Causes

1. **`gpt-image-1` is a slow/heavy model** - Real estate photo enhancement with a 2,681 character prompt may take several minutes
2. **The prompt is too long/complex** - 2,681 characters is quite detailed
3. **Wrong model for this use case** - Maybe `gpt-image-1` isn't optimized for photo enhancement
4. **Server-side queueing** - The API might be queueing requests

---

## Summary for Claude Code

**The API call IS working** - it's reaching Abacus AI correctly. The problem is:

1. The `gpt-image-1` model takes >100 seconds to generate an enhanced image
2. Cloudflare times out at ~100 seconds
3. We need either:
   - A faster model
   - An async/polling pattern
   - Shorter prompts
   - Webhook-based callback
