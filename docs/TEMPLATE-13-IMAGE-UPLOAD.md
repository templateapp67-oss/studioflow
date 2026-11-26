# Template 13 — NEXORA Iron & Ink image uploads

Template identity comes from the live NEXORA catalogue: template number `13`, stable ID `tattoo_studio`, display name `NEXORA Iron & Ink Tattoo Studio`, category `Tattoo & Body Art`.

## Added files

- `src/components/TemplateImageField.tsx` — reusable image input with template/section identity, upload state, validation and client-side processing.
- `src/styles/TemplateImageField.css` — responsive framing, `object-fit: cover`, clipping and upload-state styles.
- `scripts/verify-template13-image-upload.mjs` — focused regression check, automatically discovered by `scripts/run-all-verifications.mjs`.

## Frame presets

| Field | Frame | Ratio |
| --- | --- | ---: |
| Hero image | `hero` | 16:9 |
| Studio interior | `interior` | 3:2 |
| Social guide poster | `guide` | 4:3 |
| Reel poster | `reel` | 9:16 |
| Tattoo/body-art category | `service` | 4:3 |
| Testimonial client photo | `avatar` | 1:1 |

Uploads accept JPG, PNG, WebP and AVIF input up to 20 MB. The browser centre-crops, downsizes and compresses the image to no more than 4.5 MB. The output is passed to the existing `uploadSalonImage()` helper, which requires a signed-in user and stores the file in the existing `studioflow-media` bucket under that user's folder. The workspace stores the returned HTTPS URL, not Base64 data. No service-role key, new bucket, database table or Storage policy is added.

The editor replaces the plain URL input for the hero, studio interior, guide posters, reel posters, all data-driven tattoo category photos and client testimonial avatars. Existing `updateCategory()` and `updateTestimonial()` state flows remain in use; category IDs, prices, durations, descriptions, service IDs and booking relationships remain unchanged.

## Verification

```bash
npm run lint
node scripts/verify-template13-image-upload.mjs
npm test
```

Complete a signed-in browser smoke test using landscape, portrait and square source files in all six frame types. Confirm the Supabase URL persists after reloading both the owner workspace and published Template 13 page.
