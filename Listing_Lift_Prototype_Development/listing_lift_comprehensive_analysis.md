# Listing Lift by Retreat Vacation Rentals - Comprehensive Analysis

**Document Version:** 2.1  
**Analysis Date:** February 5, 2026  
**Status:** Pre-Development Review

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [User Personas](#2-user-personas)
3. [User Flows](#3-user-flows)
4. [Feature Specifications](#4-feature-specifications)
5. [Room Categories & Sub-Categories](#5-room-categories--sub-categories)
6. [AI Enhancement Prompts](#6-ai-enhancement-prompts)
7. [UI/UX Design Specifications](#7-uiux-design-specifications)
8. [Technical Architecture](#8-technical-architecture)
9. [Data Model](#9-data-model)
10. [Testing Plan](#10-testing-plan)
11. [Research Document Insights](#11-research-document-insights)
12. [Opportunities for Improvement](#12-opportunities-for-improvement)
13. [Potential Problems & Challenges](#13-potential-problems--challenges)
14. [Ambiguities & Missing Information](#14-ambiguities--missing-information)

---

## 1. Executive Summary

### Application Overview
**Listing Lift by Retreat Vacation Rentals** is an AI-powered web application designed to help Partner+ clients transform amateur property photos into near-professional quality images optimized for Airbnb and VRBO listings.

### Core Value Proposition
> "Submit and forget—we handle everything and implement photos directly into your listing"

### Brand Identity
- **App Name:** Listing Lift by Retreat Vacation Rentals
- **Brand Color:** #383D31 (dark forest green)
- **Logo:** Camera aperture spiral with house/cabin silhouette inside
- **Logo URL:** https://cdn.abacus.ai/images/b56cb40b-af3f-4aa4-b8b3-d0c4f9bd4d8c.png
- **Local Path:** /home/ubuntu/listing_lift_logos/listing_lift_logo_final.png
- **Admin Contact:** dan@retreatvr.ca

### Technical Stack
| Component | Technology |
|-----------|------------|
| Database | Built-in PostgreSQL (managed by Abacus AI) |
| Email System | Built-in Abacus AI notification system |
| Image Enhancement | RouteLLM API with FLUX.2 [Pro] or GPT Image 1.5 (configurable) |
| File Storage | Organized structure: `/originals/`, `/enhanced/`, `/hero/` |

---

## 2. User Personas

### 2.1 Homeowner Persona (Sarah Mitchell)
| Attribute | Details |
|-----------|---------|
| Role | Partner+ Client / Property Owner |
| Age Range | 35-65 |
| Technical Proficiency | Low to Medium |
| Primary Device | Smartphone (iPhone/Android) |
| Goals | Professional-looking photos without hiring a photographer; increase bookings |
| Pain Points | Amateur photos; doesn't know photography techniques; limited time |
| Behavior | Takes photos on phone; wants quick, simple process; expects guidance |
| Success Criteria | Enhanced photos that look professional; easy upload process; clear instructions |

### 2.2 Admin Persona (Daniel)
| Attribute | Details |
|-----------|---------|
| Role | Retreat Vacation Rentals Administrator |
| Email | dan@retreatvr.ca |
| Goals | Efficiently process submissions; maintain quality standards; communicate with homeowners |
| Responsibilities | Review photos, adjust enhancement settings, approve/reject/request re-uploads, select hero photos |

---

## 3. User Flows

### 3.1 Homeowner Submission Flow (10 Steps)

**Step 1: Landing Page**
- Arrives at submission URL
- Sees Listing Lift / RVR branding (#383D31)
- Reads brief service overview
- Clicks "Start Submission" button

**Step 2: Contact Information**
- Enters Name (required)
- Enters Email (required)
- Enters Phone Number (required)
- Enters Property Address (required)
- Enters Notes (optional - special requests/information)
- Clicks "Continue to Photos"

**Step 3: General Photography Tips**
- Views "Pro Basics" photography guidance
- Learns about the 5-Photo Rule
- Reviews what AI can vs. cannot fix
- Understands lighting and timing recommendations
- Clicks "Begin Uploading Photos"

**Step 4: Photo Upload - Kitchen**
- Sees embedded YouTube tutorial video
- Reads room-specific tips (collapsible)
- Uploads 4-8 kitchen photos
- Drag-and-drop or tap to select from gallery
- Portrait photos show gentle notice (landscape recommended)
- Clicks "Next: Bedroom"

**Step 5: Photo Upload - Bedroom**
- Sees bedroom tutorial video and tips
- Uploads 4-8 bedroom photos (per bedroom)
- Option to add additional bedrooms
- Clicks "Next: Living Room"

**Step 6: Photo Upload - Living Spaces**
- Sees living room tutorial video and tips
- Uploads 4-8 photos across two sub-categories:
  - **Living Room:** Main living area, foyer, home theater, game room
  - **Dining Room / Dining Area:** Formal dining, breakfast nook
- User selects sub-category for each photo
- Clicks "Next: Bathroom"

**Step 7: Photo Upload - Bathroom**
- Sees bathroom tutorial video and tips
- Note: Laundry Room photos can be uploaded here
- Uploads 4-8 bathroom photos (per bathroom)
- Option to add additional bathrooms
- Clicks "Next: Pool/Hot Tub"

**Step 8: Photo Upload - Pool/Hot Tub (if applicable)**
- Sees pool/outdoor tutorial video and tips
- Uploads 4-8 pool/hot tub photos
- Option to skip if no pool/hot tub
- Clicks "Next: Exterior"

**Step 9: Photo Upload - Exterior**
- Sees exterior tutorial video and tips
- Uploads 4-8 photos across three sub-categories:
  - **Building Exterior:** Curb appeal, front of house, architectural shots
  - **Lawn / Backyard:** Landscaping, outdoor living spaces, gardens
  - **Miscellaneous:** Sheds, pathways, garages, driveways
- User selects sub-category for each photo
- Clicks "Review Submission"

**Step 10: Review & Submit**
- Reviews all uploaded photos by room
- Can remove or add photos
- Reviews/edits notes
- Confirms contact information
- Clicks "Submit for Enhancement"
- Sees confirmation message with submission ID

**Step 11: Confirmation**
- Receives on-screen confirmation
- Receives email confirmation with submission details
- Messaging: "Submit and forget—we'll handle everything!"

### 3.2 Admin Review Flow (9 Steps)

**Step 1: Notification**
- Receives email notification of new submission (to dan@retreatvr.ca)
- Email includes: Homeowner name, property address, photo count
- Clicks link to open submission in dashboard

**Step 2: Dashboard — Submissions List**
- Views all submissions in table/card format
- Filters by: Status (New, In Progress, Approved, Rejected, Re-upload Requested)
- Sorts by: Date, Homeowner Name, Status
- Views homeowner notes for each submission
- Clicks on submission to open detail view

**Step 3: Submission Detail View**
- Sees homeowner contact info, property address, and notes
- Views photos organized by room type
- Each photo shows: Original | Enhanced (side-by-side)
- Sees current enhancement settings applied to each photo

**Step 4: Enhancement Controls (Per Photo)**
- Enhancement settings apply to INDIVIDUAL photos
- Adjusts Enhancement Intensity: Light / Moderate / Significant
- Toggles specific enhancements:
  - Sky Replacement (On/Off)
  - Bed Fixing (On/Off)
  - Window Recovery (On/Off)
  - Perspective Correction (On/Off)
  - Reflection Removal (On/Off)
  - Brightness/Color Optimization (On/Off)
- Option: "Select All in Room" for batch settings
- Clicks "Re-run Enhancement" to apply new settings
- **IMPORTANT:** Re-run uses ORIGINAL photo with revised prompt (not already-enhanced version)
- Previous versions preserved for comparison

**Step 5: Detail Shot Enhancement (Manual Admin Action)**
- Admin can mark any photo for "detail shot" enhancement
- Provides note specifying what to focus on (e.g., "coffee table staging", "countertop arrangement")
- AI generates cropped/enhanced close-up version
- Detail shot saved alongside original enhanced version

**Step 6: Hero Photo Selection**
- Reviews all enhanced photos
- Clicks "Set as Hero" on chosen photo
- System generates hero-optimized version (higher resolution)
- Hero photo appears with UI badge indicator ONLY (badge NOT embedded in actual photo file)
- Hero photo included in separate `/hero/` folder in downloads

**Step 7: Photo Actions (Per Photo with Select-All Option)**
- **APPROVE:** Photo is good, will be used in listing
- **REJECT:** Photo doesn't add value, won't be included (homeowner informed which photos were rejected)
- **REQUEST RE-UPLOAD:** Photo could be valuable but needs to be retaken (includes notes on how to retake)
- "Select All in Room" option for batch operations
- Download options per photo or batch

**Step 8: Download Options**
- Downloads organized in ZIP structure:
  - `/originals/` - All original uploaded photos
  - `/enhanced/` - All enhanced versions
  - `/hero/` - Hero-optimized photo(s)
- Individual photo download (original or enhanced)
- Full batch ZIP download
- Files optimized to ~2-3MB per image for Airbnb compatibility

**Step 9: Email Notifications (Automated)**
- **ON SUBMISSION:** Email to homeowner confirming receipt; Email to admin with submission details
- **ON APPROVAL:** Email to homeowner: "Your photos are ready and will be implemented into your listing by Retreat Vacation Rentals"
- **ON REJECTION (per photo):** Email includes which specific photos were rejected with reason
- **ON RE-UPLOAD REQUEST:** Email specifies which photos need to be retaken with admin notes on HOW to retake

---

## 4. Feature Specifications

### 4.1 Homeowner Features

| ID | Feature | Description | Acceptance Criteria |
|----|---------|-------------|---------------------|
| F1.1 | Landing Page | Branded landing page with service overview | Displays Listing Lift logo and #383D31 branding; Clear value proposition; Single CTA button; Mobile-responsive |
| F1.2 | Contact Form | Collects homeowner information | All fields required except Notes; Email validation; Phone format validation; Notes field for special requests |
| F1.3 | General Tips Page | Photography guidance before room uploads | 5-Photo Rule explanation; AI can vs. cannot fix; Lighting recommendations; Time of day tips |
| F1.4 | Room-Based Upload | Organized photo upload by room type | 6 room categories (incl. Pool/Hot Tub); 4-8 photos per room recommended; Drag-and-drop support; Mobile camera access |
| F1.5 | Upload Tips & Videos | Room-specific photography guidance | Embedded YouTube tutorial per room; Tips displayed per room; Collapsible/expandable; "Other rooms" guidance included |
| F1.6 | Portrait Photo Handling | Gentle notice for portrait orientation | Shows notice: "Landscape orientation recommended"; Does NOT reject photo; Note: "Portrait is fine for capturing tall spaces" |
| F1.7 | Photo Preview | Preview uploaded photos before submission | Thumbnail grid view; Remove individual photos; Reorder capability |
| F1.8 | Submission Confirmation | Confirmation of successful submission | On-screen confirmation; Unique submission ID; Email confirmation sent |
| F1.9 | Re-upload Capability | Submit replacement photos when requested | "Submit and forget" messaging; Access via email link; Shows which photos need replacement; Shows admin notes on how to retake; Preserves original submission |

### 4.2 Admin Features

| ID | Feature | Description | Acceptance Criteria |
|----|---------|-------------|---------------------|
| F2.1 | Submissions Dashboard | Overview of all submissions | Table/card view toggle; Filter by status; Sort by date/name; Search functionality; View homeowner notes |
| F2.2 | Side-by-Side Comparison | View original vs enhanced photos | Synchronized zoom/pan; Slider comparison option; Full-screen view |
| F2.3 | Per-Photo Enhancement Controls | Adjust AI enhancement settings per photo | Intensity slider (3 levels); Individual feature toggles; Settings apply per photo; "Select All in Room" option |
| F2.4 | Re-run Enhancement | Process photos with new settings | Uses ORIGINAL photo (not enhanced); Progress indicator; Preserves previous versions; Comparison with previous run |
| F2.5 | Detail Shot Enhancement | Generate close-up versions | Admin marks photo for detail shot; Provides focus note; AI generates cropped/enhanced version; Manual action, not automatic |
| F2.6 | Hero Photo Selection | Designate and generate hero photo | One-click selection; Generates hero-optimized version; UI badge indicator only (NOT in photo file); Separate /hero/ folder |
| F2.7 | Download Options | Download photos in organized structure | ZIP structure: /originals/, /enhanced/, /hero/; Individual download option; Files optimized to ~2-3MB |
| F2.8 | Per-Photo Actions | Approve, Reject, or Request Re-upload per photo | All actions are per-photo; "Select All in Room" option; Reject: photo won't be used, inform client; Re-upload: include retake instructions |
| F2.9 | Notes System | Add internal notes to submissions | Rich text support; Timestamp and history; Admin-only visibility |
| F2.10 | AI Model Selection | Configure image enhancement model | Admin settings to switch models; Primary: FLUX.2 [Pro] or GPT Image 1.5; Alternative options available |
| F2.11 | Email Notifications | Automated email alerts | Submission: confirm to homeowner, notify admin; Approval: inform homeowner photos ready; Rejection: specify which photos, why; Re-upload: specify photos, how to retake |

### 4.3 Feature Priority Matrix

| Priority | Features | Rationale |
|----------|----------|-----------|
| P0 - Must Have | F1.1-F1.4, F1.7-F1.8, F2.1-F2.4, F2.6-F2.8, F2.11 | Core functionality |
| P1 - Should Have | F1.3, F1.5-F1.6, F1.9, F2.5, F2.9-F2.10 | Enhanced workflow |
| P2 - Nice to Have | Video tutorials, Address autocomplete | Polish features |

---

## 5. Room Categories & Sub-Categories

### Main Categories (6 Total)

| Category | Sub-Categories | Description |
|----------|----------------|-------------|
| Kitchen | None | Countertops, appliances, cooking area |
| Bedroom | None (multiple bedrooms supported) | Bed as focal point, nightstands, closets |
| Living Spaces | Living Room, Dining Room / Dining Area | Main living areas and dining spaces |
| Bathroom | None (multiple bathrooms supported) | Also includes Laundry Room |
| Pool/Hot Tub | None (optional) | Water features, surrounding deck/patio |
| Exterior | Building Exterior, Lawn / Backyard, Miscellaneous | All outdoor areas |

### Sub-Category Details

#### Living Spaces Sub-Categories
| Sub-Category | Includes |
|--------------|----------|
| Living Room | Main living area, family room, great room, foyer/entryway, home theater, game room |
| Dining Room / Dining Area | Formal dining room, breakfast nook, eat-in kitchen dining area |

#### Exterior Sub-Categories
| Sub-Category | Includes |
|--------------|----------|
| Building Exterior | Curb appeal, front of house, architectural shots, property entrance |
| Lawn / Backyard | Landscaping, outdoor living spaces, gardens, patios, decks |
| Miscellaneous | Sheds, pathways, garages, driveways, fencing, gates, other outdoor features |

### "Other Rooms" Guidance
| Room Type | Upload Location | Sub-Category |
|-----------|-----------------|--------------|
| Foyer / Entryway | Living Spaces | Living Room |
| Dining Room | Living Spaces | Dining Room / Dining Area |
| Home Theater / Game Room | Living Spaces | Living Room |
| Laundry Room | Bathroom | (default) |
| Sheds / Storage | Exterior | Miscellaneous |
| Pathways / Driveways | Exterior | Miscellaneous |

---

## 6. AI Enhancement Prompts

### 6.1 Critical Accuracy Requirements (All Prompts)

All prompts include these **CRITICAL ACCURACY REQUIREMENTS**:
- DO NOT add any windows, doors, or architectural elements that are not visible in the original photo
- DO NOT change, replace, or alter any furniture or cabinets - only enhance their existing appearance
- DO NOT add any objects, decorations, appliances, or features that are not present in the original image
- PRESERVE the exact layout, furniture placement, and architectural features of the original photo
- The enhanced photo must accurately represent the actual space - guests will visit this property

### 6.2 Kitchen Enhancement Prompt (Exact Wording)

```
KITCHEN ENHANCEMENT PROMPT
====
Enhance this kitchen photo for a vacation rental listing to achieve professional, "ready to cook" quality that highlights the space as an emotional anchor for guests.

⚠️ CRITICAL ACCURACY REQUIREMENTS ⚠️
* DO NOT add any windows, doors, or architectural elements that are not visible in the original photo
* DO NOT change, replace, or alter any furniture or cabinets - only enhance their existing appearance
* DO NOT add any objects, decorations, appliances, or features that are not present in the original image
* PRESERVE the exact layout, furniture placement, and architectural features of the original photo
* The enhanced photo must accurately represent the actual space - guests will visit this property

CORRECTIONS:
* Straighten all vertical lines (cabinets, door frames, appliances)
* Correct any wide-angle (0.5x) distortion on edges
* Balance window exposure-reveal exterior view if blown out
* Brighten shadow areas while preserving natural highlights
* Fix any perspective issues from camera angle

LIGHTING & COLOR:
* Correct white balance for accurate surface colors
* Enhance warmth slightly for inviting, homey atmosphere
* Ensure countertops and appliances are well-lit and visible
* Stainless steel should appear clean and neutral (not yellow or blue)
* Create even illumination across the entire space

CLARITY & DETAIL:
* Sharpen details on appliances, fixtures, and hardware
* Ensure any branded elements (coffee labels, appliances) remain legible
* Enhance texture visibility on countertops and backsplash
* Do not scramble or distort any text in the image
* Polish appearance of surfaces without artificial shine

PRESERVE (CRITICAL - Accurate Representation):
* Maintain all original objects and layout EXACTLY
* Keep natural shadows for depth and dimension
* Do not alter room dimensions or proportions
* Preserve authentic material textures (granite, wood, tile)
* Keep the "lived-in but clean" vacation rental feel
* Do not move, add, or remove ANY objects unless specifically stated in additional enhancement notes
* NEVER add windows, doors, or openings that don't exist
* NEVER replace or swap out furniture, appliances, or fixtures

OUTPUT QUALITY: Professional vacation rental standard with warm, inviting "ready to cook" atmosphere that signals quality amenities. Must accurately represent the actual space to avoid guest complaints.
```

### 6.3 Bedroom Enhancement Prompt (Exact Wording)

```
BEDROOM ENHANCEMENT PROMPT
====
Enhance this bedroom photo for a vacation rental listing to achieve luxury hotel quality that signals comfort and premium value.

⚠️ CRITICAL ACCURACY REQUIREMENTS ⚠️
* DO NOT add any windows, doors, or architectural elements that are not visible in the original photo
* DO NOT change, replace, or alter any furniture - only enhance the existing furniture's appearance
* DO NOT add any objects, decorations, or features that are not present in the original image
* PRESERVE the exact layout, furniture placement, and architectural features of the original photo
* The enhanced photo must accurately represent the actual space - guests will visit this property

CORRECTIONS:
* Straighten any tilted or crooked framing for visual comfort
* Correct perspective if shot was angled up or down
* Smooth any wrinkles in bed linens for "crisp and clean" appearance
* Remove photographer reflection if visible in any mirrors or glass
* Fix wide-angle distortion on edges

BED & LINENS:
* Simulate high-end linen textures-crisp, fresh, inviting
* Smooth wrinkles while maintaining natural fabric appearance
* Enhance whites in linens to appear bright and clean
* Preserve pillow arrangement and layering (luxury signals)
* Avoid plastic or artificial texture appearance
* KEEP THE EXACT SAME BED FRAME, HEADBOARD, AND BEDDING STYLE

ATMOSPHERE:
* Create warm, cozy, inviting ambiance
* Soft, diffused lighting appearance
* Warm neutral tones for comfortable feeling
* Balance between bright and cozy

LIGHTING:
* Brighten dark corners and shadow areas
* Balance window light with room interior
* Ensure linens appear bright and fresh (not dingy)
* Recover window view if overexposed

PRESERVE (CRITICAL - Accurate Representation):
* Maintain bed styling and pillow arrangement EXACTLY
* Keep natural fabric textures authentic
* Do not add or remove any objects unless specifically stated in additional enhancement notes
* Preserve the "luxury" signals (pillow count, layers, throws)
* Maintain accurate room proportions and layout
* Keep all furniture in original positions
* NEVER add windows, doors, or openings that don't exist
* NEVER replace or swap out furniture, bed frames, or fixtures
* NEVER change the style, color, or design of any furniture

OUTPUT QUALITY: Luxury hotel standard with high-ADR appearance- the kind of bedroom that makes guests excited to book. Must accurately represent the actual space.
```

### 6.4 Living Room Enhancement Prompt (Exact Wording)

```
LIVING ROOM ENHANCEMENT PROMPT
====
Enhance this living room photo for a vacation rental listing to maximize perceived spaciousness and create an inviting, comfortable atmosphere.

⚠️ CRITICAL ACCURACY REQUIREMENTS ⚠️
* DO NOT add any windows, doors, or architectural elements that are not visible in the original photo
* DO NOT change, replace, or alter any furniture - only enhance the existing furniture's appearance
* DO NOT add any objects, decorations, or features that are not present in the original image
* PRESERVE the exact layout, furniture placement, and architectural features of the original photo
* The enhanced photo must accurately represent the actual space - guests will visit this property

CORRECTIONS:
* Straighten all vertical lines (walls, door frames, windows, furniture edges)
* Correct wide-angle edge distortion
* Fix any perspective tilt from camera angle
* Remove photographer reflection from any glass, mirrors, or TV screens
* Ensure "congruent lines" for visual comfort

SPACIOUSNESS:
* Brighten to emphasize openness and volume
* Enhance natural light from windows
* Recover exterior views through any blown-out windows
* Ensure all visible walls are properly lit
* Create sense of depth and flow

LIGHTING:
* Balance bright windows with interior exposure (HDR effect)
* Reveal details in shadow areas without losing contrast
* Natural, welcoming illumination throughout
* Avoid harsh shadows or overly flat lighting

COLOR & ATMOSPHERE:
* Warm, inviting color temperature
* Accurate furniture and decor colors
* Subtle vibrancy enhancement without oversaturation
* Cozy yet spacious feeling

PRESERVE (CRITICAL - Accurate Representation):
* Maintain sense of depth and "corner-to-corner" volume
* Keep natural flow and furniture layout EXACTLY
* Do not alter furniture arrangement or positions
* Maintain realistic proportions and room dimensions
* Preserve focal points (fireplace, view, TV area)
* Do not add or remove any objects unless specifically stated in additional enhancement notes
* NEVER add windows, doors, or openings that don't exist
* NEVER replace or swap out sofas, chairs, tables, or any furniture
* NEVER change the style, color, or design of any furniture or decor

OUTPUT QUALITY: Spacious, inviting living space with "visual comfort" - a room guests can immediately imagine relaxing in. Must accurately represent the actual space.
```

### 6.5 Dining Room / Dining Area Enhancement Prompt (Exact Wording)

```
DINING ROOM / DINING AREA ENHANCEMENT PROMPT
====
Enhance this dining area photo for a vacation rental listing to create an inviting space where guests can imagine gathering for meals.

⚠️ CRITICAL ACCURACY REQUIREMENTS ⚠️
* DO NOT add any windows, doors, or architectural elements that are not visible in the original photo
* DO NOT change, replace, or alter any furniture - only enhance the existing furniture's appearance
* DO NOT add any objects, decorations, or features that are not present in the original image
* PRESERVE the exact layout, furniture placement, and architectural features of the original photo
* The enhanced photo must accurately represent the actual space - guests will visit this property

CORRECTIONS:
* Straighten all vertical lines (walls, door frames, windows)
* Correct wide-angle edge distortion
* Fix any perspective tilt from camera angle
* Remove photographer reflection from any glass, mirrors, or surfaces
* Ensure table surface appears level and properly aligned

TABLE & SEATING:
* Enhance the appearance of table surface (wood grain, polish)
* Ensure chairs appear clean and well-maintained
* Preserve exact chair count and arrangement
* Keep any table settings or centerpieces as-is
* KEEP THE EXACT SAME TABLE, CHAIRS, AND DINING SET

LIGHTING:
* Balance bright windows with interior exposure
* Ensure table surface is well-lit and inviting
* Enhance any chandelier or pendant lighting naturally
* Create warm, welcoming ambiance for dining

COLOR & ATMOSPHERE:
* Warm, inviting color temperature
* Accurate furniture and decor colors
* Subtle enhancement without oversaturation
* Create "gathering place" feeling

PRESERVE (CRITICAL - Accurate Representation):
* Maintain exact table and chair positions
* Keep natural flow and furniture layout EXACTLY
* Do not alter seating arrangement or capacity
* Maintain realistic proportions and room dimensions
* Preserve any special features (chandelier, hutch, artwork)
* Do not add or remove any objects unless specifically stated
* NEVER add windows, doors, or openings that don't exist
* NEVER replace or swap out the dining table, chairs, or fixtures
* NEVER add place settings, dishes, or food that aren't present

OUTPUT QUALITY: Warm, inviting dining space that makes guests excited to share meals together during their stay. Must accurately represent the actual space.
```

### 6.6 Bathroom Enhancement Prompt (Exact Wording)

```
BATHROOM ENHANCEMENT PROMPT
====
Enhance this bathroom photo for a vacation rental listing to achieve spa-quality, "crisp and clean" appearance that signals cleanliness.

⚠️ CRITICAL ACCURACY REQUIREMENTS ⚠️
* DO NOT add any windows, doors, or architectural elements that are not visible in the original photo
* DO NOT change, replace, or alter any fixtures - only enhance their existing appearance
* DO NOT add any objects, decorations, or features that are not present in the original image
* PRESERVE the exact layout, fixture placement, and architectural features of the original photo
* The enhanced photo must accurately represent the actual space guests will visit this property
* EXCEPTION: Towels and toilet paper may be added if missing, as these are consumable amenities

CORRECTIONS:
* Correct any wide-angle distortion (especially if 0.5x was used)
* Straighten vertical lines (walls, door frames, shower doors)
* Remove photographer reflection from mirrors and glass surfaces
* Fix perspective issues from tight-space shooting

AMENITIES (ONLY EXCEPTION TO "NO ADDITIONS" RULE):
* If towels are missing or sparse, add fresh white towels naturally
* If toilet paper is not visible, add it appropriately
* Ensure amenities appear ready for guests
* DO NOT add any other objects beyond towels and toilet paper

CLEANLINESS & FRESHNESS:
* Bright, fresh, spa-like appearance
* Sparkling clean surfaces throughout
* Crisp white towels and fixtures
* Streak-free mirrors and glass
* Clean tile and grout appearance

LIGHTING:
* Bright, even illumination throughout
* Eliminate dark corners and shadows
* Enhance natural light if present
* Clean, fresh lighting mood (not yellow or harsh)

COLOR:
* Accurate white balance for tiles and fixtures
* Bright whites without yellow or blue cast
* Natural material colors preserved
* Fresh, clean color palette

CLARITY:
* Sharp detail on fixtures and hardware
* Clean, polished appearance on all surfaces
* Clear reflection in mirrors (minus photographer)

PRESERVE (CRITICAL - Accurate Representation):
* Keep ALL fixtures exactly where they are (toilet, sink, shower, tub)
* Maintain exact flooring material and pattern
* Do not alter bathroom layout in ANY way
* Preserve accurate room dimensions
* Keep all tiles, grout, and surfaces accurate to original
* Do not add or remove any fixtures unless specifically stated in additional enhancement notes
* NEVER add windows, doors, or openings that don't exist
* NEVER replace or swap out the vanity, toilet, tub, or shower
* NEVER change the style or design of any fixtures
* Accurate representation is critical to avoid guest complaints about misrepresentation

OUTPUT QUALITY: Spa-quality, "crisp and clean" bathroom that signals attention to detail and guest comfort. Must accurately represent the actual space.
```

### 6.7 Pool/Hot Tub Enhancement Prompt (Exact Wording)

```
POOL/HOT TUB ENHANCEMENT PROMPT
====
Enhance this pool or hot tub photo for a vacation rental listing to create a compelling, "leisure-focused" image that drives bookings.

⚠️ CRITICAL ACCURACY REQUIREMENTS ⚠️
* DO NOT add any structures, features, or architectural elements that are not visible in the original photo
* DO NOT change the size, shape, or style of the pool/hot tub
* DO NOT add any objects, furniture, or features that are not present in the original image
* PRESERVE the exact layout and surrounding features of the original photo
* The enhanced photo must accurately represent the actual amenity - guests will visit this property
* Sky replacement IS allowed as it does not misrepresent the property itself

WATER ENHANCEMENT:
* Crystal clear, inviting water appearance
* Sparkling water effect with natural highlights
* Enhance blue/turquoise tones naturally
* Remove any debris or imperfections in water

SKY ENHANCEMENT (ALLOWED):
* If sky is overcast, cloudy, or gray: replace with pleasant blue sky
* Option: Convert to golden hour/sunset mood if appropriate
* Option: Create twilight look with warm lights visible
* Natural cloud formations if adding clouds
* Ensure lighting direction matches sun position

CORRECTIONS:
* Straighten any tilted framing
* Correct wide-angle distortion on edges
* Fix perspective issues

SURROUNDINGS:
* Enhance deck/patio appearance (but do not change materials)
* Brighten existing outdoor furniture and staging
* Well-lit pool area and features
* Clean, maintained appearance
* DO NOT add furniture, umbrellas, or loungers that aren't there

ATMOSPHERE:
* Leisure-focused, vacation vibes
* Bright, inviting daytime OR warm, romantic evening
* Emphasize relaxation and enjoyment

PRESERVE (CRITICAL - Accurate Representation):
* Accurate representation of pool/hot tub size and shape EXACTLY
* Real surrounding features and landscaping
* True proportions and scale
* Actual deck/patio materials
* Do not add features that don't exist (no adding pools, waterfalls, fire pits, etc.)
* Do not add or remove any objects unless specifically stated in additional enhancement notes
* NEVER add pool floats, furniture, or staging items that aren't present
* NEVER alter the pool/hot tub dimensions or surrounding hardscape
* NEVER add landscaping features that don't exist

OUTPUT QUALITY: High-conversion "must-book" pool/hot tub shot that makes viewers imagine themselves relaxing there. Must accurately represent the actual amenity.
```

### 6.8 Building Exterior Enhancement Prompt (Exact Wording)

```
BUILDING EXTERIOR ENHANCEMENT PROMPT
====
Enhance this building exterior photo for a vacation rental listing to create a compelling, "curiosity-generating" curb appeal image that drives clicks.

⚠️ CRITICAL ACCURACY REQUIREMENTS ⚠️
* DO NOT add any windows, doors, or architectural elements that are not visible in the original photo
* DO NOT change the structure, style, or architectural details of the building
* DO NOT add any objects, landscaping, or features that are not present in the original image
* PRESERVE the exact appearance and architectural features of the original photo
* The enhanced photo must accurately represent the actual property - guests will visit this property
* Sky replacement IS allowed as it does not misrepresent the property itself

SKY ENHANCEMENT (ALLOWED):
* If sky is overcast, cloudy, or gray: replace with pleasant blue sky
* Option: Convert to golden hour/sunset mood if appropriate for the shot
* Option: Create twilight look with warm interior lights visible
* Natural cloud formations if adding clouds
* Ensure lighting direction matches sun position in scene

CORRECTIONS:
* Straighten any tilted framing
* Correct wide-angle distortion on edges
* Enhance structure to appear imposing (complement knee-height shooting)
* Fix perspective issues

BUILDING & ARCHITECTURE:
* Enhance the appearance of existing siding, brick, stone, etc.
* Brighten and clean the appearance of windows and doors
* Ensure the building looks well-maintained
* DO NOT change any architectural features or add/remove elements

LANDSCAPING (ENHANCEMENT ONLY):
* Enhance green grass vibrancy naturally (not neon)
* Brighten existing foliage colors appropriately for season
* DO NOT add landscaping features that don't exist
* DO NOT add trees, shrubs, or flowers that aren't present

LIGHTING MOOD OPTIONS (apply based on original):
* DAYTIME: Bright, clear, inviting, blue sky
* SUNSET: Warm golden hour glow, dramatic colors
* TWILIGHT: Dramatic sky with warm interior lights visible

PRESERVE (CRITICAL - Accurate Representation):
* Accurate representation of actual property structure
* Real architectural details exactly as shown
* True proportions and scale
* Actual window and door placement
* Do not add features that don't exist (no adding porches, dormers, etc.)
* Do not add or remove any objects unless specifically stated
* NEVER add windows, doors, or architectural features that don't exist
* NEVER change the building's appearance, color, or style
* NEVER add landscaping, pathways, or exterior features not present

OUTPUT QUALITY: High-conversion "curiosity-generating" exterior that makes viewers want to click and learn more about the property. Must accurately represent the actual property.
```

### 6.9 Lawn / Backyard Enhancement Prompt (Exact Wording)

```
LAWN / BACKYARD ENHANCEMENT PROMPT
====
Enhance this lawn or backyard photo for a vacation rental listing to showcase the outdoor living space as an extension of the home.

⚠️ CRITICAL ACCURACY REQUIREMENTS ⚠️
* DO NOT add any structures, features, or landscaping elements that are not visible in the original photo
* DO NOT add pools, hot tubs, fire pits, pergolas, or outdoor kitchens that don't exist
* DO NOT add any furniture, decorations, or features that are not present in the original image
* PRESERVE the exact layout and features of the original photo
* The enhanced photo must accurately represent the actual outdoor space - guests will visit this property
* Sky replacement IS allowed as it does not misrepresent the property itself

SKY ENHANCEMENT (ALLOWED):
* If sky is overcast, cloudy, or gray: replace with pleasant blue sky
* Option: Convert to golden hour/sunset mood if appropriate
* Natural cloud formations if adding clouds
* Ensure lighting direction matches sun position

CORRECTIONS:
* Straighten any tilted framing
* Correct wide-angle distortion on edges
* Fix perspective issues

LAWN & LANDSCAPING (ENHANCEMENT ONLY):
* Enhance green grass vibrancy naturally (not neon or artificial)
* Brighten existing foliage and flower colors appropriately
* Make existing landscaping look healthy and well-maintained
* DO NOT add trees, shrubs, flowers, or gardens that aren't present
* DO NOT change the layout or design of the landscaping

OUTDOOR LIVING SPACES:
* Enhance existing patio/deck surfaces (but don't change materials)
* Brighten existing outdoor furniture
* Make spaces look clean and inviting
* DO NOT add furniture, umbrellas, or staging items that aren't there

ATMOSPHERE:
* Create inviting, relaxing outdoor vibes
* Emphasize space for entertaining or relaxing
* Bright, welcoming daytime OR warm evening ambiance

PRESERVE (CRITICAL - Accurate Representation):
* Accurate representation of yard size and shape
* Real landscaping features and layout exactly as shown
* True proportions and scale of the space
* Actual outdoor features and amenities only
* Do not add features that don't exist
* NEVER add pools, fire pits, water features, or structures not present
* NEVER add outdoor furniture or staging that isn't there
* NEVER expand the apparent size of the yard

OUTPUT QUALITY: Inviting outdoor living space that makes guests excited about spending time outdoors at the property. Must accurately represent the actual space.
```

### 6.10 Miscellaneous Exterior Enhancement Prompt (Exact Wording)

```
MISCELLANEOUS EXTERIOR ENHANCEMENT PROMPT
====
Enhance this exterior photo for a vacation rental listing to present secondary outdoor features in their best light.

⚠️ CRITICAL ACCURACY REQUIREMENTS ⚠️
* DO NOT add any structures, features, or elements that are not visible in the original photo
* DO NOT change, upgrade, or alter any existing structures or features
* DO NOT add any objects, landscaping, or details that are not present in the original image
* PRESERVE the exact appearance and features of the original photo
* The enhanced photo must accurately represent the actual feature - guests will visit this property
* Sky replacement IS allowed as it does not misrepresent the property itself

SKY ENHANCEMENT (ALLOWED):
* If sky is overcast, cloudy, or gray: replace with pleasant blue sky
* Natural cloud formations if adding clouds
* Ensure lighting direction matches sun position

CORRECTIONS:
* Straighten any tilted framing
* Correct wide-angle distortion on edges
* Fix perspective issues

STRUCTURES & FEATURES:
* Enhance the appearance of existing structures (sheds, garages, etc.)
* Make surfaces look clean and well-maintained
* Brighten and enhance existing materials (wood, stone, concrete)
* DO NOT change the style, color, or design of any structures

PATHWAYS & SURFACES:
* Enhance driveways, walkways, and pathways to look clean
* Make existing surfaces look well-maintained
* DO NOT change materials or add landscaping borders not present

LANDSCAPING (ENHANCEMENT ONLY):
* Enhance existing greenery and plantings
* DO NOT add landscaping that isn't there

PRESERVE (CRITICAL - Accurate Representation):
* Accurate representation of all structures and features
* Real materials and finishes exactly as shown
* True proportions and scale
* Actual condition (improved but honest representation)
* Do not add features that don't exist
* NEVER upgrade or modernize the appearance of structures
* NEVER add pathways, lighting, or features not present

OUTPUT QUALITY: Clean, well-maintained appearance that accurately represents secondary outdoor features guests will encounter. Must accurately represent the actual property.
```

### 6.11 Enhancement Intensity Presets

#### Light Enhancement (For Good Source Images)
```
Apply subtle enhancements only:
- Minor exposure adjustment (+/- 0.5 stops maximum)
- Gentle white balance correction
- Light shadow recovery
- Subtle sharpening
- Minor vertical line straightening if needed
Maintain 95% fidelity to original image.
Do not apply sky replacement or major corrections.

⚠️ ACCURACY REQUIREMENTS STILL APPLY:
- DO NOT add any elements not present in the original
- DO NOT change or replace any furniture or fixtures
- PRESERVE exact layout and architectural features
```

#### Moderate Enhancement (For Average Source Images)
```
Apply moderate corrections:
- Exposure correction (+/- 1 stop)
- White balance normalization
- Shadow/highlight recovery
- Perspective and distortion correction
- Bed linen smoothing if needed
- Reflection removal if present
- Color vibrancy enhancement
Maintain 85% fidelity to original image.
Apply sky replacement only if sky is significantly overcast.

⚠️ ACCURACY REQUIREMENTS STILL APPLY:
- DO NOT add any windows, doors, or architectural elements not visible
- DO NOT change, replace, or alter any furniture
- DO NOT add any objects or features not present
- PRESERVE exact layout and architectural features
```

#### Significant Enhancement (For Challenging Source Images)
```
Apply comprehensive corrections:
- Major exposure rebalancing
- Full white balance correction
- HDR-style shadow/highlight recovery
- Sky replacement if overcast or blown out
- Blown-out window recovery
- Perspective, angle, and distortion correction
- Bed smoothing and texture enhancement
- Reflection removal
- Resolution/sharpness enhancement
- Add missing amenities ONLY: towels and toilet paper in bathrooms

Note: If original image lacks basic visibility or has severe motion blur, flag for re-upload rather than attempting enhancement.

⚠️ CRITICAL ACCURACY REQUIREMENTS STILL APPLY - EVEN AT SIGNIFICANT LEVEL:
- DO NOT add any windows, doors, or architectural elements that don't exist
- DO NOT change, replace, or alter any furniture - enhancement only
- DO NOT add any objects, decorations, or features not present
(EXCEPTION: towels and toilet paper in bathrooms)
- PRESERVE the exact layout, furniture placement, and architectural features
- The enhanced photo must accurately represent the actual space
- Guests WILL visit this property - do not misrepresent what they will see
```

### 6.12 Detail Shot Enhancement Prompt (Exact Wording)

```
DETAIL SHOT ENHANCEMENT PROMPT
====
Create a close-up detail shot from this photo, focusing on: [ADMIN NOTE]

⚠️ CRITICAL ACCURACY REQUIREMENTS ⚠️
- DO NOT add any elements, decorations, or features not visible in the original
- DO NOT change, replace, or alter the subject being highlighted
- PRESERVE the exact appearance of the featured element
- The detail shot must accurately represent the actual feature

CROPPING:
- Crop to focus tightly on the specified subject
- Maintain rule of thirds composition
- Ensure subject fills 60-80% of the frame

ENHANCEMENT:
- Maximum sharpness and clarity on the focal subject
- Soft background blur if appropriate (simulate f/2.8 depth of field)
- Enhance textures and details of the subject
- DO NOT alter or change the subject itself

COLOR & LIGHTING:
- Warm, inviting tones
- Well-lit subject area
- Remove distracting shadows

PRESERVE (CRITICAL):
- Natural appearance of subject exactly as it exists
- Accurate colors and textures
- Authentic representation - do not "improve" or change the item
- The featured element must look exactly as guests will see it

OUTPUT: Professional "personality shot" highlighting the specified detail, suitable for vacation rental listing to showcase property features. Must accurately represent the actual feature.
```

---

## 7. UI/UX Design Specifications

### 7.1 Homeowner Interface Pages

#### Page 1: Landing Page
- Clean, professional design with #383D31 brand color
- Listing Lift logo (camera aperture with house silhouette)
- Clear value proposition: "Submit and forget—we handle everything"
- Mobile-first responsive design
- Single CTA button

#### Page 2: Contact Information
- Step 1 of 9 indicator
- Fields: Full Name*, Email Address*, Phone Number*, Property Address* (with City, Province/State, Postal/ZIP), Notes (Optional)
- "Continue to Tips" button

#### Page 3: General Photography Tips
- Step 2 of 9 indicator
- The 5-Photo Rule explanation
- What AI CAN Fix list
- What AI CANNOT Fix (Reshoot Required) list
- Lighting Tips
- "Begin Uploading Photos" button

#### Pages 4-9: Room Upload Pages
- Embedded YouTube tutorial video per room
- Collapsible room-specific tips
- Upload area (4-8 photos recommended)
- Drag & drop or tap to select
- Supported formats: HEIC, JPEG, PNG, WebP
- Portrait photo notice (non-blocking)
- Navigation: Back / Next buttons

#### Page 10: Review & Submit
- All photos organized by room
- Edit/remove capability
- Contact info confirmation
- "Submit for Enhancement" button

#### Page 11: Confirmation
- On-screen confirmation with submission ID
- Email confirmation sent

### 7.2 Tutorial Video Links by Room

| Room | YouTube Tutorial |
|------|------------------|
| Living Room | https://youtu.be/QJrm6URR5OA |
| Kitchen | https://youtu.be/g1HYNpO2ntk |
| Bedroom | https://youtu.be/xGbUSzszzQY |
| Bathroom | https://youtu.be/fffuvXLqVDg |
| Outdoor/Curb | https://youtu.be/_x4f59c5KSs |
| Pool | https://youtu.be/T_y8tAsg31I |

### 7.3 Portrait Photo Notice (Non-Blocking)
- Title: "Landscape Orientation Recommended"
- Message: Current photo is in portrait (vertical) orientation. Landscape (horizontal) photos generally work best for vacation rental listings.
- Note: Portrait can work well for capturing tall spaces (staircases, high ceilings) and showing vertical features.
- Buttons: [Keep Photo] [Replace with Landscape]

### 7.4 Admin Dashboard Interface

#### Submissions List View
- Table/card view toggle
- Filters: Status (New, In Progress, Approved, Rejected, Re-upload Requested)
- Sort: Date, Homeowner Name, Status
- Search functionality
- Homeowner notes visible

#### Submission Detail View
- Contact info panel (name, email, phone)
- Property info (address)
- Submission date and photo count
- Homeowner notes display
- AI Model Settings (Current: FLUX.2 [Pro] with Edit option)

#### Per-Photo Controls
- Original | Enhanced side-by-side view
- Enhancement Settings panel:
  - Intensity: Light / Moderate / Significant
  - Toggles: Sky Replacement, Window Recovery, Brightness, Bed Fixing, Perspective, Reflection
  - Additional Notes field
- Re-run Enhancement button (uses original photo)
- Version History display
- Photo Actions: Approve / Reject / Request Re-upload
- Rejection/Re-upload Notes field
- Set Hero button
- Detail Shot button
- Download button
- Full View button

#### Batch Actions
- Select All in Room option
- Download All (ZIP) with structure: /originals/, /enhanced/, /hero/
- Send Notification Email

### 7.5 Mobile Considerations

| Aspect | Implementation |
|--------|----------------|
| Touch Targets | Minimum 44x44px for all buttons and interactive elements |
| Photo Upload | Direct camera access + gallery selection |
| File Formats | HEIC, JPEG, PNG, WebP (all smartphone formats) |
| Form Fields | Full-width inputs, appropriate keyboard types (email, tel) |
| Navigation | Sticky bottom navigation for multi-step form |
| Image Preview | Swipeable gallery with pinch-to-zoom |
| Progress Saving | Auto-save progress to prevent data loss |
| Offline Handling | Queue uploads when connection restored |

---

## 8. Technical Architecture

### 8.1 System Components

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend | Web Application | Homeowner submission form, Admin dashboard |
| Backend | Abacus AI Platform | Business logic, API endpoints |
| Database | PostgreSQL (Abacus AI managed) | Submissions, photos, settings |
| Image Processing | RouteLLM API | AI enhancement via FLUX.2 [Pro] or GPT Image 1.5 |
| Email | Abacus AI Notification System | Automated notifications |
| File Storage | Organized folder structure | /originals/, /enhanced/, /hero/ |

### 8.2 Image Processing Pipeline

1. **Upload** → Original photo stored in `/originals/`
2. **Initial Enhancement** → AI processes with room-specific prompt
3. **Admin Review** → Side-by-side comparison
4. **Re-run (if needed)** → Uses ORIGINAL photo with revised settings
5. **Hero Generation** → Higher resolution version for selected hero
6. **Download** → ZIP with organized folder structure

### 8.3 File Organization

```
/submissions/{submission_id}/
├── originals/
│   ├── kitchen_001.jpg
│   ├── kitchen_002.jpg
│   ├── bedroom_001.jpg
│   └── ...
├── enhanced/
│   ├── kitchen_001_v1.jpg
│   ├── kitchen_001_v2.jpg (if re-run)
│   ├── bedroom_001_v1.jpg
│   └── ...
└── hero/
    └── hero_kitchen_001.jpg
```

### 8.4 Image Specifications

| Specification | Value |
|---------------|-------|
| Output Size | ~2-3MB per image (Airbnb optimized) |
| Supported Input Formats | HEIC, JPEG, PNG, WebP |
| Orientation | Landscape preferred (portrait accepted with notice) |
| Hero Resolution | Higher than standard enhanced |

---

## 9. Data Model

### 9.1 Core Entities

#### Submission
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Unique submission identifier |
| submission_number | String | Human-readable ID (e.g., 2026-0205-001) |
| homeowner_name | String | Full name |
| homeowner_email | String | Email address |
| homeowner_phone | String | Phone number |
| property_address | String | Full property address |
| notes | Text | Optional homeowner notes |
| status | Enum | New, In Progress, Approved, Rejected, Re-upload Requested |
| created_at | Timestamp | Submission date |
| updated_at | Timestamp | Last modification |

#### Photo
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Unique photo identifier |
| submission_id | UUID | Foreign key to Submission |
| room_category | Enum | Kitchen, Bedroom, Living Spaces, Bathroom, Pool/Hot Tub, Exterior |
| sub_category | String | Living Room, Dining Room, Building Exterior, etc. |
| original_path | String | Path to original file |
| enhanced_path | String | Path to current enhanced version |
| is_hero | Boolean | Hero photo flag |
| status | Enum | Pending, Enhanced, Approved, Rejected, Re-upload Requested |
| enhancement_settings | JSON | Current settings applied |
| admin_notes | Text | Internal notes |
| rejection_reason | Text | Reason if rejected |
| reupload_instructions | Text | Instructions if re-upload requested |

#### EnhancementVersion
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Unique version identifier |
| photo_id | UUID | Foreign key to Photo |
| version_number | Integer | Version sequence |
| enhanced_path | String | Path to this version |
| settings_applied | JSON | Settings used for this version |
| created_at | Timestamp | When generated |

#### EnhancementSettings
| Field | Type | Description |
|-------|------|-------------|
| intensity | Enum | Light, Moderate, Significant |
| sky_replacement | Boolean | On/Off |
| bed_fixing | Boolean | On/Off |
| window_recovery | Boolean | On/Off |
| perspective_correction | Boolean | On/Off |
| reflection_removal | Boolean | On/Off |
| brightness_optimization | Boolean | On/Off |
| additional_notes | Text | Custom instructions |

---

## 10. Testing Plan

### 10.1 Homeowner Flow Testing

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| TC-H1 | Landing page loads | Branding, logo, CTA visible |
| TC-H2 | Contact form validation | Required fields enforced, email/phone validated |
| TC-H3 | Photo upload - drag & drop | Photos accepted, thumbnails displayed |
| TC-H4 | Photo upload - mobile camera | Camera access works, photos captured |
| TC-H5 | Portrait photo notice | Non-blocking notice displayed |
| TC-H6 | Sub-category selection | User can select sub-category for Living Spaces and Exterior |
| TC-H7 | Multiple bedrooms/bathrooms | Can add additional rooms |
| TC-H8 | Skip Pool/Hot Tub | Can skip if not applicable |
| TC-H9 | Review & edit | Can remove/add photos before submit |
| TC-H10 | Submission confirmation | ID displayed, email sent |
| TC-H11 | Re-upload flow | Access via email link, shows specific photos needed |

### 10.2 Admin Flow Testing

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| TC-A1 | Dashboard loads | All submissions visible |
| TC-A2 | Filter by status | Correct filtering |
| TC-A3 | Sort by date/name | Correct sorting |
| TC-A4 | Side-by-side comparison | Original and enhanced visible |
| TC-A5 | Enhancement intensity change | Settings update per photo |
| TC-A6 | Toggle individual features | Each toggle works independently |
| TC-A7 | Re-run enhancement | Uses original photo, preserves versions |
| TC-A8 | Select All in Room | Batch settings applied |
| TC-A9 | Hero photo selection | Badge appears, hero folder populated |
| TC-A10 | Detail shot creation | Cropped version generated |
| TC-A11 | Approve photo | Status updated |
| TC-A12 | Reject photo | Notes required, status updated |
| TC-A13 | Request re-upload | Instructions required, email sent |
| TC-A14 | Download ZIP | Correct folder structure |
| TC-A15 | AI model switch | Enhancement uses selected model |

### 10.3 Email Notification Testing

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| TC-E1 | Submission confirmation to homeowner | Email received with details |
| TC-E2 | Submission notification to admin | Email to dan@retreatvr.ca |
| TC-E3 | Approval notification | Homeowner informed photos ready |
| TC-E4 | Rejection notification | Specific photos and reasons listed |
| TC-E5 | Re-upload request | Specific photos and instructions listed |

### 10.4 AI Enhancement Testing

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| TC-AI1 | Kitchen enhancement | Prompt applied correctly |
| TC-AI2 | Bedroom enhancement | Bed smoothing works |
| TC-AI3 | Living Room enhancement | Spaciousness enhanced |
| TC-AI4 | Dining Room enhancement | Correct sub-category prompt |
| TC-AI5 | Bathroom enhancement | Towels/TP added if missing |
| TC-AI6 | Pool/Hot Tub enhancement | Sky replacement works |
| TC-AI7 | Building Exterior enhancement | Curb appeal enhanced |
| TC-AI8 | Lawn/Backyard enhancement | Landscaping enhanced |
| TC-AI9 | Miscellaneous Exterior | Secondary features enhanced |
| TC-AI10 | Light intensity | Subtle changes only |
| TC-AI11 | Moderate intensity | Standard corrections |
| TC-AI12 | Significant intensity | Comprehensive corrections |
| TC-AI13 | Accuracy preservation | No furniture/layout changes |

---

## 11. Research Document Insights

### 11.1 Key Statistics from Research

| Metric | Impact |
|--------|--------|
| Professional photos | 20-28% higher revenue |
| Quality images | 40% higher revenue for listings |
| Verified professional photos | 17.51% increase in bookings |
| First 5 photos | 80% of guests decide based on these alone |

### 11.2 The 5-Second Rule
Prospective guests decide to engage with or abandon a listing within a 5-second psychological window. Superior visuals signal quality to the guest while simultaneously signaling relevance to the search algorithm.

### 11.3 What AI CAN Fix (Proven Capabilities)
- Dark/underexposed photos → AI brightens
- Tilted/crooked framing → AI straightens
- Overcast skies → AI replaces with blue sky
- Blown-out windows → AI recovers exterior view
- Wrinkly bed linens → AI smooths
- Wide-angle distortion → AI corrects
- Photographer reflections → AI removes
- Low resolution → AI enhances sharpness
- Missing towels/toilet paper → AI can add

### 11.4 What AI CANNOT Fix (Reshoot Required)
- Blurry/motion blur photos
- Extremely dark photos (no visible details)
- Bad composition/wrong angle
- Complex clutter (physically remove before shooting)
- Severe high-ISO grain/noise
- Fundamentally bad composition

### 11.5 The 5-Photo Rule (First 5 Photos Strategy)
1. **Hero Photo:** Most attractive amenity or "curiosity-generating" exterior
2. **Living Room:** Shows comfort and spaciousness
3. **Master Bedroom:** Emphasizes luxury (pillows, linens)
4. **Kitchen:** Ready-to-cook appeal
5. **Key Amenity:** Pool, outdoor space, bathroom, or unique feature

### 11.6 Camera Height Guidelines

| Room Type | Recommended Height | Notes |
|-----------|-------------------|-------|
| Living Room | 24-30 inches (knee to chest height) | Corner-to-corner captures three walls |
| Kitchen | 6 inches above counter (chest height) | Shows counter space; surface must be visible |
| Bedroom | 36-48 inches | Ensure clearance past foot of bed |
| Bathroom | Waist height | Shows countertop and sink clearly |
| Exteriors | Knee height | Makes structure appear more imposing |

### 11.7 ISO Ceiling Rule
Keep ISO under 800. High-ISO noise creates "unfixable noise"—digital grain that occurs when a camera sensor lacks sufficient information.

### 11.8 Volume Strategy
- Professional photographers capture ~200 shots to yield 12-25 "keepers" (20:1 ratio)
- Homeowners should: Capture many (100-200+) → Select best 1-3 per space (15-25 total) → Submit only curated selection to AI

---

## 12. Opportunities for Improvement

### 12.1 User Experience Enhancements

1. **Progress Indicator Enhancement**
   - Add estimated time remaining for enhancement processing
   - Show real-time status updates during AI processing

2. **Smart Photo Recommendations**
   - AI-powered analysis of uploaded photos to suggest which ones might need re-shooting before submission
   - Automatic detection of blurry, too-dark, or poorly composed photos with immediate feedback

3. **Guided Photo Capture Mode**
   - In-app camera with overlay guides showing optimal framing
   - Real-time tips based on detected room type

4. **Before/After Slider for Homeowners**
   - Allow homeowners to see enhancement previews before final submission
   - Build trust and set expectations

5. **Batch Upload Improvements**
   - Allow uploading all photos at once with AI-assisted room categorization
   - Drag-and-drop reordering across rooms

### 12.2 Admin Workflow Optimizations

1. **AI-Assisted Quality Scoring**
   - Automatic quality score for each photo (1-10)
   - Flag photos that likely need re-upload
   - Prioritize review queue by quality score

2. **Template Responses**
   - Pre-written rejection/re-upload instruction templates
   - One-click common feedback options

3. **Bulk Processing Rules**
   - Set default enhancement settings per room type
   - Auto-apply settings to new submissions

4. **Analytics Dashboard**
   - Track submission volume over time
   - Average processing time metrics
   - Common rejection reasons analysis

### 12.3 Technical Improvements

1. **Progressive Enhancement**
   - Generate quick preview (lower quality) immediately
   - Full quality processing in background
   - Reduces perceived wait time

2. **Smart Caching**
   - Cache enhancement results for similar photos
   - Reduce API costs for common scenarios

3. **Webhook Integration**
   - Real-time notifications to external systems
   - Integration with property management software

4. **API for Partners**
   - Allow third-party integrations
   - Programmatic submission capability

### 12.4 Content & Education

1. **Interactive Tutorial Mode**
   - Step-by-step guided first submission
   - Tooltips and contextual help

2. **Example Gallery**
   - Before/after examples for each room type
   - Best practices showcase

3. **Video Library Expansion**
   - More detailed tutorials for challenging scenarios
   - Seasonal photography tips (winter, summer)

---

## 13. Potential Problems & Challenges

### 13.1 Technical Challenges

1. **AI Enhancement Consistency**
   - **Problem:** Different AI models may produce inconsistent results across a photo set
   - **Risk:** Photos from same property look like they're from different properties
   - **Mitigation:** Implement consistency checking; use same model for entire submission

2. **Processing Time & Scalability**
   - **Problem:** AI enhancement can be slow, especially for large submissions
   - **Risk:** User frustration, timeout issues
   - **Mitigation:** Queue system, progress indicators, background processing

3. **File Size Management**
   - **Problem:** High-resolution photos can be very large
   - **Risk:** Slow uploads, storage costs, processing delays
   - **Mitigation:** Client-side compression, progressive upload, size limits

4. **AI Accuracy Failures**
   - **Problem:** AI might occasionally add/change elements despite prompts
   - **Risk:** Misrepresentation of property, guest complaints
   - **Mitigation:** Admin review required, version comparison, accuracy validation

5. **Mobile Upload Reliability**
   - **Problem:** Mobile connections can be unstable
   - **Risk:** Lost uploads, incomplete submissions
   - **Mitigation:** Chunked uploads, resume capability, offline queue

### 13.2 User Experience Challenges

1. **Photo Quality Variability**
   - **Problem:** Homeowners submit very low-quality photos
   - **Risk:** AI cannot enhance sufficiently, wasted processing
   - **Mitigation:** Pre-upload quality check, clear guidance, rejection workflow

2. **Sub-Category Confusion**
   - **Problem:** Users may not understand which sub-category to select
   - **Risk:** Wrong prompts applied, suboptimal results
   - **Mitigation:** Clear descriptions, examples, AI-assisted categorization

3. **Expectation Management**
   - **Problem:** Users expect AI to fix everything
   - **Risk:** Disappointment when photos still need re-shooting
   - **Mitigation:** Clear "What AI Cannot Fix" education, realistic examples

4. **Re-upload Friction**
   - **Problem:** Asking users to re-take photos creates friction
   - **Risk:** User abandonment, incomplete submissions
   - **Mitigation:** Clear instructions, specific guidance, easy re-upload flow

### 13.3 Business & Operational Challenges

1. **Admin Bottleneck**
   - **Problem:** Single admin (Daniel) reviewing all submissions
   - **Risk:** Processing delays, burnout
   - **Mitigation:** Batch operations, AI-assisted prioritization, potential for additional reviewers

2. **Cost Management**
   - **Problem:** AI API calls can be expensive, especially with re-runs
   - **Risk:** Unsustainable costs
   - **Mitigation:** Usage monitoring, optimization, caching strategies

3. **Email Deliverability**
   - **Problem:** Automated emails may go to spam
   - **Risk:** Users miss important notifications
   - **Mitigation:** Email authentication (SPF, DKIM), clear sender identity, user education

4. **Legal/Compliance**
   - **Problem:** Enhanced photos must accurately represent property
   - **Risk:** Guest complaints, platform violations, legal issues
   - **Mitigation:** Strict accuracy requirements in prompts, admin review, clear policies

### 13.4 Edge Cases

1. **Unusual Room Types**
   - What about wine cellars, home gyms, saunas, etc.?
   - Need clear guidance on where to upload

2. **Seasonal Variations**
   - Summer photos enhanced with blue sky may not match winter reality
   - Consider seasonal tagging

3. **Multi-Property Submissions**
   - What if a homeowner has multiple properties?
   - Need clear separation or multiple submission support

4. **Very Large Properties**
   - Properties with 10+ bedrooms may exceed photo limits
   - Need flexible limits or tiered approach

---

## 14. Ambiguities & Missing Information

### 14.1 Technical Ambiguities

1. **AI Model Fallback**
   - What happens if FLUX.2 [Pro] is unavailable?
   - Is there automatic fallback to GPT Image 1.5?
   - What are the differences in output between models?

2. **Version Retention Policy**
   - How many enhancement versions are kept per photo?
   - Is there automatic cleanup of old versions?
   - Storage limits?

3. **Concurrent Processing**
   - How many photos can be processed simultaneously?
   - Queue priority rules?

4. **Error Handling**
   - What happens if AI enhancement fails?
   - Retry logic?
   - User notification for failures?

5. **Image Format Conversion**
   - Are HEIC files converted to JPEG?
   - What format is used for enhanced output?

### 14.2 Business Logic Ambiguities

1. **Submission Limits**
   - Is there a maximum number of photos per submission?
   - Maximum file size per photo?
   - Maximum submissions per homeowner?

2. **Re-upload Workflow**
   - Can homeowners re-upload without admin request?
   - Time limit for re-uploads?
   - What happens to original submission if re-upload is partial?

3. **Hero Photo Rules**
   - Can there be multiple hero photos?
   - Is hero selection required before approval?
   - What if admin doesn't select a hero?

4. **Approval Workflow**
   - Must ALL photos be approved/rejected before notification?
   - Can partial approval be sent?
   - What's the workflow for mixed decisions (some approved, some rejected)?

5. **Status Transitions**
   - What are valid status transitions?
   - Can a rejected photo be re-approved?
   - Can an approved submission be reopened?

### 14.3 User Experience Ambiguities

1. **Session Management**
   - How long is a submission session valid?
   - Can users return to incomplete submissions?
   - How is progress saved?

2. **Multiple Bedrooms/Bathrooms**
   - Is there a limit on additional rooms?
   - How are they labeled/organized?

3. **Notes Field Usage**
   - What kind of notes are expected?
   - Are there character limits?
   - How are notes displayed to admin?

4. **Tutorial Videos**
   - Are videos required viewing?
   - Can they be skipped?
   - What if YouTube is blocked?

### 14.4 Missing Information

1. **Authentication**
   - Document says "no-login-required" but how is re-upload access secured?
   - Is there any authentication for admin dashboard?
   - How is admin access controlled?

2. **Notification Preferences**
   - Can homeowners opt out of emails?
   - Email frequency limits?

3. **Data Retention**
   - How long are submissions stored?
   - GDPR/privacy compliance?
   - Data deletion requests?

4. **Pricing/Billing**
   - Is this a free service for Partner+ clients?
   - Any usage limits?
   - Cost tracking?

5. **SLA/Performance**
   - Expected turnaround time?
   - Uptime requirements?
   - Support channels?

6. **Localization**
   - Is the app English-only?
   - Currency/date formats?
   - Phone number formats for international properties?

7. **Accessibility**
   - WCAG compliance requirements?
   - Screen reader support?
   - Keyboard navigation?

8. **Browser Support**
   - Minimum browser versions?
   - Mobile browser support?

9. **Integration Details**
   - How are photos "implemented into listings"?
   - Direct Airbnb/VRBO API integration?
   - Manual upload by RVR team?

10. **Backup & Recovery**
    - Backup frequency?
    - Disaster recovery plan?
    - Data redundancy?

---

## Summary

This comprehensive analysis covers the complete Listing Lift by Retreat Vacation Rentals specification and research documents. The application is well-designed with clear user flows, detailed AI prompts with strict accuracy requirements, and a thoughtful admin workflow.

**Key Strengths:**
- Clear value proposition ("Submit and forget")
- Comprehensive AI prompts with accuracy safeguards
- Well-defined room categories and sub-categories
- Detailed UI/UX specifications
- Strong emphasis on accurate property representation

**Areas Requiring Clarification Before Development:**
- Authentication and security details
- Error handling and fallback strategies
- Data retention and privacy policies
- Integration specifics with Airbnb/VRBO
- Performance and scalability requirements

**Recommended Next Steps:**
1. Clarify ambiguities listed in Section 14
2. Define technical specifications for edge cases
3. Create detailed API specifications
4. Develop prototype for user testing
5. Establish monitoring and analytics requirements
