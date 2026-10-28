import { useHairSpa } from "./context";
import { ArrowRight, ArrowUpRight, Leaf, Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

export function HairSpaHeader() {
  const model = useHairSpa();
  return (
    <>
      <header
        aria-label="Customer account and salon navigation"
        className={`kp-header${model.scrolled ? " is-scrolled" : ""}`}
      >
        <a
          className="kp-wordmark"
          href="#home"
          onClick={(event) => {
            event.preventDefault();
            model.scrollTo("home");
          }}
          aria-label="Kesh Prakriti home"
        >
          <span className="kp-mark">
            <Leaf size={19} />
          </span>
          <span>
            <strong>Kesh Prakriti</strong>
            <small>HAIR SPA · SCALP SANCTUARY</small>
          </span>
        </a>
        <nav className="kp-desktop-nav" aria-label="Website navigation">
          {model.pageLinks.map(([label, id]) => (
            <a
              key={id}
              href={`#${id}`}
              onClick={(event) => {
                event.preventDefault();
                model.scrollTo(id);
              }}
            >
              {label}
            </a>
          ))}
          <a
            href={`/?customer=1&return=${encodeURIComponent(model.profile.subdomain || "")}`}
            onClick={(event) => {
              event.preventDefault();
              model.onMyBookings();
            }}
          >
            My Bookings
          </a>
        </nav>
        <div className="kp-account-links">
          {model.customerSignedIn ? (
            <button
              className="kp-customer-account"
              aria-label="Manage your customer account"
              onClick={() => model.onAccount("signin")}
            >
              {model.customerPhotoUrl && (
                <img src={model.customerPhotoUrl} alt="" />
              )}
              <span>{model.customerName || "My profile & settings"}</span>
            </button>
          ) : (
            <>
              <button onClick={() => model.onAccount("signin")}>
                Customer Login
              </button>
              <button onClick={() => model.onAccount("signup")}>Sign up</button>
            </>
          )}
        </div>
        <button
          className="kp-button kp-header-cta"
          onClick={() => model.onBook(model.firstService)}
        >
          Book Your Ritual <ArrowUpRight size={15} />
        </button>
        <button
          ref={model.menuButtonRef}
          className="kp-menu-toggle"
          aria-label={model.menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={model.menuOpen}
          aria-controls="kp-mobile-navigation"
          onClick={() => model.setMenuOpen((open) => !open)}
        >
          {model.menuOpen ? <X /> : <Menu />}
        </button>
      </header>
      <AnimatePresence>
        {model.menuOpen && (
          <>
            <motion.button
              className="kp-menu-scrim"
              aria-label="Close navigation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => model.setMenuOpen(false)}
            />
            <motion.nav
              ref={model.mobileNavRef}
              id="kp-mobile-navigation"
              className="kp-mobile-nav"
              aria-label="Mobile navigation"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{
                duration: model.reduced ? 0 : 0.28,
                ease: "easeOut",
              }}
            >
              <div className="kp-mobile-nav-top">
                <span>Explore Kesh Prakriti</span>
                <button
                  aria-label="Close navigation"
                  onClick={() => model.setMenuOpen(false)}
                >
                  <X />
                </button>
              </div>
              {model.pageLinks.map(([label, id], i) => (
                <a
                  key={id}
                  href={`#${id}`}
                  onClick={(event) => {
                    event.preventDefault();
                    model.scrollTo(id);
                  }}
                >
                  <span>0{i + 1}</span>
                  {label}
                  <ArrowUpRight size={16} />
                </a>
              ))}
              <div className="kp-mobile-account">
                <button
                  onClick={() => {
                    model.setMenuOpen(false);
                    model.onMyBookings();
                  }}
                >
                  My Bookings
                </button>
                {model.customerSignedIn ? (
                  <button
                    className="kp-customer-account"
                    aria-label="Manage your customer account"
                    onClick={() => {
                      model.setMenuOpen(false);
                      model.onAccount("signin");
                    }}
                  >
                    {model.customerPhotoUrl && (
                      <img src={model.customerPhotoUrl} alt="" />
                    )}
                    <span>My profile &amp; settings</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        model.setMenuOpen(false);
                        model.onAccount("signin");
                      }}
                    >
                      Customer Login
                    </button>
                    <button
                      onClick={() => {
                        model.setMenuOpen(false);
                        model.onAccount("signup");
                      }}
                    >
                      Sign up
                    </button>
                  </>
                )}
              </div>
              <button
                className="kp-button"
                onClick={() => {
                  model.setMenuOpen(false);
                  model.onBook(model.firstService);
                }}
              >
                Book Your Ritual <ArrowRight size={16} />
              </button>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
