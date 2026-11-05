import React from "react";
import { act, create } from "react-test-renderer";
import { renderToStaticMarkup } from "react-dom/server";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import {
  addMensWaitlist,
  readMensWaitlist,
  writeMensWaitlist,
  matchingWaitlistSlot,
  mensSupportReply,
  MENS_WAITLIST_KEY,
} from "../src/lib/mensWaitlist";
import {
  MENS_DEFAULTS,
  MENS_STAFF,
  MENS_SERVICES,
  mensMediaVisible,
} from "../src/lib/keshkraft";
import { CATEGORY_TEMPLATES } from "../src/categoryTemplates";
import { INITIAL_SALON_PROFILE } from "../src/mockData";
import {
  MensBookingSection,
  MensPortfolio,
  MensStylistChat,
} from "../src/components/keshkraft/KeshKraftInteractions";
import { supabase } from "../src/lib/supabase";
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
let value = "[]";
const storage = {
  getItem: () => value,
  setItem: (_key: string, v: string) => {
    value = v;
  },
};
const entry = {
  slug: "test-mens",
  serviceId: MENS_SERVICES[0].id,
  serviceName: MENS_SERVICES[0].name,
  stylistId: "any_available",
  date: "2026-12-01",
  time: "10:30",
  browserAlerts: false,
};
assert.deepEqual(
  readMensWaitlist(),
  [],
  "SSR/storage-denied environments remain safe",
);
value = "invalid-json";
assert.deepEqual(readMensWaitlist(storage), []);
value = JSON.stringify([{}, null, { ...entry, id: "bad", date: "invalid" }]);
assert.deepEqual(readMensWaitlist(storage), []);
value = "[]";
const saved = addMensWaitlist(entry, storage);
assert.equal(
  addMensWaitlist(entry, storage).id,
  saved.id,
  "deduplicate an active request",
);
assert.equal(readMensWaitlist(storage).length, 1);
assert.equal(readMensWaitlist(storage)[0].browserAlerts, false);
assert.ok(
  !value.includes("email") && !value.includes("phone"),
  "no personal contact data",
);
assert.throws(() => addMensWaitlist({ ...entry, date: "2026-02-31" }, storage));
assert.throws(() => addMensWaitlist({ ...entry, time: "99:60" }, storage));
const slots = [
  { time: "10:00", available: true, stylistId: "barber-a" },
  { time: "10:30", available: false, stylistId: "barber-b" },
  { time: "11:00", available: true, stylistId: "barber-c" },
];
assert.equal(
  matchingWaitlistSlot(saved, slots),
  undefined,
  "unavailable requested time cannot trigger alert",
);
assert.equal(
  matchingWaitlistSlot({ ...saved, time: "" }, slots)?.time,
  "10:00",
);
assert.equal(
  matchingWaitlistSlot({ ...saved, time: "", stylistId: "barber-c" }, slots)
    ?.time,
  "11:00",
);
assert.equal(
  matchingWaitlistSlot({ ...saved, time: "" }, [
    { time: "10:00", stylistId: "a" },
  ]),
  undefined,
  "unknown availability never triggers an opening",
);
for (const id of ["any", "any_available", "any-specialist"])
  assert.equal(
    matchingWaitlistSlot({ ...saved, time: "", stylistId: id }, slots)?.time,
    "10:00",
  );
writeMensWaitlist([{ ...saved, notified: true }], storage);
assert.notEqual(
  addMensWaitlist(entry, storage).id,
  saved.id,
  "a new request may follow a notified one",
);
for (let i = 2; i < 30; i++)
  addMensWaitlist({ ...entry, slug: `studio-${i}` }, storage);
assert.equal(readMensWaitlist(storage).length, 30);
assert.throws(() => addMensWaitlist({ ...entry, slug: "capacity" }, storage));
assert.match(mensSupportReply("haircut prices"), /INR/);
assert.match(mensSupportReply("waitlist full slots"), /does not reserve/);
assert.match(mensSupportReply("hello"), /simulated/);
const profile = {
  ...INITIAL_SALON_PROFILE,
  ...CATEGORY_TEMPLATES.mens_hair_studio.profile,
  businessType: "mens_hair_studio",
  subdomain: "test-mens",
  mensStudio: MENS_DEFAULTS,
};
const clips = MENS_DEFAULTS.videos.filter(mensMediaVisible);
assert.equal(clips.length, 3);
for (const clip of clips) {
  assert.ok(clip.isAnimatedReference);
  assert.ok(existsSync("public" + clip.url));
  assert.ok(readFileSync("public" + clip.url).includes(Buffer.from("ftyp")));
}
const galleries = MENS_STAFF.map((person) => {
  const html = renderToStaticMarkup(
    <MensPortfolio
      person={person}
      profile={profile}
      live={false}
      onClose={() => {}}
      onBook={() => {}}
    />,
  );
  assert.ok(html.includes("Demo portfolio"));
  assert.ok(html.includes(person.name));
  return [...html.matchAll(/<img[^>]+src="([^"]+)"/g)]
    .map((x) => x[1])
    .join("|");
});
assert.equal(new Set(galleries).size, 3);
const livePortfolio = renderToStaticMarkup(
  <MensPortfolio
    person={MENS_STAFF[0]}
    profile={profile}
    live
    onClose={() => {}}
    onBook={() => {}}
  />,
);
assert.ok(
  !livePortfolio.includes("<img"),
  "starter gallery never claimed as real barber work on live site",
);
const assignedProfile = {
  ...profile,
  mensStudio: {
    ...MENS_DEFAULTS,
    approvedImageUrls: ["https://example.test/men.jpg"],
    gallery: [
      {
        id: "approved",
        stylistId: MENS_STAFF[0].id,
        url: "https://example.test/men.jpg",
        reviewedUrl: "https://example.test/men.jpg",
        title: "Approved male cut",
        visible: true,
        maleOnlyReviewed: true,
      },
    ],
  },
};
assert.ok(
  renderToStaticMarkup(
    <MensPortfolio
      person={MENS_STAFF[0]}
      profile={assignedProfile}
      live
      onClose={() => {}}
      onBook={() => {}}
    />,
  ).includes("https://example.test/men.jpg"),
);
const inquiry = renderToStaticMarkup(
  <MensStylistChat
    person={{ ...MENS_STAFF[0], phone: "9876543210" }}
    profile={profile}
    live
    onClose={() => {}}
  />,
);
assert.match(inquiry, /handed off to WhatsApp/);
assert.ok(!inquiry.includes("https://wa.me/"), "empty inquiry cannot send");

// Delayed availability responses must not overwrite a newly selected day.
const pending: ((result: any) => void)[] = [];
const originalRpc = supabase.rpc;
(supabase as any).rpc = () => new Promise((resolve) => pending.push(resolve));
let tree: any;
try {
  await act(async () => {
    tree = create(
      <MensBookingSection
        profile={profile}
        services={MENS_SERVICES}
        team={MENS_STAFF}
        live
        onBook={() => {}}
      />,
    );
  });
  const text = (n: any): string =>
    typeof n === "string"
      ? n
      : Array.isArray(n)
        ? n.map(text).join("")
        : n?.children
          ? text(n.children)
          : n?.props
            ? text(n.props.children)
            : "";
  const check = () =>
    tree.root
      .findAllByType("button")
      .find((n: any) => text(n).includes("Check available slots"));
  await act(async () => {
    check().props.onClick();
  });
  await act(async () => {
    tree.root
      .findByProps({ type: "date" })
      .props.onChange({ target: { value: "2026-12-02" } });
  });
  await act(async () => {
    pending.shift()!({ data: [], error: null });
  });
  assert.ok(
    !text(tree.root).includes("Join Waitlist"),
    "stale fully-booked response is ignored",
  );
  await act(async () => {
    check().props.onClick();
  });
  await act(async () => {
    pending.shift()!({ data: null, error: { message: "offline" } });
  });
  assert.ok(text(tree.root).includes("Availability could not load"));
  assert.ok(
    !text(tree.root).includes("Join Waitlist"),
    "an RPC failure is not proof of a full day",
  );
  await act(async () => {
    check().props.onClick();
  });
  await act(async () => {
    pending.shift()!({ data: [], error: null });
  });
  assert.ok(
    text(tree.root).includes("Join Waitlist"),
    "confirmed unavailable day offers waitlist",
  );
  await act(async () => tree.unmount());
} finally {
  (supabase as any).rpc = originalRpc;
}
assert.ok(
  readFileSync("src/components/BookingModal.tsx", "utf8").includes(
    "profile.businessType==='mens_hair_studio'&&selectedService&&bookingServiceIds.length===1&&!slotsLoading&&!slotsError",
  ),
  "shared modal waitlist is men-only and successful-availability-only",
);
assert.equal(MENS_WAITLIST_KEY, "studioflow_mens_waitlist_v1");
console.log(
  "Template 15 interactions: playable media manifest, individual/approved-live portfolios, honest inquiry, device storage/dedupe/capacity, requested-slot matching, and stale/error availability handling passed.",
);
