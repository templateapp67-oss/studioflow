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
    mobileNav,
    reduced,
  } = useDermacure();
  if (!visible.header) return null;
  return (
    <>
      <header className={`dc-header ${scrolled || menu ? "is-scrolled" : ""}`}>
        <a
          className="dc-logo"
          href="#home"
          aria-label={`${profile.businessName} home`}
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
          {nav.map(([label, id]) => (
            <a key={id} href={`#${id}`}>
              {label}
            </a>
          ))}
          {canShowBookings && (
            <a
              href={`/?customer=1&return=${encodeURIComponent(profile.subdomain || "")}`}
              onClick={(e) => {
                e.preventDefault();
                onMyBookings();
              }}
            >
              My Bookings
            </a>
          )}
        </nav>
        <button
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
        <button className="dc-header-cta" onClick={booking}>
          {bookingLabel} <ArrowUpRight size={15} />
        </button>
        <button
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
      <AnimatePresence>
        {menu && (
          <motion.nav
            ref={mobileNav}
            id="dc-mobile-nav"
            className="dc-mobile-nav"
            aria-label="Mobile navigation"
            initial={reduced ? false : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -10 }}
            transition={reduced ? { duration: 0 } : undefined}
          >
            {nav.map(([label, id]) => (
              <a key={id} href={`#${id}`} onClick={() => setMenu(false)}>
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
