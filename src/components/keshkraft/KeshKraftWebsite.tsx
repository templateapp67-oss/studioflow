import {
  MensLiveChat,
  MensPortfolio,
  MensStylistChat,
  MensBookingSection,
  MensWaitlistMonitor,
} from "./KeshKraftInteractions";
import type { DirectBookingSlot } from "../SpecialistWeek";
import { ServiceMerchTags, ServiceTerms } from '../ServiceMerchandising';
import React, { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Scissors,
  Menu,
  X,
  Clock3,
  MapPin,
  Check,
  Star,
  Play,
  ArrowRight,
} from "lucide-react";
import type { SalonWebsitePreviewProps } from "../SalonWebsitePreview";
import type { SalonService, Stylist } from "../../types";
import {
  mensConfig,
  mensServices,
  mensStaff,
  mensImage,
  mensMediaVisible,
  mensPublicOffers,
  MENS_CATEGORIES,
  MENS_HERO,
  MENS_HERO_MOBILE,
  MENS_INTERIOR,
  MENS_LOYALTY,
} from "../../lib/keshkraft";
import { BookingModal } from "../BookingModal";
import { SalonBookingsDialog } from "../SalonBookingsDialog";
import { supabase } from "../../lib/supabase";
import "./keshkraft.css";
const inr = (n: number) => `₹${Number(n).toLocaleString("en-IN")}`;
export function MensImage({
  src,
  alt,
  config,
  eager = false,
  width,
  height,
  className,
}: {
  src?: string;
  alt: string;
  config: ReturnType<typeof mensConfig>;
  eager?: boolean;
  width?: number;
  height?: number;
  className?: string;
}) {
  return (
    <img
      src={mensImage(src, config)}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = "/templates/15/placeholder.svg";
      }}
    />
  );
}
export function KeshKraftWebsite(props: SalonWebsitePreviewProps) {
  const { profile } = props,
    c = mensConfig(profile),
    services = mensServices(props.services).map((s) => ({
      ...s,
      imageUrl: mensImage(s.imageUrl, c),
    })),
    team = mensStaff(props.stylists, c).map((s) => ({
      ...s,
      avatarUrl: mensImage(s.avatarUrl, c),
    }));
  const [category, setCategory] = useState<string>(MENS_CATEGORIES[0]),
    [search, setSearch] = useState(""),
    [menu, setMenu] = useState(false),
    [showAll, setShowAll] = useState(false);
  const [booking, setBooking] = useState(false),
    [service, setService] = useState<SalonService>(),
    [barber, setBarber] = useState<Stylist>(),
    [coupon, setCoupon] = useState(""),
    [history, setHistory] = useState(false),
    [notice, setNotice] = useState("");
  const [photo, setPhoto] = useState<{ url: string; title: string } | null>(
      null,
    ),
    [video, setVideo] = useState<string | null>(null);
  const [portfolio, setPortfolio] = useState<Stylist | null>(null);
  const [stylistChat, setStylistChat] = useState<Stylist | null>(null);
  const [initialSlot, setInitialSlot] = useState<
    DirectBookingSlot | undefined
  >();
  const [actualReviews, setActualReviews] = useState<
    { id: string; name: string; serviceName: string; comment: string }[]
  >([]);
  const live = Boolean(props.live && profile.subdomain);
  const account = () => {
    if (props.onCustomerAccount) props.onCustomerAccount("signin");
    else
      setNotice(
        "Customer accounts are enabled on the published studio. This preview does not create an account.",
      );
  };
  const [rewardState, setRewardState] = useState<any>(null),
    [rewardsBusy, setRewardsBusy] = useState(false);
  const rewards = async (reward?: string) => {
    if (!props.customerSignedIn) {
      account();
      return;
    }
    setRewardsBusy(true);
    try {
      const { data, error } = await supabase.rpc("studioflow_mens_rewards", {
        p_slug: profile.subdomain,
        p_reward: reward || null,
        p_request: reward ? crypto.randomUUID() : null,
      });
      if (error) throw error;
      setRewardState(data);
    } catch (e) {
      setNotice((e as any)?.message || "Rewards could not load. Try again.");
    } finally {
      setRewardsBusy(false);
    }
  };
  useEffect(() => {
    if (!live) return;
    let active = true;
    void supabase
      .rpc("studioflow_list_reviews", { p_slug: profile.subdomain })
      .then(({ data, error }) => {
        if (!active || error) return;
        const names = new Set(services.map((s) => s.name));
        setActualReviews(
          (data?.reviews || []).filter(
            (r: any) =>
              names.has(r.serviceName) &&
              !/women|woman|female|kids?|bridal|makeup|beard|shav|facial|spa/i.test(
                r.comment,
              ),
          ),
        );
      });
    return () => {
      active = false;
    };
  }, [live, profile.subdomain, props.services]);
  useEffect(() => {
    if (!photo && !video) return;
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPhoto(null);
        setVideo(null);
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [photo, video]);
  const book = (
    s?: SalonService,
    person?: Stylist,
    code = "",
    slot?: DirectBookingSlot,
  ) => {
    setInitialSlot(slot);
    setService(s || services[0]);
    setBarber(person);
    setCoupon(code);
    if (!services.length) {
      setNotice(
        "The studio is updating its menu. Please contact the studio before booking.",
      );
      return;
    }
    if (!live) {
      setNotice(
        "This is a demo preview. Live dates, available times and booking confirmation are enabled after the owner approves and publishes the studio. No appointment has been saved.",
      );
      return;
    }
    setBooking(true);
  };
  const jump = (cat: string) => {
    setCategory(cat);
    setShowAll(false);
    props.previewDocument
      ?.getElementById("kk-services")
      ?.scrollIntoView({ behavior: "smooth" });
    if (!props.previewDocument)
      document
        .getElementById("kk-services")
        ?.scrollIntoView({ behavior: "smooth" });
  };
  const shown = services.filter(
    (s) =>
      s.category === category &&
      `${s.name} ${s.description}`.toLowerCase().includes(search.toLowerCase()),
  );
  const show = (id: string) => !c.hiddenSections.includes(id),
    gallery = c.gallery.filter(mensMediaVisible),
    offers = mensPublicOffers(c, live),
    loyalty = props.loyaltyConfig || MENS_LOYALTY;
  const nav = [
    ["Services", "kk-services"],
    ["Our barbers", "kk-team"],
    ["Videos", "kk-videos"],
    ["Book / Waitlist", "kk-booking"],
    ["The lookbook", "kk-gallery"],
    ["Offers", "kk-offers"],
    ["Visit us", "kk-contact"],
  ].filter(([, id]) => show(id.replace("kk-", "")));
  return (
    <div
      className="kk-site"
      style={
        {
          "--kk-bronze": /^#[0-9a-f]{6}$/i.test(c.bronze)
            ? c.bronze
            : "#b08a61",
          "--kk-olive": /^#[0-9a-f]{6}$/i.test(c.olive) ? c.olive : "#353d2c",
          "--kk-bg": /^#[0-9a-f]{6}$/i.test(c.background)
            ? c.background
            : "#161817",
          fontFamily: c.font,
        } as React.CSSProperties
      }
    >
      <a className="kk-skip" href="#kk-main">
        Skip to content
      </a>
      <div className="kk-topline">
        <span>MEN'S HAIRCUTS & HAIR COLOUR. NOTHING ELSE.</span>
        <span>{live ? profile.city : "UDAIPUR · TEMPLATE 15 PREVIEW"}</span>
      </div>
      <header className="kk-header">
        <a className="kk-brand" href="#kk-main">
          {c.logo ? (
            <MensImage src={c.logo} alt="Studio logo" config={c} />
          ) : (
            <span className="kk-mark">
              <Scissors size={27} />
            </span>
          )}
          <span>
            <strong>
              {profile.businessName || "KeshKraft Men's Hair Studio"}
            </strong>
            <small>PRECISION. CHARACTER. CRAFT. · NEXORA</small>
          </span>
        </a>
        <nav aria-label="Main navigation" className={menu ? "is-open" : ""}>
          {nav.map(([label, id]) => (
            <a key={id} href={`#${id}`} onClick={() => setMenu(false)}>
              {label}
            </a>
          ))}
          <button aria-label="Manage your customer account" onClick={account}>
            {props.customerSignedIn
              ? props.customerName || "My account"
              : "My account"}
          </button>
          <button className="kk-btn" onClick={() => book()}>
            Book a chair <ArrowUpRight size={16} />
          </button>
        </nav>
        <button
          className="kk-menu"
          aria-label={menu ? "Close menu" : "Open menu"}
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
        >
          {menu ? <X /> : <Menu />}
        </button>
      </header>
      <main id="kk-main">
        <section className="kk-hero">
          <div className="kk-hero-copy">
            <p className="kk-eyebrow">
              <span /> THE MEN'S HAIR STUDIO
            </p>
            <h1>{c.heroHeading}</h1>
            <p>{c.heroDescription}</p>
            <div className="kk-actions">
              <button className="kk-btn" onClick={() => book()}>
                {c.haircutButton}
                <ArrowUpRight size={18} />
              </button>
              <button
                className="kk-link"
                onClick={() => jump(MENS_CATEGORIES[0])}
              >
                {c.stylesButton}
                <ArrowRight size={17} />
              </button>
            </div>
            <button
              className="kk-colour-link"
              onClick={() => jump(MENS_CATEGORIES[1])}
            >
              {c.colourButton} <ArrowUpRight size={17} />
            </button>
            <div className="kk-hero-notes">
              <span>
                <Check size={15} /> Men-only expertise
              </span>
              <span>
                <Check size={15} /> Your style, considered
              </span>
            </div>
          </div>
          <div className="kk-hero-image">
            {profile.coverImageUrl ? (
              <MensImage
                src={profile.coverImageUrl}
                alt="Men's studio hero photograph"
                config={c}
                eager
              />
            ) : (
              <picture>
                <source media="(max-width: 640px)" srcSet={MENS_HERO_MOBILE} />
                <img
                  src={MENS_HERO}
                  alt="Adult male customer receiving a precision haircut from a male barber"
                  width={1376}
                  height={768}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                />
              </picture>
            )}
            <span className="kk-photo-label">THE ART IS IN THE DETAIL.</span>
            <div className="kk-image-caption">
              <Scissors />
              <span>
                A little sharper.
                <br />
                <b>A lot more you.</b>
              </span>
              <span className="kk-round">15</span>
            </div>
          </div>
        </section>
        <div className="kk-marquee">
          <span>PRECISION CUTS</span>
          <i>✦</i>
          <span>CONSIDERED COLOUR</span>
          <i>✦</i>
          <span>INDIVIDUAL STYLE</span>
          <i>✦</i>
          <span>MEN ONLY</span>
          <i>✦</i>
        </div>
        {show("about") && (
          <section className="kk-about" aria-labelledby="kk-about-title">
            <div className="kk-about-photo">
              <MensImage
                src={MENS_INTERIOR}
                alt="Warmly lit modern Indian men's haircut studio with barber chairs and mirrors"
                width={1376}
                height={768}
                config={c}
              />
            </div>
            <div className="kk-about-copy">
              <p className="kk-eyebrow">MADE FOR MEN. BUILT AROUND YOUR STYLE.</p>
              <h2 id="kk-about-title">A good cut starts with <em>good craft.</em></h2>
              <p>A considered space for precise men's haircuts and colour. Talk through the look you want, get thoughtful advice, and leave with a finish that feels like you.</p>
              <span className="kk-about-note">MEN'S HAIRCUTS · MEN'S HAIR COLOUR · NOTHING ELSE</span>
            </div>
          </section>
        )}
        {notice && (
          <div role="status" className="kk-notice">
            {notice}
            <button aria-label="Dismiss notice" onClick={() => setNotice("")}>
              <X size={20} />
            </button>
          </div>
        )}
        {show("services") && (
          <section id="kk-services" className="kk-section">
            <div className="kk-section-head">
              <div>
                <p className="kk-eyebrow">01 / THE MENU</p>
                <h2>
                  Good hair.
                  <br />
                  <em>Great first impressions.</em>
                </h2>
              </div>
              <p>
                From your everyday signature to a completely new direction.
                Expert hands, thoughtful details, transparent prices.
                <small>
                  {live
                    ? "Studio menu · INR"
                    : "Demo prices · INR · Confirm with the studio"}
                </small>
              </p>
            </div>
            <div className="kk-filters">
              <div role="group" aria-label="Service category">
                {MENS_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    aria-pressed={category === cat}
                    onClick={() => {
                      setCategory(cat);
                      setShowAll(false);
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <input
                aria-label="Search men's services"
                value={search}
                placeholder="Find your next look…"
                onChange={(e) => {
                  setSearch(e.target.value);
                  setShowAll(true);
                }}
              />
            </div>
            <div className="kk-service-grid">
              {(showAll ? shown : shown.slice(0, 4)).map((s, i) => (
                <article key={s.id} className="kk-service">
                  <div className="kk-service-image">
                    <MensImage
                      src={s.imageUrl}
                      alt={`${s.name} — male style reference`}
                      config={c}
                    />
                    <span>{String(i + 1).padStart(2, "0")} / MEN'S STUDIO</span>
                  </div>
                  <div className="kk-service-body">
                    <h3>{s.name}</h3>
                    <p>{s.description}</p>
                    <ServiceMerchTags service={s} className="sf-merch-inline" />
                    <ServiceTerms service={s} className="sf-merch-inline" />
                    <div className="kk-service-meta">
                      <b>{inr(s.price)}</b>
                      <span>
                        <Clock3 size={13} />
                        {s.durationMinutes} min
                      </span>
                    </div>
                    <button className="kk-book-link" onClick={() => book(s)}>
                      Book Now <ArrowUpRight size={17} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
            {!shown.length && (
              <p className="kk-empty">
                No matching men's services. Try another search or category.
              </p>
            )}
            {shown.length > 4 && (
              <button
                className="kk-outline"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll
                  ? "Show highlights"
                  : `Explore all ${shown.length} ${category === MENS_CATEGORIES[0] ? "haircuts" : "colour services"}`}
                <ArrowRight size={17} />
              </button>
            )}
            <p className="kk-small">
              Each haircut card has its own generated style photograph. Colour
              images are illustrative demo references until individual shade
              photos are added; your final colour is tailored in person.
            </p>
          </section>
        )}
        <section className="kk-manifesto">
          <p className="kk-eyebrow">
            NOT A PARLOUR. YOUR PERSONAL STYLE STUDIO.
          </p>
          <h2>
            A sharp cut is a detail.
            <br />
            How it makes you feel?
            <br />
            <em>That's the difference.</em>
          </h2>
          <p>
            We focus on two things, and doing them exceptionally well: men's
            haircuts and men's hair colour. A considered conversation. A
            confident finish. A look that feels like you.
          </p>
        </section>
        {show("team") && (
          <section id="kk-team" className="kk-section">
            <div className="kk-section-head">
              <div>
                <p className="kk-eyebrow">02 / THE CRAFTSMEN</p>
                <h2>
                  Your hair. <em>Expert hands.</em>
                </h2>
              </div>
              <p>
                Choose your barber, or let us match you with an available hair
                expert.
                {!live && <small>Demo staff portraits · Replace with actual team photos</small>}
              </p>
            </div>
            <div className="kk-team-grid">
              {team.map((person) => (
                <article className="kk-team-card h-80 w-full aspect-[3/4] overflow-hidden" key={person.id}>
                  <MensImage
                    src={person.avatarUrl}
                    alt={`${person.name}, male barber portrait`}
                    width={896}
                    height={1200}
                    className="w-full h-full object-cover"
                    config={c}
                  />
                  <div>
                    <span className="kk-eyebrow">{person.role}</span>
                    <h3>{person.name}</h3>
                    <p>{person.experienceYears || 0} years of experience</p>
                    <p>{person.specialties.join(" · ")}</p>
                    <span className="kk-status">
                      {person.status || "Available"}
                    </span>
                    <div className="kk-barber-actions">
                      <button
                        className="kk-outline"
                        onClick={() => setPortfolio(person)}
                      >
                        View Portfolio
                      </button>
                      <button
                        className="kk-outline"
                        onClick={() => setStylistChat(person)}
                      >
                        Chat with Stylist
                      </button>
                    </div>
                    <button
                      className="kk-book-link"
                      disabled={
                        person.status === "On Leave" || person.status === "Busy"
                      }
                      onClick={() => book(undefined, person)}
                    >
                      Select barber <ArrowUpRight size={16} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
            {!team.length && (
              <p className="kk-empty">
                The studio is updating its barber profiles. Contact us for
                assistance.
              </p>
            )}
            <button className="kk-outline" onClick={() => book()}>
              Any Available Barber <ArrowRight size={17} />
            </button>
          </section>
        )}
        {show("gallery") && (
          <section id="kk-gallery" className="kk-section kk-light">
            <div className="kk-section-head">
              <div>
                <p className="kk-eyebrow">03 / THE LOOKBOOK</p>
                <h2>
                  Find your <em>next look.</em>
                </h2>
              </div>
              <p>
                Men's cuts. Men's colour. Inspiration for your next visit.
                Illustrations are labelled until the studio approves its own
                individual photos.
              </p>
            </div>
            <div className="kk-gallery">
              {gallery.map((g) => (
                <button
                  key={g.id}
                  onClick={() =>
                    setPhoto({ url: mensImage(g.url, c), title: g.title })
                  }
                >
                  <MensImage src={g.url} alt={g.title} config={c} />
                  <span>
                    {g.title}
                    <ArrowUpRight size={18} />
                  </span>
                </button>
              ))}
            </div>
            {!gallery.length && (
              <p className="kk-empty">
                New men's style photographs are being reviewed.
              </p>
            )}
          </section>
        )}
        {show("videos") && (
          <section id="kk-videos" className="kk-section">
            <div className="kk-section-head">
              <div>
                <p className="kk-eyebrow">04 / IN THE CHAIR</p>
                <h2>
                  The craft. <em>In motion.</em>
                </h2>
              </div>
              <p>
                Explore male-only hairstyle and colour videos. Starter clips are
                silent animated AI-photo references—not actual haircut-process
                footage.
              </p>
            </div>
            <div className="kk-video-grid">
              {c.videos
                .filter((v) => v.visible)
                .map((v) => (
                  <article key={v.id} className="kk-video-card">
                    <div className="kk-video-poster">
                      {mensMediaVisible(v) ? (
                        <>
                          <MensImage
                            src={v.thumbnail}
                            alt={`${v.title} thumbnail`}
                            config={c}
                          />
                          <button
                            aria-label={`Play ${v.title}`}
                            onClick={() => setVideo(v.url)}
                          >
                            <Play />
                          </button>
                        </>
                      ) : (
                        <>
                          <Scissors size={32} />
                          <span>MEN'S STUDIO FILM</span>
                        </>
                      )}
                    </div>
                    <h3>{v.title}</h3>
                    <p>
                      {mensMediaVisible(v)
                        ? v.isAnimatedReference
                          ? "Animated AI-photo reference · 5 seconds · No process footage"
                          : "Male-only content reviewed by the studio"
                        : "Coming soon · Awaiting a verified male-only studio video"}
                    </p>
                  </article>
                ))}
            </div>
          </section>
        )}
        {show("reviews") && (
          <section id="kk-reviews" className="kk-section kk-review-section">
            <p className="kk-eyebrow">05 / WORD IN THE CHAIR</p>
            <h2>
              Good hair. <em>Happy men.</em>
            </h2>
            <div className="kk-review-grid">
              {[
                ...c.reviews
                  .filter((r) => r.visible)
                  .map((r) => ({
                    ...r,
                    serviceName: r.service,
                    comment: r.text,
                  })),
                ...actualReviews.map((r) => ({ ...r, isDemo: false })),
              ].map((r) => (
                <article key={r.id}>
                  <span className="kk-stars" aria-label="5 out of 5 stars">
                    ★★★★★
                  </span>
                  <blockquote>“{r.comment}”</blockquote>
                  <b>{r.name}</b>
                  <p>{r.serviceName}</p>
                  <small>
                    {r.isDemo
                      ? "DEMO REVIEW · ILLUSTRATIVE CUSTOMER STORY"
                      : "CUSTOMER REVIEW"}
                  </small>
                </article>
              ))}
            </div>
            <p className="kk-small">
              Demo stories are not verified salon reviews. Sign in to manage
              your bookings and reviews.
            </p>
            <button className="kk-outline" onClick={account}>
              Customer account <ArrowRight size={16} />
            </button>
          </section>
        )}
        {show("offers") && (
          <section id="kk-offers" className="kk-section">
            <div className="kk-section-head">
              <div>
                <p className="kk-eyebrow">06 / A FRESH START</p>
                <h2>
                  A new look. <em>A little extra.</em>
                </h2>
              </div>
              <p>
                Only eligible men's haircuts and men's hair colour. One offer
                per booking; eligibility and validity are checked at checkout.
              </p>
            </div>
            <div className="kk-offer-grid">
              {offers.map((o) => (
                <article key={o.id}>
                  <small>
                    {o.isDemo
                      ? "DEMO OFFER · ADMIN APPROVAL REQUIRED"
                      : "STUDIO OFFER"}
                  </small>
                  <h3>{o.title}</h3>
                  <strong>
                    {o.type === "flat" ? inr(o.discount) : `${o.discount}%`}{" "}
                    <span>OFF</span>
                  </strong>
                  <code>{o.code}</code>
                  <p>
                    {services
                      .filter((s) => o.serviceIds.includes(s.id))
                      .map((s) => s.name)
                      .join(" · ")}
                  </p>
                  {o.from && (
                    <p>
                      {o.from} — {o.to || "Until withdrawn"}
                    </p>
                  )}
                  <button
                    className="kk-book-link"
                    onClick={() => {
                      if (!o.approved) {
                        setNotice(
                          "Demo Offer: this coupon needs salon admin approval before it can be used.",
                        );
                        return;
                      }
                      book(
                        services.find((s) => o.serviceIds.includes(s.id)),
                        undefined,
                        o.code,
                      );
                    }}
                  >
                    View eligibility & book <ArrowUpRight size={16} />
                  </button>
                </article>
              ))}
            </div>
            {!offers.length && (
              <p className="kk-empty">
                No active offers right now. Check back for your next fresh look.
              </p>
            )}
          </section>
        )}
        {show("loyalty") && (
          <section id="kk-loyalty" className="kk-loyalty">
            <div>
              <p className="kk-eyebrow">07 / STYLE THAT GIVES BACK</p>
              <h2>{c.loyaltyName}</h2>
              <p>
                {live
                  ? "Studio rewards"
                  : "Demo loyalty program · Editable by the studio"}
              </p>
              <p>
                Earn {loyalty.pointsPerHundredSpent} point
                {loyalty.pointsPerHundredSpent === 1 ? "" : "s"} for every ₹100
                of eligible completed and paid haircut or colour bookings.
              </p>
              <small>
                Cancelled or unpaid bookings earn no points. Each booking is
                credited once.
              </small>
            </div>
            <div>
              {loyalty.rewards
                .filter((r) => r.isActive)
                .map((r) => (
                  <article key={r.id}>
                    <span>{r.requiredPoints} POINTS</span>
                    <strong>{inr(r.discountValue)}</strong>
                    <p>off your next eligible visit</p>
                  </article>
                ))}
              <button
                className="kk-btn"
                disabled={rewardsBusy}
                onClick={() =>
                  live
                    ? void rewards()
                    : setNotice(
                        "Demo rewards: live point balances are available after publication and customer sign-in.",
                      )
                }
              >
                My rewards <ArrowUpRight size={17} />
              </button>
              {rewardState && (
                <div role="status">
                  <p>{rewardState.balance} available points</p>
                  {loyalty.rewards
                    .filter((r) => r.isActive)
                    .map((r) => (
                      <button
                        key={r.id}
                        className="kk-outline"
                        disabled={
                          rewardsBusy || rewardState.balance < r.requiredPoints
                        }
                        onClick={() => void rewards(r.id)}
                      >
                        Redeem {r.requiredPoints} points ·{" "}
                        {inr(r.discountValue)}
                      </button>
                    ))}
                  {(rewardState.claims || []).map((v: any) => (
                    <p key={v.id}>
                      {v.reward_title}: <code>{v.coupon_code}</code> ·{" "}
                      {v.status}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
        {show("booking") && (
          <MensBookingSection
            profile={profile}
            services={services}
            team={team}
            live={live}
            onBook={(s, person, slot) => book(s, person, "", slot)}
          />
        )}
        <MensWaitlistMonitor
          live={live}
          slug={profile.subdomain}
          onOpening={(entry, slot) => {
            const selected = services.find((s) => s.id === entry.serviceId);
            if (selected)
              book(
                selected,
                team.find((s) => s.id === entry.stylistId),
                "",
                slot,
              );
          }}
        />
        {show("contact") && (
          <section id="kk-contact" className="kk-section kk-contact">
            <div>
              <p className="kk-eyebrow">08 / YOUR CHAIR IS WAITING</p>
              <h2>
                Come in.
                <br />
                <em>Step out sharper.</em>
              </h2>
              <button className="kk-btn" onClick={() => book()}>
                Book your appointment <ArrowUpRight size={17} />
              </button>
              <button
                className="kk-link"
                onClick={() =>
                  live
                    ? setHistory(true)
                    : setNotice(
                        "Booking history is available in your customer account on the published studio website.",
                      )
                }
              >
                My bookings
              </button>
            </div>
            <div>
              <h3>
                <MapPin size={18} /> Find the studio
              </h3>
              <p>{profile.address}</p>
              <p>
                {profile.city} {profile.postalCode}
              </p>
              <h3>Opening hours</h3>
              {c.hours.map((h) => (
                <p key={h.day} className="kk-hour">
                  <span>{h.day}</span>
                  <span>
                    {h.enabled ? `${h.fromTime} – ${h.toTime}` : "Closed"}
                  </span>
                </p>
              ))}
              {profile.phone && (
                <a href={`tel:${profile.phone.replace(/[^+\d]/g, "")}`}>
                  {profile.phone}
                </a>
              )}
              {profile.email && (
                <p>
                  <a href={`mailto:${profile.email}`}>{profile.email}</a>
                </p>
              )}
              {profile.instagramHandle && (
                <p>
                  <a
                    target="_blank"
                    rel="noreferrer"
                    href={`https://www.instagram.com/${profile.instagramHandle.replace(/^@/, "")}`}
                  >
                    Instagram <ArrowUpRight size={13} />
                  </a>
                </p>
              )}
            </div>
          </section>
        )}
      </main>
      <footer className="kk-footer">
        <span className="kk-footer-word">
          KESHKRAFT<span>®</span>
        </span>
        <div>
          <p>{c.footer}</p>
          <span>
            © {new Date().getFullYear()} {profile.businessName}
          </span>
          <span>MEN ONLY · INR ₹</span>
        </div>
      </footer>
      {booking && (
        <BookingModal
          isOpen
          onClose={() => setBooking(false)}
          profile={{ ...profile, bookingAddOnServiceIds: [], branches: [] }}
          services={services}
          stylists={team}
          initialSlot={initialSlot}
          initialService={service}
          initialStylist={barber}
          initialCouponCode={coupon}
          onAddAppointment={props.onAddAppointment}
          themeAccentHex="#b08a61"
        />
      )}
      <MensLiveChat />
      {portfolio && (
        <MensPortfolio
          person={portfolio}
          profile={profile}
          live={live}
          onClose={() => setPortfolio(null)}
          onBook={() => {
            const person = portfolio;
            setPortfolio(null);
            book(undefined, person);
          }}
        />
      )}
      {stylistChat && (
        <MensStylistChat
          person={stylistChat}
          profile={profile}
          live={live}
          onClose={() => setStylistChat(null)}
        />
      )}
      {history && (
        <SalonBookingsDialog
          profile={profile}
          onClose={() => setHistory(false)}
        />
      )}
      {(photo || video) && (
        <div
          className="kk-modal"
          role="dialog"
          aria-modal="true"
          aria-label={photo?.title || "Men’s studio video"}
          onClick={() => {
            setPhoto(null);
            setVideo(null);
          }}
        >
          <button
            autoFocus
            aria-label="Close media viewer"
            onClick={() => {
              setPhoto(null);
              setVideo(null);
            }}
          >
            <X />
          </button>
          {photo ? (
            <figure>
              <img src={photo.url} alt={photo.title} />
              <figcaption>{photo.title}</figcaption>
            </figure>
          ) : (
            <video
              src={video!}
              controls
              autoPlay
              playsInline
              onError={() => {
                setVideo(null);
                setNotice(
                  "This video could not load. Please retry or ask the studio for a replacement.",
                );
              }}
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </div>
  );
}
