import React from "react";
import assert from "node:assert/strict";
import { act, create } from "react-test-renderer";
import { readFileSync } from "node:fs";
import { PromotionalBanner } from "../src/components/PromotionalBanner";
import { FloatingPromoBanner } from "../src/components/FloatingPromoBanner";
import { INITIAL_SALON_PROFILE } from "../src/mockData";
import {
  canonicalOrigin,
  generateSitemap,
  sitemapXml,
  sitemapHandler,
} from "../server/sitemap";
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const store = new Map<string, string>();
(globalThis as any).sessionStorage = {
  getItem: (k: string) => store.get(k),
  setItem: (k: string, v: string) => store.set(k, v),
};
let banner: any;
const props = {
  id: "test",
  text: "Clinic announcement",
  actionLabel: "View offer",
  actionHref: "#salon-promo",
};
await act(async () => {
  banner = create(<PromotionalBanner {...props} />);
});
assert.equal(banner.root.findByType("a").props.href, "#salon-promo");
await act(async () => banner.root.findByType("button").props.onClick());
assert.equal(banner.toJSON(), null);
await act(async () => banner.unmount());
await act(async () => {
  banner = create(<PromotionalBanner {...props} />);
});
assert.equal(banner.toJSON(), null, "Remount preserves tab dismissal");
await act(async () =>
  banner.update(<PromotionalBanner {...props} text="New announcement" />),
);
assert.ok(banner.toJSON(), "Changed content is a new campaign");
await act(async () =>
  banner.update(
    <PromotionalBanner {...props} text="New announcement" enabled={false} />,
  ),
);
assert.equal(banner.toJSON(), null);
await act(async () => banner.update(<PromotionalBanner {...props} text="" />));
assert.equal(banner.toJSON(), null);
await act(async () =>
  banner.update(
    <PromotionalBanner {...props} text="Expired" endsAt="2000-01-01" />,
  ),
);
assert.equal(banner.toJSON(), null);
await act(async () =>
  banner.update(
    <PromotionalBanner {...props} text="Invalid date" endsAt="bad" />,
  ),
);
assert.equal(banner.toJSON(), null);
await act(async () =>
  banner.update(
    <PromotionalBanner
      {...props}
      text="Unsafe action"
      actionHref="javascript:alert(1)"
    />,
  ),
);
assert.equal(banner.root.findAllByType("a").length, 0);
await act(async () =>
  banner.update(
    <FloatingPromoBanner
      profile={{
        ...INITIAL_SALON_PROFILE,
        promoCampaign: {
          ...INITIAL_SALON_PROFILE.promoCampaign,
          enabled: true,
          headline: "Sale",
          endsAt: "2000-01-01",
        },
      }}
    />,
  ),
);
assert.equal(banner.toJSON(), null);
await act(async () => banner.unmount());
assert.equal(
  canonicalOrigin("https://clinic.example/"),
  "https://clinic.example",
);
for (const origin of [
  undefined,
  "http://clinic.example",
  "https://user:pass@clinic.example",
  "https://clinic.example/path",
])
  assert.throws(() => canonicalOrigin(origin));
let calls = 0;
const fetcher: any = async (url: URL) => {
  calls++;
  assert.equal(url.searchParams.get("select"), "slug");
  return {
    ok: true,
    json: async () => [
      { slug: "real-clinic" },
      { slug: "<script>" },
      { slug: "real-clinic" },
    ],
  };
};
const xml = await generateSitemap(
  { SITE_URL: "https://clinic.example" },
  fetcher,
);
assert.equal(calls, 1);
assert.ok(xml.includes("https://clinic.example/?site=real-clinic"));
assert.equal(xml.split("site=real-clinic").length, 2);
assert.ok(!xml.includes("<script>"));
assert.ok(
  !xml.includes("customer=") &&
    !xml.includes("module=") &&
    !xml.includes("recovery="),
);
assert.ok(sitemapXml("https://clinic.example", ["abc"]).includes("/?app=1"));
await assert.rejects(() =>
  generateSitemap({ SITE_URL: "https://clinic.example" }, (async () => ({
    ok: false,
  })) as any),
);
const prior = process.env.SITE_URL;
delete process.env.SITE_URL;
let status = 200,
  body = "";
const headers: Record<string, string> = {};
const res: any = {
  status: (n: number) => {
    status = n;
    return res;
  },
  setHeader: (k: string, v: string) => (headers[k] = v),
  send: (s: string) => (body = s),
};
await sitemapHandler({}, res);
assert.equal(status, 503);
assert.equal(headers["Cache-Control"], "no-store");
assert.ok(!body.includes("<html"));
if (prior === undefined) delete process.env.SITE_URL;
else process.env.SITE_URL = prior;
const css = readFileSync("src/components/customer/touch-targets.css", "utf8");
assert.ok(css.includes("min-height:44px"));
assert.ok(css.includes(".cr-app.cr-zip-ui .cr-dots button"));
const app = readFileSync("src/components/CustomerApp.tsx", "utf8");
assert.ok(
  app.indexOf("import './customer/touch-targets.css'") >
    app.indexOf("import './customer/reference-layout.css'"),
);
const pkg = JSON.parse(readFileSync("package.json", "utf8")),
  lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
assert.deepEqual(lock.packages[""].dependencies, pkg.dependencies);
console.log(
  "PASS: announcement lifecycle, dismissal/remount, expired campaigns, safe actions; sitemap canonical URLs/public-only catalogue/error handling; target CSS order; manifest-lock consistency. No browser sizing or live provider claims.",
);
