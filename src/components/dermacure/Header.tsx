import {clinicPhone} from "../../lib/dermacureContent";
import { EditorialImage } from "./EditorialImage";
import { useDermacure } from "./context";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, ArrowUpRight, Flower2, Menu, X } from "lucide-react";

export function Header({
  customerPhotoUrl,
  customerName,
}: {
  customerPhotoUrl?: string;
  customerName?: string;
}) {
  const {
    profile,
    search,
    setSearch,
    setServiceCategory,
    visible,
    canShowBookings,
    scrolled,
    nav,
    onMyBookings,
    onAccount,
    customerSignedIn,
    booking,
    bookingLabel,
    menuTrigger,
    menu,
    setMenu,
    activeSection,
    mobileNav,
    reduced,
    scrollTo,
  } = useDermacure();
  if (!visible.header) return null;
  const phone=clinicPhone(profile.phone);
  return (
    <>
      {phone && <div className="dc-contact-strip">Appointments: <a href={`tel:${phone}`}>{profile.phone}</a></div>}
      <header className={`dc-header ${scrolled || menu ? "is-scrolled" : ""}`}>
        <a
          className="dc-logo"
          href="#home"
          aria-label={`${profile.businessName} home`}
          onClick={(event) => {
            event.preventDefault();
            scrollTo("home");
          }}
        >
          {profile.logoUrl ? (
            <EditorialImage
              className="dc-logo-image"
              src={profile.logoUrl}
              alt=""
              fallback="/templates/dermacure/brand-mark.svg"
              fallbackAlt=""
            />
          ) : (
            <span className="dc-logo-mark">
              <Flower2 size={31} strokeWidth={1} />
            </span>
          )}
          <span>
            {profile.businessName.toLowerCase().includes("dermacure")
              ? "DERMACURE"
              : profile.businessName}
            <small> AESTHETIC DERMATOLOGY</small>
          </span>
        </a>
        <nav className="dc-desktop-nav" aria-label="Website navigation">
          {nav.filter(([, id]) => ["home", "skin-treatments", "hair-treatments", "cosmetology-treatments", "clinic-faq", "clinic-blog", "contact"].includes(id)).map(([label, id]) => (
            <a
              key={id}
              href={`#${id}`}
              className={activeSection === id ? "is-active" : undefined}
              aria-current={activeSection === id ? "location" : undefined}
              onClick={(event) => {
                event.preventDefault();
                scrollTo(id);
              }}
            >
              {label}
            </a>
          ))}
          {(canShowBookings || nav.some(([, id]) => !["home", "skin-treatments", "hair-treatments", "cosmetology-treatments", "clinic-faq", "clinic-blog", "contact"].includes(id))) && <details className="dc-nav-more"><summary>More</summary><div>{nav.filter(([, id]) => !["home", "skin-treatments", "hair-treatments", "cosmetology-treatments", "clinic-faq", "clinic-blog", "contact"].includes(id)).map(([label,id]) => <a key={id} href={`#${id}`} onClick={event => { event.preventDefault(); event.currentTarget?.closest?.('details')?.removeAttribute('open'); scrollTo(id); }}>{label}</a>)}{canShowBookings && <a href={`/?customer=1&return=${encodeURIComponent(profile.subdomain || "")}`} onClick={e=>{e.preventDefault();e.currentTarget?.closest?.('details')?.removeAttribute('open');onMyBookings();}}>My Bookings</a>}</div></details>}
        </nav>
        <button
          type="button"
          className="dc-account"
          onClick={onAccount}
          aria-label="Customer account"
        >
          {customerSignedIn && customerPhotoUrl && (
            <EditorialImage
              fallback="/templates/dermacure/brand-mark.svg"
              fallbackAlt="Customer account symbol"
              className="dc-account-photo"
              src={customerPhotoUrl}
              alt="Your profile"
            />
          )}
          {customerSignedIn
            ? `${customerName || "My account"} · Manage your customer account`
            : "Customer Login / Sign up"}
        </button>
        <button type="button" className="dc-header-cta" onClick={booking}>
          {bookingLabel} <ArrowUpRight size={15} />
        </button>
        <button
          type="button"
          ref={menuTrigger}
          className="dc-menu-toggle"
          aria-label={menu ? "Close menu" : "Open menu"}
          aria-expanded={menu}
          aria-controls="dc-mobile-nav"
          onClick={() => setMenu(!menu)}
        >
          {menu ? <X /> : <Menu />}
        </button>
      </header>
      {visible.services && <form className="dc-search dc-search-bar" role="search" onSubmit={e => { e.preventDefault(); scrollTo("directory"); }}><label htmlFor="dc-desktop-search">Find a treatment or concern</label><input id="dc-desktop-search" type="search" value={search} onChange={e => { setSearch(e.target.value); setServiceCategory("All"); }} placeholder="Search treatments, conditions or articles" /><button type="submit">Search</button></form>}
      <AnimatePresence>
        {menu && (
          <motion.div
            key="dc-nav-backdrop"
            className="dc-nav-backdrop"
            aria-hidden="true"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? undefined : { opacity: 0, pointerEvents: "none" }}
            transition={reduced ? { duration: 0 } : { duration: 0.18 }}
            onClick={() => setMenu(false)}
          />
        )}
        {menu && (
          <motion.nav
            ref={mobileNav}
            id="dc-mobile-nav"
            className="dc-mobile-nav"
            aria-label="Mobile navigation"
            initial={reduced ? false : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={
              reduced
                ? undefined
                : { opacity: 0, y: -10, pointerEvents: "none" }
            }
            transition={reduced ? { duration: 0 } : undefined}
          >
            {visible.services && <form className="dc-search dc-search-mobile" role="search" onSubmit={e => { e.preventDefault(); scrollTo("directory"); }}><label htmlFor="dc-mobile-search">Search treatments</label><input id="dc-mobile-search" type="search" value={search} onChange={e => { setSearch(e.target.value); setServiceCategory("All"); }} placeholder="Treatment or concern" /><button type="submit">Search</button></form>}
            {nav.map(([label, id]) => (
              <a
                key={id}
                href={`#${id}`}
                className={activeSection === id ? "is-active" : undefined}
                aria-current={activeSection === id ? "location" : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  scrollTo(id);
                }}
              >
                {label}
                <ArrowUpRight size={16} />
              </a>
            ))}
            {canShowBookings && (
              <a
                href={`/?customer=1&return=${encodeURIComponent(profile.subdomain || "")}`}
                onClick={(e) => {
                  e.preventDefault();
                  setMenu(false);
                  onMyBookings();
                }}
              >
                My Bookings <ArrowUpRight size={16} />
              </a>
            )}
            <button
              type="button"
              onClick={() => {
                setMenu(false);
                onAccount();
              }}
            >
              {customerSignedIn
                ? `${customerName || "My account"} · Manage your customer account`
                : "Customer Login / Sign up"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMenu(false);
                booking();
              }}
            >
              {bookingLabel} <ArrowRight size={16} />
            </button>
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  );
}
