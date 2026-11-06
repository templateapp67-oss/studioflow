# Step 06 — Add Social Video modal

Owner setup step **06 · Socials & Reels** accepts YouTube Shorts, Instagram
Reels and Facebook Reels/Watch/page videos, with an optional owner-supplied
cover image and muted hover preview.

Files:

| File | Role |
| --- | --- |
| `src/components/SocialConnectivityStep.tsx` | Step 06 screen + the Add Social Video dialog, form state and save handler |
| `src/components/SocialVideoCoverField.tsx` | Dual-mode cover image field (paste URL / upload file, instant preview) |
| `src/lib/socialVideoSource.ts` | Link allow-list, canonical URLs, `reelSource`, platform-correct player URLs |
| `src/lib/socialVideoEmbeds.ts` | Template 12 (Iron & Ink) link parser — a second, independent allow-list |
| `scripts/verify-social-video-modal.{tsx,mjs}` | Offline verification of parsing, the dialog and the saved reel |

## Accepted links

The URL is parsed with `new URL()`, the protocol must be `https:` (no
credentials, no explicit port) and the host/path must match the platform.
Stored URLs are rebuilt from the parsed id, so look-alike hosts
(`facebook.com.evil.test`) and `http:` links are dropped instead of rendered.

| Platform | Accepted shapes |
| --- | --- |
| YouTube | `youtube.com/shorts/<id>` (a full `/watch` video is refused) |
| Instagram | `instagram.com/reel/<code>`, `instagram.com/reels/<code>` |
| Facebook | `facebook.com/reel/<id>`, `facebook.com/watch/?v=<id>`, `facebook.com/<page>/videos/<id>`, `facebook.com/share/r\|v/<code>`, `fb.watch/<code>` |

`m.` / `web.` mobile hosts are accepted and normalised to
`https://www.facebook.com/...`. The Facebook regexes live in
`FACEBOOK_VIDEO_PATTERNS`; `scripts/verify-social-video-modal.tsx` asserts that
`socialVideoSource()` and `socialVideoEmbeds.parseSocialVideo()` agree on the
same accept/reject matrix.

## Fields

1. **Video / Reel URL \*** — required, with the helper line
   “Supports YouTube Shorts, Instagram Reels, or Facebook Video/Reel links.”
2. **Cover Image (Optional)** — two modes:
   * *Paste URL* — any `https` image, normalised through `secureMediaUrl()`.
   * *Upload File* — JPG/PNG/WebP up to 5 MB (`COVER_MAX_BYTES`), picked or
     dragged in, with an instant local `URL.createObjectURL()` thumbnail.
     The file is uploaded to the Supabase `studioflow-media` bucket with
     `uploadSalonImage()` **on save**, so cancelling never leaves orphans; the
     public URL becomes `thumbnailUrl`.
3. **Short preview URL** — optional MP4/WebM (≤ 3 minutes), played on hover.
4. **Video Title** — optional; falls back to `Client Transformation Reel #n`.
5. **Video format** — `SHORT` / `REEL` / `FACEBOOK`. The format is
   auto-selected from the pasted link (YouTube → SHORT, Instagram → REEL,
   Facebook → FACEBOOK), can be overridden, and is stored on the video as
   `videoFormat`. It is a display tag only: every format is saved with
   `categoryTag: 'SHORT'` so it appears in the reel rail.

Saved record (see `SocialVideo` in `src/types.ts`):

```ts
{
  youtubeUrl,        // canonical source link (legacy field name, any platform)
  facebookUrl,       // same URL when the source is Facebook, else ''
  videoFormat,       // 'SHORT' | 'REEL' | 'FACEBOOK'
  videoId,           // YouTube id / Instagram code / Facebook video id
  title, thumbnailUrl, previewVideoUrl, categoryTag: 'SHORT', isOwnerVideo: true
}
```

## Dialog behaviour

* Overlay click, `✕` and `Cancel` close it; `Escape` also closes it.
* `Cancel` / `Save & Add Video` sit in a sticky footer outside the scroll area;
  the panel is `max-w-xl`, capped at `92vh` and scrolls internally on phones.
* Light and dark themes are both styled (`bg-white dark:bg-slate-900`,
  `border-gray-200 dark:border-slate-700`), keeping the Nexora pink `#b0004a`
  primary and `font-mono-caps` labels.
* While an uploaded cover is being stored, the save button shows
  “Uploading cover…” and both buttons are disabled.
* Editing an existing reel restores its link, cover, preview, title and
  saved format.

## Storefront

`reelSource(video)` returns the Facebook source too, so the reel rail picks it
up. Player URLs come from `socialVideoEmbedUrl(source)`:

* YouTube → `youtube-nocookie.com/embed/...` (privacy-enhanced).
* Facebook → `facebook.com/plugins/video.php?href=...` (a bare post URL cannot
  be framed).
* Instagram → `instagram.com/reel/<code>/embed/`.

Where a template has no inline player, the card shows the poster plus a
“Watch on Facebook” / “Open Reel on Facebook” link instead of an empty iframe.

## Verify

```bash
node scripts/verify-social-video-modal.mjs
```

Covers the URL matrix (including `http`, look-alike hosts, credentialed URLs,
missing ids), the three format buttons, the cover URL/upload modes with a
stubbed Supabase bucket, refusal of broken links, `Cancel`, edit-round-trip and
the Facebook reel card on the storefront.
