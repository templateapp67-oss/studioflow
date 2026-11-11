import { useEffect, useRef } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';
import { REWARDS_NAV_LINKS, REWARDS_PARTNER_HREF } from './content';

function NavList() {
  return (
    <ul>
      {REWARDS_NAV_LINKS.map((link) => (
        <li key={link.href}>
          <a href={link.href} aria-current={link.current ? 'page' : undefined}>
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  );
}

/**
 * Sticky page header.
 *
 * From 1024px the links sit inline. Below that they live in a native
 * `<details>` disclosure, so the menu opens and closes before the page has
 * hydrated; the effect only adds the conveniences of a menu (Escape and a
 * press outside close it). Only one of the two navigation lists is ever
 * displayed, so assistive technology meets a single "Main navigation".
 */
export function RewardsHeader() {
  const menu = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const node = menu.current;
    if (!node) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !node.open) return;
      node.open = false;
      node.querySelector('summary')?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (node.open && event.target instanceof Node && !node.contains(event.target)) node.open = false;
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, []);

  return (
    <header className="ngr-header">
      <div className="ngr-container ngr-header__bar">
        <a href="/" className="ngr-brand" aria-label="NEXORA home">
          <span className="ngr-brand__mark" aria-hidden="true">N</span>
          <span className="ngr-brand__text">
            <span className="ngr-brand__name">NEXORA</span>
            <span className="ngr-brand__tag">SALON · GROW · SUCCEED</span>
          </span>
        </a>
        <nav className="ngr-nav" aria-label="Main navigation">
          <NavList />
        </nav>
        <a href={REWARDS_PARTNER_HREF} className="ngr-btn ngr-btn--gold ngr-btn--compact ngr-header__cta">
          Become a Partner <ArrowRight aria-hidden="true" />
        </a>
        <details className="ngr-menu" ref={menu}>
          <summary className="ngr-menu__toggle" aria-label="Menu">
            <Menu className="ngr-menu__icon ngr-menu__icon--open" aria-hidden="true" />
            <X className="ngr-menu__icon ngr-menu__icon--close" aria-hidden="true" />
          </summary>
          <nav className="ngr-menu__panel" aria-label="Main navigation">
            <NavList />
            <a href={REWARDS_PARTNER_HREF} className="ngr-btn ngr-btn--gold ngr-menu__cta">
              Become a Partner <ArrowRight aria-hidden="true" />
            </a>
          </nav>
        </details>
      </div>
    </header>
  );
}
