# Listing Lift — Round 3: Eliminate Image Generation in Auto-Enhancement

## CRITICAL ISSUE
The AI models are generating/modifying content in photos (adding objects, replacing skies, altering textures). Auto-enhancement must produce ZERO content changes — only exposure, color, sharpening, and geometric corrections. Content changes (sky replacement, reflection removal, adding towels, etc.) should ONLY happen when explicitly toggled during manual re-enhancement.

## Overview of Changes
1. Add `input_fidelity: "high"` API parameter to both enhancement routes
2. Completely rewrite all room prompts in `lib/enhancement-prompts.ts` with preservation-first approach
3. Rewrite intensity modifiers to remove all content-changing instructions
4. Add new prompts for Foyer/Entryway, Home Theater, and Game Room (if not already added in Round 2)

---

## Change 1: Add `input_fidelity` to API Calls

### File: `app/api/submissions/[id]/auto-enhance/route.ts`

Find the `image_config` object in the API request body (around line 83-89). Add `input_fidelity: 'high'`:

```typescript
image_config: {
  num_images: 1,
  image_size: photo.orientation === 'portrait' ? '1024x1536' : '1536x1024',
  quality: 'high',
  input_fidelity: 'high'
}
```

### File: `app/api/photos/[id]/enhance/route.ts`

Find the `image_config` object in the API request body. Add `input_fidelity: 'high'`:

```typescript
image_config: {
  num_images: 1,
  image_size: orientation === 'portrait' ? '1024x1536' : '1536x1024',
  quality: 'high',
  input_fidelity: 'high'
}
```

**Note:** If the Abacus AI routing layer doesn't support `input_fidelity`, it will be silently ignored (no error). But it's critical to include it in case it IS passed through to the underlying model.

---

## Change 2: Complete Rewrite of `lib/enhancement-prompts.ts`

Replace the ENTIRE `ROOM_PROMPTS` object and `INTENSITY_MODIFIERS` object with the versions below. Keep `ROOM_TIPS`, `ROOM_CATEGORIES`, and `ROOM_PHOTO_LIMITS` (if added in Round 2) unchanged.

### New ROOM_PROMPTS

```typescript
export const ROOM_PROMPTS: Record<string, string> = {
  Kitchen: `This is a kitchen photo in a vacation rental property. Stainless steel appliances should appear neutral and clean. Wood surfaces should retain their natural grain and warmth. Countertop and backsplash textures must remain completely unaltered.

Adjust ONLY the following:
- Exposure and brightness (balance highlights and shadows evenly across the frame)
- White balance (correct color temperature so whites look white, not yellow or blue)
- Contrast and tonal range (improve without clipping highlights or crushing shadows)
- Sharpness and detail clarity (subtle enhancement on fixtures and hardware, not over-sharpened)
- Vertical line straightening (correct any tilt in cabinets, door frames, appliance edges)
- Lens distortion correction (fix wide-angle barrel distortion or perspective warping)

PRESERVE EXACTLY as-is — do not modify in any way:
- Every appliance, fixture, utensil, and item on counters or shelves
- Cabinet doors, handles, hardware — exact count, position, and style
- The exact layout, composition, camera angle, and framing
- All architectural features including walls, windows, doors, floors, ceilings
- All textures and materials (wood grain, tile pattern, stone, metal finish, fabric)
- Any views through windows — do not alter or recover blown-out windows
- Any text, labels, magnets, papers, or items on fridge or walls
- The exact number and arrangement of every single item in the scene

DO NOT under any circumstances:
- Add any objects, props, food, plants, or decorations
- Remove any objects, clutter, dishes, or items from surfaces
- Replace or alter the sky or any outdoor views
- Change the color of any wall, cabinet, countertop, or surface
- Smooth, clean, or alter any surface texture
- Generate, hallucinate, or invent any visual content
- Remove reflections from any surface

This is a real property guests will visit. The output must be the exact same scene with only professional exposure and color correction applied — like a processed RAW photo file.`,

  Bedroom: `This is a bedroom photo in a vacation rental property. Fabric textures should remain completely natural — cotton should look like cotton, not smoothed or plasticky. Bed linens, pillows, and bedding must appear exactly as photographed.

Adjust ONLY the following:
- Exposure and brightness (balance highlights and shadows, brighten dark corners)
- White balance (correct color temperature for accurate fabric and wall colors)
- Contrast and tonal range (improve without clipping)
- Sharpness and detail clarity (subtle enhancement)
- Vertical line straightening (correct any tilt in walls, door frames, furniture)
- Lens distortion correction (fix wide-angle warping)

PRESERVE EXACTLY as-is — do not modify in any way:
- The bed, headboard, pillows, and all bedding exactly as they appear (including any wrinkles)
- Every piece of furniture, lamp, artwork, and decoration
- The exact layout, composition, camera angle, and framing
- All architectural features including walls, windows, doors, floors, ceilings
- All fabric textures — do NOT smooth, iron, or alter any linens or textiles
- Any views through windows — do not alter or recover blown-out windows
- The exact number and arrangement of every item

DO NOT under any circumstances:
- Add any objects, pillows, throws, or decorations
- Remove any objects, clothing, or personal items
- Smooth, flatten, or alter bed linens, pillows, or fabrics
- Replace or alter the sky or outdoor views
- Change the color of any wall, fabric, or surface
- Generate, hallucinate, or invent any visual content
- Remove reflections from mirrors or glass

This is a real property guests will visit. The output must be the exact same scene with only professional exposure and color correction applied.`,

  "Living Room": `This is a living room photo in a vacation rental property. Upholstery, wood, leather, and metal surfaces should maintain their authentic appearance and texture.

Adjust ONLY the following:
- Exposure and brightness (balance highlights and shadows, HDR-style light balancing)
- White balance (correct color temperature for accurate furniture and wall colors)
- Contrast and tonal range (improve without clipping)
- Sharpness and detail clarity (subtle enhancement)
- Vertical line straightening (correct any tilt in walls, door frames, windows)
- Lens distortion correction (fix wide-angle warping)

PRESERVE EXACTLY as-is — do not modify in any way:
- Every piece of furniture, cushion, throw, and decoration
- The exact layout, composition, camera angle, and framing
- All architectural features including walls, windows, doors, floors, ceilings
- All fabric and upholstery textures — do NOT alter any textiles
- All reflections in glass, mirrors, or TV screens — do NOT remove them
- Any views through windows — do not alter or recover blown-out windows
- The exact number and arrangement of every item

DO NOT under any circumstances:
- Add any objects, plants, books, or decorations
- Remove any objects, cords, clutter, or items
- Replace or alter the sky or outdoor views
- Change the color of any wall, furniture, or surface
- Remove reflections from glass, mirrors, or screens
- Generate, hallucinate, or invent any visual content

This is a real property guests will visit. The output must be the exact same scene with only professional exposure and color correction applied.`,

  "Living Spaces": `This is an interior living space photo in a vacation rental property.

Adjust ONLY the following:
- Exposure and brightness (balance highlights and shadows evenly)
- White balance (correct color temperature for accurate colors)
- Contrast and tonal range (improve without clipping)
- Sharpness and detail clarity (subtle enhancement)
- Vertical line straightening (correct any tilt)
- Lens distortion correction (fix wide-angle warping)

PRESERVE EXACTLY as-is — do not modify in any way:
- Every object, piece of furniture, fixture, and decoration in the scene
- The exact layout, composition, camera angle, and framing
- All architectural features, textures, and materials
- All reflections in glass, mirrors, or screens
- Any views through windows
- The exact number and arrangement of every item

DO NOT under any circumstances:
- Add, remove, or modify any objects or content in the scene
- Replace or alter the sky or outdoor views
- Change the color of any surface or material
- Remove reflections from any surface
- Generate, hallucinate, or invent any visual content

This is a real property guests will visit. The output must be the exact same scene with only professional exposure and color correction applied.`,

  "Dining Room/Dining Area": `This is a dining area photo in a vacation rental property. Table surface wood grain should remain natural and visible. The exact chair count, arrangement, and style must be preserved.

Adjust ONLY the following:
- Exposure and brightness (balance highlights and shadows)
- White balance (correct color temperature for accurate surface and wall colors)
- Contrast and tonal range (improve without clipping)
- Sharpness and detail clarity (subtle enhancement)
- Vertical line straightening (correct any tilt)
- Lens distortion correction (fix wide-angle warping)

PRESERVE EXACTLY as-is — do not modify in any way:
- Every chair, place setting, centerpiece, and table item — exact count and position
- The table surface and all its textures
- Chandeliers, pendant lights, and all light fixtures exactly as they appear
- The exact layout, composition, camera angle, and framing
- All architectural features, textures, and materials
- Any views through windows

DO NOT under any circumstances:
- Add or remove any chairs, place settings, or table items
- Alter the table surface, chandelier, or any fixtures
- Replace or alter the sky or outdoor views
- Change the color of any surface or material
- Remove reflections from glass or mirrors
- Generate, hallucinate, or invent any visual content

This is a real property guests will visit. The output must be the exact same scene with only professional exposure and color correction applied.`,

  "Foyer/Entryway": `This is a foyer or entryway photo in a vacation rental property. Flooring materials (tile, hardwood, stone) should retain their exact texture and pattern.

Adjust ONLY the following:
- Exposure and brightness (balance highlights and shadows, brighten dark corners)
- White balance (correct color temperature for accurate wall, floor, and fixture colors)
- Contrast and tonal range (improve without clipping)
- Sharpness and detail clarity (subtle enhancement)
- Vertical line straightening (correct any tilt in walls, door frames, staircase)
- Lens distortion correction (fix wide-angle warping)

PRESERVE EXACTLY as-is — do not modify in any way:
- Every object, coat hook, shoe rack, mirror, and decoration
- The exact layout, composition, camera angle, and framing
- All architectural features including stairs, railings, doors, floors
- All textures and materials (tile, hardwood, stone, metal)
- The exact number and arrangement of every item

DO NOT under any circumstances:
- Add or remove any objects, decorations, or items
- Change the color of any wall, floor, or surface
- Remove reflections from mirrors or glass
- Generate, hallucinate, or invent any visual content

This is a real property guests will visit. The output must be the exact same scene with only professional exposure and color correction applied.`,

  "Home Theater": `This is a home theater or media room photo in a vacation rental property. Preserve the room's ambient lighting character — theaters are intentionally darker.

Adjust ONLY the following:
- Exposure and brightness (brighten shadows while preserving intentional ambient darkness)
- White balance (correct color temperature for accurate colors)
- Contrast and tonal range (improve without clipping)
- Sharpness and detail clarity (subtle enhancement)
- Vertical line straightening (correct any tilt)
- Lens distortion correction (fix wide-angle warping)

PRESERVE EXACTLY as-is — do not modify in any way:
- All seating, screens, speakers, and equipment in exact positions
- The ambient lighting mood — do not over-brighten a theater room
- All fabric and upholstery textures
- Screen content or reflections — do NOT alter
- The exact layout, composition, camera angle, and framing
- The exact number and arrangement of every item

DO NOT under any circumstances:
- Add or remove any furniture, equipment, or decorations
- Over-brighten the room (theaters are meant to be dim)
- Remove reflections from screens or glass
- Generate, hallucinate, or invent any visual content

This is a real property guests will visit. The output must be the exact same scene with only professional exposure and color correction applied.`,

  "Game Room": `This is a game room photo in a vacation rental property. Game equipment (pool table felt, arcade screens, board games) must appear exactly as photographed.

Adjust ONLY the following:
- Exposure and brightness (balance highlights and shadows)
- White balance (correct color temperature for accurate colors)
- Contrast and tonal range (improve without clipping)
- Sharpness and detail clarity (subtle enhancement)
- Vertical line straightening (correct any tilt)
- Lens distortion correction (fix wide-angle warping)

PRESERVE EXACTLY as-is — do not modify in any way:
- All game equipment, tables, machines, and accessories in exact positions
- Pool table felt color and texture, dart board, foosball table — exactly as-is
- Arcade screens and any displayed content
- The exact layout, composition, camera angle, and framing
- All textures and materials
- The exact number and arrangement of every item

DO NOT under any circumstances:
- Add or remove any game equipment, furniture, or decorations
- Alter the color of pool table felt or any equipment
- Remove reflections from glass or screens
- Generate, hallucinate, or invent any visual content

This is a real property guests will visit. The output must be the exact same scene with only professional exposure and color correction applied.`,

  Bathroom: `This is a bathroom photo in a vacation rental property. Chrome, porcelain, tile, and glass textures must remain completely unaltered — chrome should look like chrome, tile should look like tile.

Adjust ONLY the following:
- Exposure and brightness (brighten evenly, eliminate dark corners)
- White balance (correct color temperature for clean neutral tones, not yellow or blue)
- Contrast and tonal range (improve without clipping)
- Sharpness and detail clarity (subtle enhancement on fixtures)
- Vertical line straightening (correct any tilt in walls, door frames, shower doors)
- Lens distortion correction (fix wide-angle warping — bathrooms are often shot with 0.5x lens)

PRESERVE EXACTLY as-is — do not modify in any way:
- Every fixture, towel, toiletry, and item exactly as photographed
- Mirror reflections — do NOT remove photographer or any reflections
- Tile, grout, chrome, glass, and porcelain textures — do NOT clean or alter
- The toilet, shower, tub, sink — exact appearance including lid position
- The exact layout, composition, camera angle, and framing
- The exact number and arrangement of every item

DO NOT under any circumstances:
- Add towels, toilet paper, toiletries, or any items
- Remove any items, toiletries, or personal belongings
- Make tiles, grout, or surfaces appear cleaner than they are
- Remove reflections from mirrors or glass
- Replace or alter any fixtures or fittings
- Generate, hallucinate, or invent any visual content

This is a real property guests will visit. The output must be the exact same scene with only professional exposure and color correction applied.`,

  "Pool/Hot Tub": `This is a pool or hot tub photo at a vacation rental property. Water should retain its actual appearance — do not alter its color or clarity.

Adjust ONLY the following:
- Exposure and brightness (balance highlights and shadows)
- White balance (correct color temperature for accurate colors)
- Contrast and tonal range (improve without clipping)
- Sharpness and detail clarity (subtle enhancement)
- Vertical line straightening (correct any tilt)
- Lens distortion correction (fix wide-angle warping)

PRESERVE EXACTLY as-is — do not modify in any way:
- The water exactly as it appears — do NOT change its color, clarity, or surface
- The sky exactly as it appears — do NOT replace it, even if overcast
- Every piece of furniture, lounger, umbrella, and poolside item
- All deck, patio, and surrounding surface materials
- The exact layout, composition, camera angle, and framing
- The exact number and arrangement of every item

DO NOT under any circumstances:
- Add pool floats, towels, loungers, umbrellas, or any items
- Remove any items from the pool area
- Replace the sky with a blue sky or any other sky
- Change the water color, clarity, or appearance
- Alter deck or patio surfaces
- Generate, hallucinate, or invent any visual content

This is a real property guests will visit. The output must be the exact same scene with only professional exposure and color correction applied.`,

  "Building Exterior": `This is a building exterior photo at a vacation rental property. Existing siding, brick, stone, or stucco materials must retain their exact appearance.

Adjust ONLY the following:
- Exposure and brightness (balance highlights and shadows across the facade)
- White balance (correct color temperature for accurate building material colors)
- Contrast and tonal range (improve without clipping)
- Sharpness and detail clarity (subtle enhancement)
- Vertical line straightening (correct any tilt in the building)
- Lens distortion correction (fix perspective warping)

PRESERVE EXACTLY as-is — do not modify in any way:
- The building structure and all architectural details exactly as photographed
- The sky exactly as it appears — do NOT replace it, even if overcast or gray
- All landscaping, driveway, walkway elements exactly as-is
- Windows and doors — do NOT brighten, add reflections, or alter them
- All building materials (siding, brick, stone, stucco) — exact color and texture
- The exact layout, composition, camera angle, and framing

DO NOT under any circumstances:
- Replace the sky with a blue sky or any other sky
- Add or remove any landscaping, structures, or features
- Enhance or alter landscaping vibrancy or color
- Change the color of any building material
- Generate, hallucinate, or invent any visual content

This is a real property guests will visit. The output must be the exact same scene with only professional exposure and color correction applied.`,

  Exterior: `This is an exterior photo at a vacation rental property.

Adjust ONLY the following:
- Exposure and brightness (balance highlights and shadows)
- White balance (correct color temperature for accurate colors)
- Contrast and tonal range (improve without clipping)
- Sharpness and detail clarity (subtle enhancement)
- Vertical line straightening (correct any tilt)
- Lens distortion correction (fix perspective warping)

PRESERVE EXACTLY as-is — do not modify in any way:
- The building and all structures exactly as photographed
- The sky exactly as it appears — do NOT replace it
- All landscaping and outdoor elements exactly as-is
- The exact layout, composition, camera angle, and framing

DO NOT under any circumstances:
- Replace the sky or alter outdoor environment
- Add or remove any features, structures, or landscaping
- Generate, hallucinate, or invent any visual content

This is a real property guests will visit. The output must be the exact same scene with only professional exposure and color correction applied.`,

  "Lawn/Backyard": `This is a lawn or backyard photo at a vacation rental property. Grass and foliage should retain their actual color and condition — do not make them greener or lusher.

Adjust ONLY the following:
- Exposure and brightness (balance highlights and shadows)
- White balance (correct color temperature for accurate colors)
- Contrast and tonal range (improve without clipping)
- Sharpness and detail clarity (subtle enhancement)
- Vertical line straightening (correct any tilt)
- Lens distortion correction (fix wide-angle warping)

PRESERVE EXACTLY as-is — do not modify in any way:
- The sky exactly as it appears — do NOT replace it, even if overcast
- All grass, plants, trees, and landscaping at their actual color and condition
- Every piece of outdoor furniture, equipment, and feature
- Patio, deck, and walkway surfaces exactly as-is
- The exact layout, composition, camera angle, and framing
- The exact number and arrangement of every item

DO NOT under any circumstances:
- Replace the sky with a blue sky or any other sky
- Make grass greener, lusher, or more vibrant than it actually is
- Add furniture, umbrellas, fire pits, or any items not present
- Remove any items, toys, equipment, or imperfections
- Generate, hallucinate, or invent any visual content

This is a real property guests will visit. The output must be the exact same scene with only professional exposure and color correction applied.`,

  Miscellaneous: `This is a photo of an exterior feature at a vacation rental property.

Adjust ONLY the following:
- Exposure and brightness (balance highlights and shadows)
- White balance (correct color temperature for accurate colors)
- Contrast and tonal range (improve without clipping)
- Sharpness and detail clarity (subtle enhancement)
- Vertical line straightening (correct any tilt)
- Lens distortion correction (fix wide-angle warping)

PRESERVE EXACTLY as-is — do not modify in any way:
- The sky exactly as it appears — do NOT replace it
- Every structure, surface, and feature exactly as photographed
- All materials and textures
- The exact layout, composition, camera angle, and framing

DO NOT under any circumstances:
- Replace the sky or alter the outdoor environment
- Add or remove any objects or features
- Change the color of any surface or material
- Generate, hallucinate, or invent any visual content

This is a real property guests will visit. The output must be the exact same scene with only professional exposure and color correction applied.`
};
```

### New INTENSITY_MODIFIERS

Replace the entire `INTENSITY_MODIFIERS` object:

```typescript
export const INTENSITY_MODIFIERS: Record<string, string> = {
  Light: `\n\nINTENSITY: LIGHT — Apply only minimal corrections:
- Minor exposure adjustment (+/- 0.5 stops maximum)
- Gentle white balance correction
- Light shadow fill
- Subtle sharpening
- Minor straightening only if clearly tilted
Do NOT apply sky replacement. Do NOT remove or add any objects. Do NOT alter any content. Maintain maximum fidelity to the original photograph.`,

  Moderate: `\n\nINTENSITY: MODERATE — Apply standard professional corrections:
- Full exposure correction (+/- 1 stop)
- White balance normalization
- Shadow and highlight recovery
- Perspective and lens distortion correction
- Color accuracy enhancement
- Detail sharpening
Do NOT replace skies. Do NOT remove reflections. Do NOT add or remove any objects. Do NOT alter any scene content. Only adjust light, color, sharpness, and geometry.`,

  Significant: `\n\nINTENSITY: SIGNIFICANT — Apply comprehensive corrections for maximum quality:
- Full exposure rebalancing across the entire frame
- Complete white balance correction
- HDR-style shadow and highlight recovery (reveal detail in dark areas and bright areas)
- Full perspective, tilt, and lens distortion correction
- Color vibrancy and accuracy enhancement
- Resolution and detail sharpening
Do NOT replace skies. Do NOT remove reflections. Do NOT add or remove any objects. Do NOT smooth or alter any textures. Do NOT alter any scene content. Only adjust light, color, sharpness, and geometry.`
};
```

---

## Important: Settings Page Prompt Updates

Since the admin settings page (from Round 2) now shows the actual prompts from `ROOM_PROMPTS`, the settings API will automatically serve these new preservation-focused prompts. Any rooms that already have custom prompts saved in the database will keep their saved versions — the new defaults only apply to rooms without saved DB records.

If you want ALL rooms to use the new prompts (even those already saved), you can either:
1. Click "Reset to Defaults" for each room in the settings page, then Save
2. Or delete the `RoomEnhancementSettings` database records so they fall back to the new code defaults

---

## Post-Implementation Testing

### Critical Tests:

1. **Sky preservation test**: Upload an exterior photo with overcast/gray sky. Auto-enhance it. The sky should remain gray/overcast — NOT replaced with blue sky.

2. **Object preservation test**: Upload a kitchen photo with items on the counter. Auto-enhance it. Every item should remain exactly where it was — nothing added or removed.

3. **Texture preservation test**: Upload a bathroom photo with visible grout, tile texture. Auto-enhance it. Tiles should NOT appear "cleaner" or smoother — only exposure/color should change.

4. **Reflection preservation test**: Upload a photo with visible mirror reflection (photographer visible). Auto-enhance it. The reflection should still be there.

5. **Bed linen test**: Upload a bedroom photo with wrinkled bed sheets. Auto-enhance it. Wrinkles should remain — sheets should NOT be smoothed.

6. **Quality test**: Despite all the restrictions, the photo should still look noticeably better — brighter, better color, sharper details, straightened.

7. **Water test**: Upload a pool photo with murky or green-ish water. Auto-enhance it. Water should remain as-is — NOT made crystal clear or blue.

### Compare Models:
Run the same test photo through:
- `gpt-image-1.5` (default)
- `qwen-image-edit` (reportedly best for consistency)
- `flux-kontext`

Document which model best respects the "no generation" constraints while still producing noticeably improved photos.
