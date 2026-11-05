import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const homepage = await readFile("dist/index.html", "utf8");
const appShell = await readFile("dist/app.html", "utf8");
const robots = await readFile("dist/robots.txt", "utf8");
const sitemap = await readFile("dist/sitemap.xml", "utf8");
const socialImage = await readFile("dist/nexora-social-preview.png");

const count = (source, expression) => [...source.matchAll(expression)].length;

assert.match(homepage, /data-prerendered="true"/);
assert.match(homepage, /<h1\b[^>]*>[\s\S]*?Launch Your Salon Website in/);
assert.equal(count(homepage, /rel="canonical"/g), 1, "homepage must have one canonical tag");
assert.match(homepage, /href="https:\/\/nexorasalon\.online\//);
assert.equal(count(homepage, /property="og:url"/g), 1, "homepage must have one og:url");
assert.equal(count(homepage, /property="og:type"/g), 1, "homepage must have one og:type");
assert.equal(count(homepage, /property="og:image"/g), 1, "homepage must have one og:image");
assert.equal(count(homepage, /name="twitter:card"/g), 1, "homepage must have one twitter:card");
assert.equal(count(homepage, /name="twitter:image"/g), 1, "homepage must have one twitter:image");

const jsonLdMatch = homepage.match(
  /<script id="nexora-homepage-jsonld" type="application\/ld\+json">([\s\S]*?)<\/script>/,
);
assert.ok(jsonLdMatch, "homepage JSON-LD must be present in initial HTML");
const jsonLd = JSON.parse(jsonLdMatch[1]);
assert.equal(jsonLd["@type"], "SoftwareApplication");
assert.equal(jsonLd.name, "NEXORA Salon OS");
assert.equal(jsonLd.url, "https://nexorasalon.online/");

assert.equal(robots.trim(), [
  "User-agent: *",
  "Allow: /",
  "",
  "Sitemap: https://nexorasalon.online/sitemap.xml",
].join("\n"));

assert.match(
  sitemap,
  /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">[\s\S]*<\/urlset>/,
);
const locations = [...sitemap.matchAll(/<loc>(https:\/\/[^<]+)<\/loc>/g)].map((match) => match[1]);
assert.equal(locations.length, 18, "static sitemap must list homepage, customer app and 16 templates");
assert.ok(locations.includes("https://nexorasalon.online/"));
assert.ok(locations.includes("https://nexorasalon.online/?template=aurelia_beauty_parlour"));

assert.equal(socialImage.readUInt32BE(16), 1200, "social preview width must be 1200px");
assert.equal(socialImage.readUInt32BE(20), 630, "social preview height must be 630px");

assert.match(appShell, /<div id="root"><\/div>/, "application routes must keep the empty React root");
assert.doesNotMatch(appShell, /data-prerendered="true"/);
assert.doesNotMatch(appShell, /rel="canonical"/, "homepage canonical must not leak into app routes");
assert.doesNotMatch(appShell, /property="og:image"/, "homepage social image must not leak into app routes");
assert.doesNotMatch(appShell, /nexora-homepage-jsonld/, "homepage JSON-LD must not leak into app routes");

const vercel = JSON.parse(await readFile("vercel.json", "utf8"));
const appEntryQueryKeys = [
  "app", "customer", "site", "s", "subdomain", "template", "category",
  "create", "owner", "panel", "auth", "recovery", "ref", "customer_ref",
  "return", "passwordUpdated", "code", "error", "error_description", "tab",
  "type", "token_hash", "access_token", "refresh_token", "provider_token",
  "provider_refresh_token", "expires_in", "expires_at", "scope",
];
for (const key of appEntryQueryKeys) {
  assert.ok(vercel.rewrites.some((rule) =>
    rule.source === "/" &&
    rule.destination === "/app.html" &&
    rule.has?.some((condition) => condition.type === "query" && condition.key === key),
  ), `application query route ${key} must use the non-prerendered app shell`);
}
assert.doesNotMatch(homepage, /studioflow-[a-z0-9-]+\\.vercel\\.app/);
assert.doesNotMatch(robots, /studioflow-[a-z0-9-]+\\.vercel\\.app/);
assert.doesNotMatch(sitemap, /studioflow-[a-z0-9-]+\\.vercel\\.app/);

assert.ok(vercel.rewrites.some((rule) =>
  rule.source === "/" &&
  rule.destination === "/app.html" &&
  rule.has?.some((condition) => condition.type === "query" && condition.key === "auth"),
), "sign-in query routes must use the non-prerendered app shell");

console.log("PASS: homepage prerender, route isolation, robots, sitemap, canonical, JSON-LD and social preview verified.");
