# Service photography studio — all 16 NEXORA templates

Every NEXORA template's service cards are managed through one editorial
workflow: `ServiceManagement` → **Service / package image** →
`ServiceImageTemplates` → `ServiceImagePrompt`. Because that editor is mounted
for every `BusinessTypeId` (dashboard Services tab, owner workspace, preview
editor and the onboarding wizard), all 16 templates share the same studio,
rules and fallbacks.

## Category-accurate briefs

`src/lib/servicePhotography.ts` holds one photographic playbook per template:

| # | Template | Category direction | Accurate kit (sample) |
| --- | --- | --- | --- |
| 01 | Ziya Women’s Haircut Studio | Precision cuts, blow-dry, styling | shears, sectioning clips, round brush |
| 02 | Royal Blade Barber Shop | Beard trimming, fades | clippers with guards, straight razor, hot towel |
| 03 | Aura Unisex Salon & Wellness | Unisex hair, skin, grooming | tint bowl, facial sponges |
| 04 | Roop Mahal Beauty Parlour | Threading, waxing, beauty rituals | cotton threading spool, wax pot, tweezers |
| 05 | Pinky Nails Studio | Manicure, pedicure, nail art | nail file, cuticle pusher, gel lamp |
| 06 | Kesh Prakriti Hair Spa | Hair spa, keratin, scalp | scalp massager, botanical oil, treatment brush |
| 07 | Dermacure Aesthetic Clinic | Clinical facials | LED mask, serum droppers, gloves |
| 08 | Vogue Noir Makeup Studio | Bridal, party, editorial makeup | brush set, palette, airbrush |
| 09 | Bodhi Tree Massage & Wellness | Massage, warm stones | basalt stones, draping towels, oil |
| 10 | Prism & Chroma Hair Colour Studio | Balayage, foils, gloss | tint bowl, colour foils, swatch ring |
| 11 | Shringaar Royal Bridal Lounge | Bridal makeup, draping, mehendi | jewellery, dupatta, hairpins, mehendi cone |
| 12 | Iron & Ink Tattoo Studio | Tattoo artistry | tattoo machine, ink caps, gloves, barrier film |
| 13 | Arch & Flutter Lash & Brow Bar | Lashes, brow lamination | tweezers, lash tile, mapping thread |
| 14 | Veda Sanjeevani Ayurvedic Spa | Abhyanga, shirodhara | brass shirodhara vessel, potli poultices |
| 15 | KeshKraft Men’s Hair Studio | Men’s cuts, fades, colour | clippers, shears, pomade |
| 16 | Aurelia Beauty Parlour | Hair, skin, nails, bridal, spa | shears, tint bowl, serum, gel lamp, bridal pins |

Each playbook also carries the authentic technique, palette/textures, studio
setting, subject styling and category exclusions. A service-level keyword map
(`serviceTechniqueHint`) sharpens the direction further — threading, waxing,
keratin, balayage, fades, gel nails, facials, bridal, lash, brow, shirodhara,
abhyanga, potli and packages all inject the matching technique.

## Mandatory rules (never optional)

`SERVICE_PHOTO_RULES` is the single source of truth and is copied into both the
copyable ChatGPT brief and the in-app API request:

* Landscape **3:2** at **1536 × 1024 px**.
* Sharp professional editorial photography, clean lighting, rich texture.
* Adults only, fully clothed, respectful and non-sexual framing.
* Main subject inside the central safe-crop area with a **12% margin**.
* No unrelated text, third-party names/logos, stock watermarks, price tags,
  before-and-after comparisons or guaranteed medical claims.
* **Mandatory “Nexora” wordmark** in every image (wall sign, towel, apron or
  footer), inside the safe crop, never covering faces, hands or the treatment.

## Two ways to generate

1. **Copy to ChatGPT** — `ServiceImagePrompt` shows the full brief with the
   template's playbook and the mandatory-rule chips. `Copy image prompt` copies
   it and `Open ChatGPT Images ↗` opens `https://chatgpt.com/images` in a new
   tab. `New variation` rebuilds camera, lighting, decor and composition while
   keeping the service, category and description fixed.
2. **Generate 3 AI images** — `ServiceImageTemplates` calls the
   `studioflow-service-ai-images` edge function with
   `{name, category, description, businessType}`. The backend
   (`backend/functions/studioflow-service-ai-images/core.ts`) carries its own
   copy of the 16 category toolkits and composes the same mandatory rules, so
   API renders stay category-accurate. Billing, network and pending states are
   surfaced explicitly; no stock photo is ever substituted.

## Uploads, URL imports, cropping and restoration

* Accepts **JPG, PNG or WebP up to 20 MB**.
* `fitServicePhotoToCard` centre-crops every upload and every URL import to the
  **3:2 card frame at 1200 × 800**, then the existing compressor keeps the file
  under 2 MB before it is stored in the owner's `studioflow-media` folder.
* `Crop & Adjust` edits the same 3:2 frame with drag/zoom/position controls.
* URL import only accepts HTTPS (`credentials: 'omit'`), validates the MIME
  type and size, and explains blocked hosts so the owner can download instead.
* Removing an owner photo restores the category photography:
  `serviceImageTemplates` returns three distinct, template-owned photographs for
  every one of the 16 templates (dedicated bundles for hair, barber, beauty
  parlour, nails, hair spa, unisex, makeup, bridal, lash & brow, men’s studio
  and Aurelia, plus curated category galleries elsewhere).

## Verification

`scripts/verify-service-photography-templates.mjs` iterates all 16 templates and
asserts the playbooks, mandatory rules in both prompt paths, frontend/backend
toolkit parity, three distinct restoration photos per template, the 20 MB and
3:2 upload contract, and that every template renders the same copy/generate/
rules/restore UI.
