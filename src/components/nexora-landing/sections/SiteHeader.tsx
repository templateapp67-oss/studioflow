import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';
import { NexoraMark } from '../ui';
import { useLandingModel } from '../LandingContentProvider';
import type { LandingNavLink } from '../../../lib/nexoraLandingContent';
import { useDemoDialog } from '../../nexora-pricing/DemoProvider';

/** Sections watched by the scroll spy, derived from the rendered navigation. */
const spySectionIds = (links: LandingNavLink[]) =>
  links.filter((link) => !link.external && link.href.startsWith('#')).map((link) => link.href.slice(1));

/** Sticky site header with a keyboard-operable mobile navigation panel. */
export function SiteHeader({
  links,
  mobileLinks,
  demoLabel = 'Book a Demo',
}: {
  links?: LandingNavLink[];
  mobileLinks?: LandingNavLink[];
  demoLabel?: string;
}) {
  const model = useLandingModel();
  const nav = links ?? model.nav;
  const mobileNav = mobileLinks ?? links ?? model.mobileNav;
  const cta = model.cta;
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const { openDemo } = useDemoDialog();
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const sections = spySectionIds(nav)
      .map((id) => document.getElementById(id))
      .filter((node): node is HTMLElement => Boolean(node));
    if (!sections.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActiveSection(visible[0].target.id);
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: [0, 0.25, 0.5, 1] },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        triggerRef.current?.focus();
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className={`sl-header${scrolled ? ' is-scrolled' : ''}`}>
      <div className="sl-container sl-header__inner">
        <a className="sl-header__brand" href="/">
          <NexoraMark />
        </a>

        <nav className="sl-header__nav" aria-label="Primary navigation">
          {nav.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={!link.external && activeSection === link.href.slice(1) ? 'is-active' : undefined}
              aria-current={!link.external && activeSection === link.href.slice(1) ? 'true' : undefined}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="sl-header__actions">
          <a className="sl-header__login" href={cta.login}>
            Login
          </a>
          <button
            type="button"
            className="sl-btn sl-btn--secondary sl-header__demo"
            onClick={() => {
              closeMenu();
              openDemo();
            }}
          >
            {demoLabel}
          </button>
          <a className="sl-btn sl-btn--primary sl-header__start" href={cta.signup}>
            Get Started <ArrowRight size={16} aria-hidden="true" />
          </a>
          <button
            ref={triggerRef}
            type="button"
            className="sl-header__toggle"
            aria-expanded={menuOpen}
            aria-controls="sl-mobile-navigation"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div id="sl-mobile-navigation" className={`sl-mobile-nav${menuOpen ? ' is-open' : ''}`} hidden={!menuOpen}>
        <nav className="sl-container sl-mobile-nav__inner" aria-label="Mobile navigation">
          {mobileNav.map((link) => (
            <a key={link.href} href={link.href} className="sl-mobile-nav__link" onClick={closeMenu}>
              {link.label}
            </a>
          ))}
          <div className="sl-mobile-nav__actions">
            <a className="sl-btn sl-btn--secondary" href={cta.login} onClick={closeMenu}>
              Login
            </a>
            <button
              type="button"
              className="sl-btn sl-btn--primary"
              onClick={() => {
                closeMenu();
                openDemo();
              }}
            >
              {demoLabel} <ArrowRight size={16} aria-hidden="true" />
            </button>
            <a className="sl-btn sl-btn--accent" href={cta.signup} onClick={closeMenu}>
              Get Started <ArrowRight size={16} aria-hidden="true" />
            </a>
          </div>
        </nav>
      </div>
    </header>
  );
}
