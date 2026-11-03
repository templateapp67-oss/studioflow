import React, { useState } from "react";
import type {
  SalonProfile,
  SalonService,
  Stylist,
  LoyaltyConfig,
} from "../../types";
import {
  mensConfig,
  mensServices,
  MENS_CATEGORIES,
  MENS_DEFAULTS,
  MENS_LOYALTY,
  MENS_TEMPLATE_ID,
  type MensConfig,
  type MensMedia,
} from "../../lib/keshkraft";
import { uploadSalonImage } from "../../lib/supabase";
import { serviceValidation } from "../../lib/serviceCatalogue";
import "./keshkraft.css";
export interface MensWorkspace {
  profile: SalonProfile;
  services: SalonService[];
  stylists: Stylist[];
  loyaltyConfig?: LoyaltyConfig;
}
export function KeshKraftEditor({
  workspace,
  onSave,
  onClose,
}: {
  workspace: MensWorkspace;
  onSave: (next: MensWorkspace) => void | Promise<void>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<MensWorkspace>(() =>
      structuredClone(workspace),
    ),
    [tab, setTab] = useState("Brand"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const c = mensConfig(draft.profile),
    loyalty = draft.loyaltyConfig || MENS_LOYALTY;
  const config = (next: Partial<MensConfig>) =>
    setDraft((d) => ({
      ...d,
      profile: {
        ...d.profile,
        mensStudio: { ...mensConfig(d.profile), ...next },
      },
    }));
  const profile = (key: keyof SalonProfile, value: any) =>
    setDraft((d) => ({ ...d, profile: { ...d.profile, [key]: value } }));
  const text = (
    label: string,
    value: string,
    change: (s: string) => void,
    type = "text",
  ) => (
    <label>
      {label}
      {type === "textarea" ? (
        <textarea value={value} onChange={(e) => change(e.target.value)} />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => change(e.target.value)}
        />
      )}
    </label>
  );
  const check = (
    label: string,
    value: boolean,
    change: (s: boolean) => void,
  ) => (
    <label>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => change(e.target.checked)}
      />
      {label}
    </label>
  );
  const image = (url: string, change: (s: string) => void) => (
    <div>
      {text("Image URL (HTTPS or bundled asset)", url, change)}
      <label>
        Upload male-only photo
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setBusy(true);
            setError("");
            try {
              change(await uploadSalonImage(file));
            } catch (e) {
              setError(e instanceof Error ? e.message : "Image upload failed");
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      {check(
        "I reviewed this exact image: every visible person is an adult man",
        c.approvedImageUrls.includes(url),
        (v) =>
          config({
            approvedImageUrls: v
              ? [...c.approvedImageUrls.filter((x) => x !== url), url]
              : c.approvedImageUrls.filter((x) => x !== url),
          }),
      )}
    </div>
  );
  const ownServices = draft.services.filter(
    (s) => s.mensTemplateId === MENS_TEMPLATE_ID,
  );
  const servicePatch = (id: string, patch: Partial<SalonService>) =>
    setDraft((d) => ({
      ...d,
      services: d.services.map((s) =>
        s.id === id ? { ...s, ...patch, origin: "custom" } : s,
      ),
    }));
  const staffPatch = (id: string, patch: Partial<Stylist>) =>
    setDraft((d) => ({
      ...d,
      stylists: d.stylists.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  const remove = (kind: "service" | "barber", id: string) => {
    if (
      !window.confirm(
        `Remove this ${kind}? Existing appointments will be preserved.`,
      )
    )
      return;
    setDraft((d) => ({
      ...d,
      [kind === "service" ? "services" : "stylists"]: (kind === "service"
        ? d.services
        : d.stylists
      ).filter((s) => s.id !== id),
    }));
  };
  const listMedia = (key: "gallery" | "videos") => {
    const items = c[key];
    const patch = (id: string, fields: Partial<MensMedia>) =>
      config({
        [key]: items.map((m) => (m.id === id ? { ...m, ...fields } : m)),
      });
    return (
      <>
        <p className="kk-warning">
          Use separate photos, never collages. Review the complete video,
          including background people and its thumbnail. Changing a URL revokes
          approval. Direct MP4/WebM video URLs only; unverified clips are never
          embedded.
        </p>
        {items.map((m) => (
          <fieldset key={m.id}>
            <legend>{m.title}</legend>
            {text("Title", m.title, (v) => patch(m.id, { title: v }))}
            {key === "gallery" && (
              <label>
                Barber portfolio
                <select
                  value={m.stylistId || ""}
                  onChange={(e) =>
                    patch(m.id, { stylistId: e.target.value || undefined })
                  }
                >
                  <option value="">Studio lookbook only</option>
                  {draft.stylists
                    .filter((s) => s.businessType === MENS_TEMPLATE_ID)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </label>
            )}
            {key === "gallery"
              ? image(m.url, (v) =>
                  patch(m.id, {
                    url: v,
                    isAnimatedReference: false,
                    maleOnlyReviewed: false,
                    reviewedUrl: undefined,
                  }),
                )
              : text("Video URL (HTTPS MP4 or WebM)", m.url, (v) =>
                  patch(m.id, {
                    url: v,
                    isAnimatedReference: false,
                    maleOnlyReviewed: false,
                    reviewedUrl: undefined,
                  }),
                )}
            {key === "videos" &&
              image(m.thumbnail || "", (v) =>
                patch(m.id, {
                  thumbnail: v,
                  maleOnlyReviewed: false,
                  reviewedUrl: undefined,
                }),
              )}
            {check("Show this item", m.visible, (v) =>
              patch(m.id, { visible: v }),
            )}
            {check(
              key === "videos"
                ? "I watched the entire video and checked its matching thumbnail. All visible people are adult men."
                : "I reviewed this photo. All visible people are adult men.",
              m.maleOnlyReviewed && m.reviewedUrl === m.url,
              (v) => {
                patch(m.id, {
                  maleOnlyReviewed: v,
                  reviewedUrl: v ? m.url : undefined,
                });
                if (
                  key === "gallery" &&
                  v &&
                  !c.approvedImageUrls.includes(m.url)
                )
                  config({
                    [key]: items.map((x) =>
                      x.id === m.id
                        ? { ...x, maleOnlyReviewed: true, reviewedUrl: m.url }
                        : x,
                    ),
                    approvedImageUrls: [...c.approvedImageUrls, m.url],
                  });
              },
            )}
            <button
              onClick={() => {
                if (window.confirm("Delete this media item?"))
                  config({ [key]: items.filter((x) => x.id !== m.id) });
              }}
            >
              Delete
            </button>
          </fieldset>
        ))}
        <button
          onClick={() =>
            config({
              [key]: [
                ...items,
                {
                  id: crypto.randomUUID(),
                  title:
                    key === "gallery"
                      ? "Men's haircut style"
                      : "Men's haircut video",
                  url: "",
                  visible: true,
                  maleOnlyReviewed: false,
                },
              ],
            })
          }
        >
          Add {key === "gallery" ? "photo" : "video"}
        </button>
      </>
    );
  };
  const save = async () => {
    setError("");
    setNotice("");
    for (const s of ownServices) {
      const error = serviceValidation(s);
      if (error) {
        setError(`${s.name}: ${error}`);
        return;
      }
    }
    if (
      mensServices(ownServices.map((s) => ({ ...s, mensHidden: false })))
        .length !== ownServices.length
    ) {
      setError(
        "Only men’s haircut and hair colour services are allowed. Remove unrelated content or choose an approved category.",
      );
      return;
    }
    if (
      c.videos.some(
        (v) =>
          v.maleOnlyReviewed &&
          (!/^(https:\/\/.*|\/templates\/15\/[a-z-]+)\.(mp4|webm)(\?.*)?$/i.test(
            v.url,
          ) ||
            !v.thumbnail),
      )
    ) {
      setError(
        "Approved videos need a direct HTTPS MP4/WebM URL and a matching male-only thumbnail.",
      );
      return;
    }
    for (const o of c.offers) {
      if (
        !o.code.trim() ||
        o.discount <= 0 ||
        (o.type === "percent" && o.discount > 100) ||
        !o.serviceIds.length ||
        o.serviceIds.some((id) => !ownServices.some((s) => s.id === id)) ||
        (o.from && o.to && o.to < o.from)
      ) {
        setError(
          `Check coupon, discount, dates and eligible services for ${o.title}.`,
        );
        return;
      }
    }
    const codes = c.offers.map((o) => o.code.trim().toUpperCase());
    if (new Set(codes).size !== codes.length) {
      setError("Coupon codes must be unique.");
      return;
    }
    if (
      c.breaks.some(
        (b) => !b.staffId || !b.fromTime || !b.toTime || b.fromTime >= b.toTime,
      ) ||
      c.leave.some(
        (l) =>
          !l.staffId ||
          !/^\d{4}-\d{2}-\d{2}$/.test(l.from) ||
          !/^\d{4}-\d{2}-\d{2}$/.test(l.to) ||
          l.to < l.from,
      ) ||
      c.holidays.some((d) => !/^\d{4}-\d{2}-\d{2}$/.test(d))
    ) {
      setError(
        "Enter valid holiday and leave dates, and break times with an end after the start.",
      );
      return;
    }
    if (
      !Number.isFinite(loyalty.pointsPerHundredSpent) ||
      loyalty.pointsPerHundredSpent < 0 ||
      loyalty.rewards.some(
        (r) =>
          !Number.isInteger(r.requiredPoints) ||
          r.requiredPoints < 1 ||
          !Number.isFinite(r.discountValue) ||
          r.discountValue <= 0,
      )
    ) {
      setError(
        "Enter nonnegative earning points and positive reward points / discounts.",
      );
      return;
    }
    if (c.hours.some((h) => h.enabled && h.fromTime >= h.toTime)) {
      setError("Closing time must be after opening time.");
      return;
    }
    setBusy(true);
    try {
      await onSave({
        ...draft,
        profile: {
          ...draft.profile,
          serviceCatalogueInitialized: true,
          mensStudio: c,
        },
        loyaltyConfig: loyalty,
      });
      setNotice("Saved to the workspace. No publish action was requested.");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Save failed. Your edits remain here.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <section
      className="kk-editor"
      aria-label="KeshKraft Template 15 customizer"
    >
      <h2>Customize KeshKraft</h2>
      <p>Template 15 · Men only · INR ₹</p>
      <p className="kk-warning">
        This editor changes only the current studio workspace. It never edits
        other salons. Owner review is required for all new media; the app cannot
        automatically determine a person's gender from an upload.
      </p>
      <nav aria-label="Customizer tabs">
        {[
          "Brand",
          "Services",
          "Barbers",
          "Gallery",
          "Videos",
          "Reviews",
          "Offers",
          "Rewards",
          "Booking",
          "Contact",
        ].map((t) => (
          <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </nav>
      {tab === "Brand" && (
        <>
          <h3>Identity & design</h3>
          {text("Salon name", draft.profile.businessName, (v) =>
            profile("businessName", v),
          )}
          {image(c.logo, (v) => config({ logo: v }))}
          {text("Hero heading", c.heroHeading, (v) =>
            config({ heroHeading: v }),
          )}
          {text(
            "Hero description",
            c.heroDescription,
            (v) => config({ heroDescription: v }),
            "textarea",
          )}
          {image(draft.profile.coverImageUrl, (v) =>
            profile("coverImageUrl", v),
          )}
          <div className="kk-edit-grid">
            {(["bronze", "olive", "background"] as const).map((k) => (
              <React.Fragment key={k}>
                {text(`${k} colour`, c[k], (v) => config({ [k]: v }), "color")}
              </React.Fragment>
            ))}
          </div>
          <label>
            Font
            <select
              value={c.font}
              onChange={(e) => config({ font: e.target.value })}
            >
              {[
                "Arial, sans-serif",
                "Verdana, sans-serif",
                "Georgia, serif",
                "Trebuchet MS, sans-serif",
              ].map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </label>
          {(
            ["haircutButton", "stylesButton", "colourButton", "footer"] as const
          ).map((k) => (
            <React.Fragment key={k}>
              {text(k, c[k], (v) => config({ [k]: v }))}
            </React.Fragment>
          ))}
          <h3>Show / hide sections</h3>
          {[
            "services",
            "team",
            "gallery",
            "videos",
            "reviews",
            "offers",
            "loyalty",
            "contact",
            "booking",
          ].map((k) => (
            <React.Fragment key={k}>
              {check(k, !c.hiddenSections.includes(k), (v) =>
                config({
                  hiddenSections: v
                    ? c.hiddenSections.filter((s) => s !== k)
                    : [...c.hiddenSections, k],
                }),
              )}
            </React.Fragment>
          ))}
        </>
      )}
      {tab === "Services" && (
        <>
          <h3>Men's service menu</h3>
          <p>
            Only the two approved categories are available. Unrelated saved
            records are preserved but never shown on this website.
          </p>
          {ownServices.map((s) => (
            <fieldset key={s.id}>
              <legend>{s.name}</legend>
              {text("Service name", s.name, (v) =>
                servicePatch(s.id, { name: v }),
              )}
              <label>
                Category
                <select
                  value={s.category}
                  onChange={(e) =>
                    servicePatch(s.id, { category: e.target.value })
                  }
                >
                  {MENS_CATEGORIES.map((cat) => (
                    <option key={cat}>{cat}</option>
                  ))}
                </select>
              </label>
              {text(
                "Description",
                s.description,
                (v) => servicePatch(s.id, { description: v }),
                "textarea",
              )}
              <div className="kk-edit-grid">
                {text(
                  "Price ₹",
                  String(s.price ?? 0),
                  (v) => servicePatch(s.id, { price: Number(v) }),
                  "number",
                )}
                {text(
                  "Duration in minutes",
                  String(s.durationMinutes),
                  (v) => servicePatch(s.id, { durationMinutes: Number(v) }),
                  "number",
                )}
              </div>
              {image(s.imageUrl || "", (v) =>
                servicePatch(s.id, { imageUrl: v }),
              )}
              {check("Show service", s.mensHidden !== true, (v) =>
                servicePatch(s.id, { mensHidden: !v }),
              )}
              <button onClick={() => remove("service", s.id)}>
                Delete service
              </button>
            </fieldset>
          ))}
          {MENS_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  services: [
                    ...d.services,
                    {
                      id: crypto.randomUUID(),
                      name:
                        cat === MENS_CATEGORIES[0]
                          ? "New Men's Haircut"
                          : "New Men's Hair Colour",
                      category: cat,
                      description: "Personalised men’s hair service.",
                      price: 500,
                      durationMinutes: 40,
                      icon: "content_cut",
                      origin: "custom",
                      mensTemplateId: MENS_TEMPLATE_ID,
                    },
                  ],
                }))
              }
            >
              Add {cat}
            </button>
          ))}
        </>
      )}
      {tab === "Barbers" && (
        <>
          <h3>Male barber & hair expert profiles</h3>
          {draft.stylists
            .filter((s) => s.businessType === MENS_TEMPLATE_ID)
            .map((s) => (
              <fieldset key={s.id}>
                <legend>{s.name}</legend>
                {text("Name", s.name, (v) => staffPatch(s.id, { name: v }))}
                {text("Role", s.role, (v) => staffPatch(s.id, { role: v }))}
                {text(
                  "Experience (years)",
                  String(s.experienceYears || 0),
                  (v) => staffPatch(s.id, { experienceYears: Number(v) }),
                  "number",
                )}
                {text(
                  "Haircut and colour skills (comma separated)",
                  s.specialties.join(", "),
                  (v) =>
                    staffPatch(s.id, {
                      specialties: v
                        .split(",")
                        .map((x) => x.trim())
                        .filter(Boolean),
                    }),
                )}
                {image(s.avatarUrl, (v) => staffPatch(s.id, { avatarUrl: v }))}
                {check(
                  "I confirm this profile is a male barber / men’s hair expert",
                  s.mensMaleOnly === true,
                  (v) => staffPatch(s.id, { mensMaleOnly: v }),
                )}
                <label>
                  Availability
                  <select
                    value={s.status || "Available"}
                    onChange={(e) =>
                      staffPatch(s.id, {
                        status: e.target.value as Stylist["status"],
                      })
                    }
                  >
                    {["Available", "Busy", "On Leave", "Inactive"].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <h4>Service assignments</h4>
                <div className="kk-checks">
                  {ownServices.map((service) => (
                    <React.Fragment key={service.id}>
                      {check(
                        service.name,
                        s.assignedServices?.includes(service.id) || false,
                        (v) =>
                          staffPatch(s.id, {
                            assignedServices: v
                              ? [...(s.assignedServices || []), service.id]
                              : (s.assignedServices || []).filter(
                                  (id) => id !== service.id,
                                ),
                          }),
                      )}
                    </React.Fragment>
                  ))}
                </div>
                <h4>Working hours</h4>
                {(
                  s.schedule || (MENS_DEFAULTS.hours as Stylist["schedule"])
                ).map((day, i) => (
                  <div className="kk-edit-grid" key={day.day}>
                    {check(day.day, day.enabled, (v) =>
                      staffPatch(s.id, {
                        schedule: (s.schedule || []).map((h, j) =>
                          j === i ? { ...h, enabled: v } : h,
                        ),
                      }),
                    )}
                    <div className="kk-edit-grid">
                      {text(
                        "From",
                        day.fromTime,
                        (v) =>
                          staffPatch(s.id, {
                            schedule: (s.schedule || []).map((h, j) =>
                              j === i ? { ...h, fromTime: v } : h,
                            ),
                          }),
                        "time",
                      )}
                      {text(
                        "To",
                        day.toTime,
                        (v) =>
                          staffPatch(s.id, {
                            schedule: (s.schedule || []).map((h, j) =>
                              j === i ? { ...h, toTime: v } : h,
                            ),
                          }),
                        "time",
                      )}
                    </div>
                  </div>
                ))}
                <button onClick={() => remove("barber", s.id)}>
                  Remove barber
                </button>
              </fieldset>
            ))}
          <button
            onClick={() =>
              setDraft((d) => ({
                ...d,
                stylists: [
                  ...d.stylists,
                  {
                    id: crypto.randomUUID(),
                    businessType: MENS_TEMPLATE_ID,
                    name: "New barber",
                    role: "Men's Haircut Specialist",
                    specialties: ["Men's Haircuts", "Men's Hair Colour"],
                    avatarUrl: "",
                    rating: 0,
                    status: "Inactive",
                    mensMaleOnly: false,
                    assignedServices: [],
                    schedule: structuredClone(
                      MENS_DEFAULTS.hours,
                    ) as Stylist["schedule"],
                  },
                ],
              }))
            }
          >
            Add a barber
          </button>
        </>
      )}
      {tab === "Gallery" && listMedia("gallery")}
      {tab === "Videos" && listMedia("videos")}
      {tab === "Reviews" && (
        <>
          <h3>Customer stories</h3>
          <p>
            Demo reviews must remain labelled. Real reviews use the existing
            customer account system. No customer photos are displayed here.
          </p>
          {c.reviews.map((r) => (
            <fieldset key={r.id}>
              {(["name", "service", "text"] as const).map((k) => (
                <React.Fragment key={k}>
                  {text(k, r[k], (v) =>
                    config({
                      reviews: c.reviews.map((x) =>
                        x.id === r.id ? { ...x, [k]: v } : x,
                      ),
                    }),
                  )}
                </React.Fragment>
              ))}
              {check("Show", r.visible, (v) =>
                config({
                  reviews: c.reviews.map((x) =>
                    x.id === r.id ? { ...x, visible: v } : x,
                  ),
                }),
              )}
              <button
                onClick={() =>
                  config({ reviews: c.reviews.filter((x) => x.id !== r.id) })
                }
              >
                Delete story
              </button>
            </fieldset>
          ))}
          <button
            onClick={() =>
              config({
                reviews: [
                  ...c.reviews,
                  {
                    id: crypto.randomUUID(),
                    name: "Demo customer",
                    service: "Men's Haircut",
                    text: "A considered cut and a confident finish.",
                    visible: true,
                    isDemo: true,
                  },
                ],
              })
            }
          >
            Add demo review
          </button>
        </>
      )}
      {tab === "Offers" && (
        <>
          <h3>Promotions & coupons</h3>
          <p>
            Demo offers cannot be redeemed until explicitly approved.
            Activation, validity and eligible services are rechecked on the
            server.
          </p>
          {c.offers.map((o) => (
            <fieldset key={o.id}>
              <legend>{o.title}</legend>
              {text("Title", o.title, (v) =>
                config({
                  offers: c.offers.map((x) =>
                    x.id === o.id ? { ...x, title: v } : x,
                  ),
                }),
              )}
              {text("Coupon code", o.code, (v) =>
                config({
                  offers: c.offers.map((x) =>
                    x.id === o.id ? { ...x, code: v.toUpperCase() } : x,
                  ),
                }),
              )}
              <label>
                Discount type
                <select
                  value={o.type}
                  onChange={(e) =>
                    config({
                      offers: c.offers.map((x) =>
                        x.id === o.id
                          ? { ...x, type: e.target.value as "percent" | "flat" }
                          : x,
                      ),
                    })
                  }
                >
                  <option value="percent">Percentage</option>
                  <option value="flat">Flat ₹</option>
                </select>
              </label>
              {text(
                "Discount value",
                String(o.discount),
                (v) =>
                  config({
                    offers: c.offers.map((x) =>
                      x.id === o.id ? { ...x, discount: Number(v) } : x,
                    ),
                  }),
                "number",
              )}
              <div className="kk-edit-grid">
                {text(
                  "Valid from",
                  o.from,
                  (v) =>
                    config({
                      offers: c.offers.map((x) =>
                        x.id === o.id ? { ...x, from: v } : x,
                      ),
                    }),
                  "date",
                )}
                {text(
                  "Valid to",
                  o.to,
                  (v) =>
                    config({
                      offers: c.offers.map((x) =>
                        x.id === o.id ? { ...x, to: v } : x,
                      ),
                    }),
                  "date",
                )}
              </div>
              {check("Active", o.active, (v) =>
                config({
                  offers: c.offers.map((x) =>
                    x.id === o.id ? { ...x, active: v } : x,
                  ),
                }),
              )}
              {check("Admin approval: allow real redemption", o.approved, (v) =>
                config({
                  offers: c.offers.map((x) =>
                    x.id === o.id ? { ...x, approved: v, isDemo: !v } : x,
                  ),
                }),
              )}
              <h4>Eligible services</h4>
              <div className="kk-checks">
                {ownServices.map((s) => (
                  <React.Fragment key={s.id}>
                    {check(s.name, o.serviceIds.includes(s.id), (v) =>
                      config({
                        offers: c.offers.map((x) =>
                          x.id === o.id
                            ? {
                                ...x,
                                serviceIds: v
                                  ? [...x.serviceIds, s.id]
                                  : x.serviceIds.filter((id) => id !== s.id),
                              }
                            : x,
                        ),
                      }),
                    )}
                  </React.Fragment>
                ))}
              </div>
              <button
                onClick={() => {
                  if (window.confirm("Delete this offer?"))
                    config({ offers: c.offers.filter((x) => x.id !== o.id) });
                }}
              >
                Delete offer
              </button>
            </fieldset>
          ))}
          <button
            onClick={() =>
              config({
                offers: [
                  ...c.offers,
                  {
                    id: crypto.randomUUID(),
                    title: "New Offer",
                    code: "",
                    type: "percent",
                    discount: 10,
                    serviceIds: [],
                    active: false,
                    approved: false,
                    isDemo: true,
                    from: "",
                    to: "",
                  },
                ],
              })
            }
          >
            Add New Offer
          </button>
        </>
      )}
      {tab === "Rewards" && (
        <>
          <h3>Style rewards</h3>
          {text("Program name", c.loyaltyName, (v) =>
            config({ loyaltyName: v }),
          )}
          {check("Enable loyalty program", loyalty.programEnabled, (v) =>
            setDraft((d) => ({
              ...d,
              loyaltyConfig: { ...loyalty, programEnabled: v },
            })),
          )}
          {text(
            "Points per ₹100",
            String(loyalty.pointsPerHundredSpent),
            (v) =>
              setDraft((d) => ({
                ...d,
                loyaltyConfig: {
                  ...loyalty,
                  pointsPerHundredSpent: Math.max(0, Number(v)),
                },
              })),
            "number",
          )}
          {loyalty.rewards.map((r) => (
            <fieldset key={r.id}>
              {text("Reward title", r.title, (v) =>
                setDraft((d) => ({
                  ...d,
                  loyaltyConfig: {
                    ...loyalty,
                    rewards: loyalty.rewards.map((x) =>
                      x.id === r.id ? { ...x, title: v } : x,
                    ),
                  },
                })),
              )}
              {text(
                "Points needed",
                String(r.requiredPoints),
                (v) =>
                  setDraft((d) => ({
                    ...d,
                    loyaltyConfig: {
                      ...loyalty,
                      rewards: loyalty.rewards.map((x) =>
                        x.id === r.id ? { ...x, requiredPoints: Number(v) } : x,
                      ),
                    },
                  })),
                "number",
              )}
              {text(
                "Discount ₹",
                String(r.discountValue),
                (v) =>
                  setDraft((d) => ({
                    ...d,
                    loyaltyConfig: {
                      ...loyalty,
                      rewards: loyalty.rewards.map((x) =>
                        x.id === r.id ? { ...x, discountValue: Number(v) } : x,
                      ),
                    },
                  })),
                "number",
              )}
              {check("Active", r.isActive, (v) =>
                setDraft((d) => ({
                  ...d,
                  loyaltyConfig: {
                    ...loyalty,
                    rewards: loyalty.rewards.map((x) =>
                      x.id === r.id ? { ...x, isActive: v } : x,
                    ),
                  },
                })),
              )}
            </fieldset>
          ))}
          <p>
            Only eligible completed, paid bookings count, once each. Cancelled
            or unpaid bookings do not earn points.
          </p>
        </>
      )}
      {tab === "Booking" && (
        <>
          <h3>Salon hours, holidays, breaks & leave</h3>
          {c.hours.map((h, i) => (
            <fieldset key={h.day}>
              <legend>{h.day}</legend>
              {check("Open", h.enabled, (v) =>
                config({
                  hours: c.hours.map((x, j) =>
                    i === j ? { ...x, enabled: v } : x,
                  ),
                }),
              )}
              <div className="kk-edit-grid">
                {text(
                  "From",
                  h.fromTime,
                  (v) =>
                    config({
                      hours: c.hours.map((x, j) =>
                        i === j ? { ...x, fromTime: v } : x,
                      ),
                    }),
                  "time",
                )}
                {text(
                  "To",
                  h.toTime,
                  (v) =>
                    config({
                      hours: c.hours.map((x, j) =>
                        i === j ? { ...x, toTime: v } : x,
                      ),
                    }),
                  "time",
                )}
              </div>
            </fieldset>
          ))}
          {text(
            "Holiday dates (one YYYY-MM-DD date per line)",
            c.holidays.join("\n"),
            (v) => config({ holidays: v.split("\n").filter(Boolean) }),
            "textarea",
          )}
          <h3>Daily barber breaks</h3>
          {c.breaks.map((b, i) => (
            <fieldset key={i}>
              <label>
                Barber
                <select
                  value={b.staffId}
                  onChange={(e) =>
                    config({
                      breaks: c.breaks.map((x, j) =>
                        i === j ? { ...x, staffId: e.target.value } : x,
                      ),
                    })
                  }
                >
                  {draft.stylists
                    .filter((s) => s.businessType === MENS_TEMPLATE_ID)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </label>
              {text(
                "From",
                b.fromTime,
                (v) =>
                  config({
                    breaks: c.breaks.map((x, j) =>
                      i === j ? { ...x, fromTime: v } : x,
                    ),
                  }),
                "time",
              )}
              {text(
                "To",
                b.toTime,
                (v) =>
                  config({
                    breaks: c.breaks.map((x, j) =>
                      i === j ? { ...x, toTime: v } : x,
                    ),
                  }),
                "time",
              )}
              <button
                onClick={() =>
                  config({ breaks: c.breaks.filter((_, j) => i !== j) })
                }
              >
                Delete break
              </button>
            </fieldset>
          ))}
          <button
            onClick={() =>
              config({
                breaks: [
                  ...c.breaks,
                  {
                    staffId:
                      draft.stylists.find(
                        (s) => s.businessType === MENS_TEMPLATE_ID,
                      )?.id || "",
                    fromTime: "13:00",
                    toTime: "14:00",
                  },
                ],
              })
            }
          >
            Add break
          </button>
          <h3>Barber leave</h3>
          {c.leave.map((l, i) => (
            <fieldset key={i}>
              <label>
                Barber
                <select
                  value={l.staffId}
                  onChange={(e) =>
                    config({
                      leave: c.leave.map((x, j) =>
                        i === j ? { ...x, staffId: e.target.value } : x,
                      ),
                    })
                  }
                >
                  {draft.stylists
                    .filter((s) => s.businessType === MENS_TEMPLATE_ID)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </label>
              {text(
                "From date",
                l.from,
                (v) =>
                  config({
                    leave: c.leave.map((x, j) =>
                      i === j ? { ...x, from: v } : x,
                    ),
                  }),
                "date",
              )}
              {text(
                "To date",
                l.to,
                (v) =>
                  config({
                    leave: c.leave.map((x, j) =>
                      i === j ? { ...x, to: v } : x,
                    ),
                  }),
                "date",
              )}
              <button
                onClick={() =>
                  config({ leave: c.leave.filter((_, j) => i !== j) })
                }
              >
                Delete leave
              </button>
            </fieldset>
          ))}
          <button
            onClick={() =>
              config({
                leave: [
                  ...c.leave,
                  {
                    staffId:
                      draft.stylists.find(
                        (s) => s.businessType === MENS_TEMPLATE_ID,
                      )?.id || "",
                    from: "",
                    to: "",
                  },
                ],
              })
            }
          >
            Add leave
          </button>
          <p>
            Advance notice is controlled by the existing dashboard booking
            settings. Real slots are always loaded from Supabase, never
            generated in the browser.
          </p>
        </>
      )}
      {tab === "Contact" && (
        <>
          {(
            [
              "address",
              "city",
              "postalCode",
              "phone",
              "whatsapp",
              "email",
              "instagramHandle",
            ] as const
          ).map((k) => (
            <React.Fragment key={k}>
              {text(k, draft.profile[k] || "", (v) => profile(k, v))}
            </React.Fragment>
          ))}
        </>
      )}
      {error && (
        <p role="alert" className="kk-warning">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      <div className="kk-edit-actions">
        <button disabled={busy} onClick={() => void save()}>
          {busy ? "Saving / uploading…" : "Save to workspace"}
        </button>
        <button disabled={busy} onClick={onClose}>
          Close / preview
        </button>
      </div>
    </section>
  );
}
