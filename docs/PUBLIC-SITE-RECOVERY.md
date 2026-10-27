# Public website recovery and local previews

`?site=<slug>` lookups are case-insensitive. In a Vite development build only, if that slug has no published database row but clearly matches a known template (for example `roop-mahal`), the app opens that template's read-only demo instead of stopping at **Website unavailable**. The template-entry header labels it as a demo and keeps booking disabled. Unknown slugs and Supabase errors remain visible so real publishing or connectivity problems are not hidden.

Production never substitutes sample content for a missing salon. A live public URL still requires the owner to publish the website from the workspace. For a local template preview, use `/?template=beauty_parlour`.

Verification: `node scripts/verify-subdomain-routing.mjs` and `node scripts/verify-template-entry.mjs`.
