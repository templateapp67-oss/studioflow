import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowRight, ChevronDown, Menu, X } from 'lucide-react';
import { NexoraMark } from '../ui';
import { useOptionalLandingModel } from '../LandingContentProvider';
import type { LandingNavLink } from '../../../lib/nexoraLandingContent';
import { useOptionalDemoDialog } from '../../nexora-pricing/DemoProvider';
import { NEXORA_KNOWLEDGE_BASE_URL } from '../../../lib/nexoraSupport';
import './siteHeader.css';

type HeaderAppearance = 'landing' | 'homepage' | 'ecosystem' | 'rewards' | 'partner';
type HeaderAction = { label: string; href: string; icon?: ReactNode };
type HeaderNavLink = LandingNavLink & { target?: string; rel?: string };
type HeaderSecondaryAction = HeaderAction & {
  ariaLabel?: string;
  compactLabel?: string;
  className?: string;
  target?: string;
  rel?: string;
  dataAttribute?: { name: string; desktopValue: string; compactValue: string };
};
type CurrentValue = 'page' | 'location' | undefined;

const EMPTY_NAV_LINKS: LandingNavLink[] = [];

function normalisePath(path: string): string {
  const pathname = path.split(/[?#]/, 1)[0] || '/';
  return pathname.replace(/\/+$/, '') || '/';
}

function siteOrigin(): string {
  return typeof window === 'undefined' ? 'https://nexorasalon.online' : window.location.origin;
}

function targetForHref(href: string, currentPath: string): URL | null {
  try {
    return new URL(href, `${siteOrigin()}${currentPath}`);
  } catch {
    return null;
  }
}

function withHelpCentre(links: LandingNavLink[]): HeaderNavLink[] {
  return links.some((link) => link.href === NEXORA_KNOWLEDGE_BASE_URL)
    ? links
    : [
        ...links,
        {
          label: 'Help Centre',
          href: NEXORA_KNOWLEDGE_BASE_URL,
          external: true,
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      ];
}

function currentValueForLink(
  href: string,
  currentPath: string,
  activeSection: string,
): CurrentValue {
  const target = targetForHref(href, currentPath);
  if (!target || target.origin !== siteOrigin() || normalisePath(target.pathname) !== currentPath) return undefined;
  if (!target.hash) return 'page';

  const sectionId = decodeURIComponent(target.hash.slice(1));
  if (sectionId && sectionId === activeSection) return 'location';
  return undefined;
}

function sectionIds(links: LandingNavLink[], currentPath: string): string[] {
  return links.flatMap((link) => {
    const target = targetForHref(link.href, currentPath);
    if (!target || target.origin !== siteOrigin() || normalisePath(target.pathname) !== currentPath || !target.hash) return [];
    return [decodeURIComponent(target.hash.slice(1))];
  });
}

/**
 * Shared NEXORA marketing header. Its desktop/mobile switch is based on the
 * measured width of this page's actual brand, links and actions rather than a
 * viewport breakpoint, so it adapts to translated or content-managed labels.
 */
export function SiteHeader({
  links,
  mobileLinks,
  demoLabel = 'Book a Demo',
  currentPath,
  primaryAction,
  secondaryAction,
  overflowLinks = EMPTY_NAV_LINKS,
  overflowLabel = 'More',
  loginHref,
  loginLabel,
  showLogin = true,
  showPrimaryAction = true,
  showHelpCentre = true,
  authenticated = false,
  sticky = true,
  appearance = 'landing',
  brand,
  brandLabel = 'NEXORA Salon OS home',
  menuOpen: controlledMenuOpen,
  onMenuOpenChange,
}: {
  links?: LandingNavLink[];
  mobileLinks?: LandingNavLink[];
  demoLabel?: string;
  currentPath?: string;
  /** The single emphasized header action. */
  primaryAction?: HeaderAction;
  /** Optional lower-emphasis link kept beside the primary action or in the compact menu. */
  secondaryAction?: HeaderSecondaryAction;
  /** Links grouped under a native disclosure-style "More" button in the primary nav. */
  overflowLinks?: LandingNavLink[];
  overflowLabel?: string;
  loginHref?: string;
  loginLabel?: string;
  showLogin?: boolean;
  /** Hide the emphasized action on routes whose header has navigation only. */
  showPrimaryAction?: boolean;
  /** The default landing header includes the support link; route shells may opt out. */
  showHelpCentre?: boolean;
  authenticated?: boolean;
  sticky?: boolean;
  appearance?: HeaderAppearance;
  brand?: ReactNode;
  brandLabel?: string;
  /** Optional controlled state for pages with UI that depends on the open menu. */
  menuOpen?: boolean;
  onMenuOpenChange?: (open: boolean) => void;
}) {
  const landingModel = useOptionalLandingModel();
  const openDemo = useOptionalDemoDialog();
  const resolvedCurrentPath = normalisePath(
    currentPath ?? (typeof window !== 'undefined' ? window.location.pathname : '/'),
  );
  const baseLinks = links ?? landingModel?.nav ?? EMPTY_NAV_LINKS;
  const nav = useMemo(
    () => showHelpCentre ? withHelpCentre(baseLinks) : baseLinks,
    [baseLinks, showHelpCentre],
  );
  const baseMobileLinks = mobileLinks ?? links ?? landingModel?.mobileNav ?? baseLinks;
  const mobileNav = useMemo(
    () => showHelpCentre ? withHelpCentre(baseMobileLinks) : baseMobileLinks,
    [baseMobileLinks, showHelpCentre],
  );
  const defaultAction: HeaderAction = authenticated
    ? { label: 'Open Workspace', href: '/login' }
    : { label: 'Get Started', href: landingModel?.cta.signup ?? '/login?auth=signup' };
  const action = primaryAction ?? defaultAction;
  const resolvedLoginHref = loginHref ?? landingModel?.cta.login ?? '/login';
  const resolvedLoginLabel = loginLabel ?? (authenticated ? 'Owner Workspace' : 'Login');
  const showDemo = Boolean(openDemo);

  const [internalMenuOpen, setInternalMenuOpen] = useState(false);
  const menuOpen = controlledMenuOpen ?? internalMenuOpen;
  const [compact, setCompact] = useState(false);
  const [compactActionVisible, setCompactActionVisible] = useState(false);
  const [layoutMeasured, setLayoutMeasured] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const [moreOpen, setMoreOpen] = useState(false);
  const menuOpenRef = useRef(menuOpen);
  menuOpenRef.current = menuOpen;
  const innerRef = useRef<HTMLDivElement>(null);
  const brandRef = useRef<HTMLAnchorElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const compactActionMeasureRef = useRef<HTMLSpanElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const moreTriggerRef = useRef<HTMLElementTagNameMap['summary']>(null);
  const pathId = resolvedCurrentPath === '/'
    ? 'home'
    : resolvedCurrentPath.slice(1).replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'page';
  const idPrefix = `nexora-site-header-${appearance}-${pathId}`;
  const navigationId = `${idPrefix}-navigation`;
  const overflowId = `${idPrefix}-overflow`;

  const isMenuControlled = controlledMenuOpen !== undefined;
  const updateMenuOpen = useCallback((open: boolean) => {
    if (!isMenuControlled) setInternalMenuOpen(open);
    onMenuOpenChange?.(open);
  }, [isMenuControlled, onMenuOpenChange]);

  const closeMenu = useCallback((restoreFocus: boolean) => {
    updateMenuOpen(false);
    setMoreOpen(false);
    if (restoreFocus && typeof window !== 'undefined') {
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }, [updateMenuOpen]);
  const updateMenuOpenRef = useRef(updateMenuOpen);
  updateMenuOpenRef.current = updateMenuOpen;
  const closeMenuRef = useRef(closeMenu);
  closeMenuRef.current = closeMenu;

  useEffect(() => {
    const syncHashSection = () => {
      const hash = window.location.hash.slice(1);
      try {
        setActiveSection(hash ? decodeURIComponent(hash) : '');
      } catch {
        setActiveSection(hash);
      }
    };
    syncHashSection();
    window.addEventListener('hashchange', syncHashSection);
    window.addEventListener('popstate', syncHashSection);

    setMoreOpen(false);
    if (menuOpenRef.current) closeMenuRef.current(true);
    else updateMenuOpenRef.current(false);

    return () => {
      window.removeEventListener('hashchange', syncHashSection);
      window.removeEventListener('popstate', syncHashSection);
    };
  }, [resolvedCurrentPath]);

  useEffect(() => {
    const ids = [...new Set(sectionIds([...nav, ...mobileNav, ...overflowLinks], resolvedCurrentPath))];
    if (!ids.length || typeof IntersectionObserver === 'undefined') return undefined;
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((node): node is HTMLElement => Boolean(node));
    if (!sections.length) return undefined;

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
  }, [nav, mobileNav, overflowLinks, resolvedCurrentPath]);

  useEffect(() => {
    if (!compact || !menuOpen) return undefined;
    const frame = window.requestAnimationFrame(() => {
      navRef.current?.querySelector<HTMLAnchorElement>('a[href]')?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [compact, menuOpen]);

  useEffect(() => {
    if (!moreOpen && (!compact || !menuOpen)) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      if (moreOpen) {
        setMoreOpen(false);
        window.requestAnimationFrame(() => moreTriggerRef.current?.focus());
      } else if (compact && menuOpen) {
        closeMenu(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [compact, menuOpen, moreOpen, closeMenu]);

  useEffect(() => {
    setMoreOpen(false);
  }, [compact]);

  useEffect(() => {
    if (!compact && menuOpen) closeMenu(false);
  }, [compact, menuOpen, closeMenu]);

  useEffect(() => {
    if (!compact || !menuOpen) return undefined;
    const onLocationChange = () => closeMenu(true);
    window.addEventListener('popstate', onLocationChange);
    window.addEventListener('hashchange', onLocationChange);
    return () => {
      window.removeEventListener('popstate', onLocationChange);
      window.removeEventListener('hashchange', onLocationChange);
    };
  }, [compact, menuOpen, closeMenu]);

  useEffect(() => {
    const inner = innerRef.current;
    const brandNode = brandRef.current;
    const measuredRow = measureRef.current;
    const measuredCompactAction = compactActionMeasureRef.current;
    const toggle = triggerRef.current;
    if (!inner || !brandNode || !measuredRow || !measuredCompactAction || !toggle) return undefined;

    let mounted = true;
    const measure = () => {
      if (!mounted) return;
      const availableWidth = inner.clientWidth;
      if (!availableWidth) return;
      const innerStyle = window.getComputedStyle(inner);
      const rowGap = Number.parseFloat(innerStyle.getPropertyValue('--nsh-row-gap'))
        || Number.parseFloat(innerStyle.columnGap)
        || 0;
      const compactGap = Number.parseFloat(innerStyle.getPropertyValue('--nsh-compact-gap')) || rowGap;
      const brandWidth = brandNode.getBoundingClientRect().width;
      const requiredWidth = brandWidth + measuredRow.getBoundingClientRect().width + rowGap;
      const toggleWidth = Number.parseFloat(window.getComputedStyle(toggle).width)
        || toggle.getBoundingClientRect().width;
      const compactActionWidth = brandWidth + measuredCompactAction.getBoundingClientRect().width + toggleWidth + (2 * compactGap);
      setCompact(requiredWidth > availableWidth + 0.5);
      setCompactActionVisible(showPrimaryAction && compactActionWidth <= availableWidth + 0.5);
      setLayoutMeasured(true);
    };

    measure();
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    resizeObserver?.observe(inner);
    resizeObserver?.observe(brandNode);
    resizeObserver?.observe(measuredRow);
    resizeObserver?.observe(measuredCompactAction);
    window.addEventListener('resize', measure);
    document.fonts?.ready.then(measure);

    return () => {
      mounted = false;
      resizeObserver?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [nav, mobileNav, overflowLinks, overflowLabel, secondaryAction, demoLabel, action.label, action.href, action.icon, resolvedLoginHref, resolvedLoginLabel, showLogin, showPrimaryAction, showDemo, appearance]);

  const currentFor = (href: string) => currentValueForLink(href, resolvedCurrentPath, activeSection);
  const handleLinkClick = () => {
    setMoreOpen(false);
    if (compact && menuOpen) closeMenu(true);
  };
  const currentNav = compact ? mobileNav : nav;
  const secondaryActionAttributes: Record<string, string> = secondaryAction?.dataAttribute
    ? {
        [secondaryAction.dataAttribute.name]: compact
          ? secondaryAction.dataAttribute.compactValue
          : secondaryAction.dataAttribute.desktopValue,
      }
    : {};
  const showPrimaryInActions = showPrimaryAction && (!compact || !compactActionVisible);
  const showActions = Boolean(secondaryAction || showLogin || openDemo || showPrimaryInActions);
  const renderLinks = (items: HeaderNavLink[]) => items.map((link) => (
    <li key={`${link.href}-${link.label}`}>
      <a
        className="nexora-site-header__nav-link"
        href={link.href}
        target={link.target}
        rel={link.rel}
        aria-current={currentFor(link.href)}
        onClick={handleLinkClick}
      >
        {link.label}
      </a>
    </li>
  ));
  const renderOverflow = overflowLinks.length > 0 ? (
    <li className="nexora-site-header__overflow">
      <details
        className="nexora-site-header__overflow-disclosure"
        open={moreOpen}
        onToggle={(event) => setMoreOpen(event.currentTarget.open)}
        onKeyDown={(event) => {
          if (event.key !== 'Escape' || !event.currentTarget.open) return;
          event.preventDefault();
          event.stopPropagation();
          setMoreOpen(false);
          moreTriggerRef.current?.focus();
        }}
      >
        <summary
          ref={moreTriggerRef}
          className="nexora-site-header__nav-link nexora-site-header__overflow-toggle"
          aria-controls={overflowId}
        >
          {overflowLabel} <ChevronDown size={14} aria-hidden="true" />
        </summary>
        <ul
          id={overflowId}
          className="nexora-site-header__overflow-list"
          aria-label={`${overflowLabel} navigation`}
        >
          {renderLinks(overflowLinks)}
        </ul>
      </details>
    </li>
  ) : null;

  return (
    <header
      role="banner"
      className={[
        'nexora-site-header',
        `nexora-site-header--${appearance}`,
        sticky ? '' : 'nexora-site-header--static',
        layoutMeasured ? 'has-measured-layout' : '',
        compact ? 'nexora-site-header--compact' : '',
        compact && menuOpen ? 'is-menu-open' : '',
        compact && compactActionVisible ? 'has-compact-action' : '',
      ].filter(Boolean).join(' ')}
    >
      <div className="nexora-site-header__inner" ref={innerRef}>
        <a
          ref={brandRef}
          className="nexora-site-header__brand"
          href="/"
          aria-label={brandLabel}
          aria-current={resolvedCurrentPath === '/' ? 'page' : undefined}
          onClick={handleLinkClick}
        >
          {brand ?? <NexoraMark />}
        </a>

        {showPrimaryAction && compact && compactActionVisible && (
          <a className="nexora-site-header__compact-primary nexora-site-header__primary" href={action.href} onClick={handleLinkClick}>
            {action.label} {action.icon ?? <ArrowRight size={16} aria-hidden="true" />}
          </a>
        )}

        <button
          ref={triggerRef}
          type="button"
          className="nexora-site-header__toggle"
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
          aria-controls={navigationId}
          onClick={() => menuOpen ? closeMenu(true) : updateMenuOpen(true)}
        >
          {menuOpen ? <X size={21} aria-hidden="true" /> : <Menu size={21} aria-hidden="true" />}
        </button>

        <div
          id={navigationId}
          className="nexora-site-header__menu"
          aria-hidden={compact && !menuOpen ? true : undefined}
          inert={compact && !menuOpen ? true : undefined}
        >
          <nav ref={navRef} className="nexora-site-header__nav" aria-label="Primary navigation">
            <ul className="nexora-site-header__nav-list">
              {renderLinks(currentNav)}
              {renderOverflow}
            </ul>
          </nav>

          {showActions && (
            <div className="nexora-site-header__actions">
              {secondaryAction && (
                <a
                  className={['nexora-site-header__secondary', secondaryAction.className].filter(Boolean).join(' ')}
                  href={secondaryAction.href}
                  target={secondaryAction.target}
                  rel={secondaryAction.rel}
                  aria-label={secondaryAction.ariaLabel}
                  onClick={handleLinkClick}
                  {...secondaryActionAttributes}
                >
                  {secondaryAction.icon} {compact ? secondaryAction.compactLabel ?? secondaryAction.label : secondaryAction.label}
                </a>
              )}
              {showLogin && (
                <a className="nexora-site-header__login" href={resolvedLoginHref} onClick={handleLinkClick}>
                  {resolvedLoginLabel}
                </a>
              )}
              {openDemo && (
                <button
                  type="button"
                  className="nexora-site-header__secondary"
                  onClick={() => {
                    if (compact && menuOpen) {
                      closeMenu(false);
                      triggerRef.current?.focus();
                    }
                    openDemo();
                  }}
                >
                  {demoLabel}
                </button>
              )}
              {showPrimaryInActions && (
                <a className="nexora-site-header__primary" href={action.href} onClick={handleLinkClick}>
                  {action.label} {action.icon ?? <ArrowRight size={16} aria-hidden="true" />}
                </a>
              )}
            </div>
          )}
        </div>

        <div className="nexora-site-header__measure" ref={measureRef} aria-hidden="true">
          <ul className="nexora-site-header__nav-list">
            {nav.map((link) => <li key={`measure-${link.href}-${link.label}`}><span className="nexora-site-header__nav-link">{link.label}</span></li>)}
            {overflowLinks.length > 0 && (
              <li><span className="nexora-site-header__nav-link nexora-site-header__overflow-toggle">{overflowLabel} <ChevronDown size={14} aria-hidden="true" /></span></li>
            )}
          </ul>
          {(secondaryAction || showLogin || showDemo || showPrimaryAction) && (
            <div className="nexora-site-header__measure-actions">
              {secondaryAction && <span className="nexora-site-header__secondary">{secondaryAction.icon} {secondaryAction.label}</span>}
              {showLogin && <span className="nexora-site-header__login">{resolvedLoginLabel}</span>}
              {showDemo && <span className="nexora-site-header__secondary">{demoLabel}</span>}
              {showPrimaryAction && <span className="nexora-site-header__primary">{action.label} {action.icon ?? <ArrowRight size={16} aria-hidden="true" />}</span>}
            </div>
          )}
        </div>
        <div className="nexora-site-header__measure" aria-hidden="true">
          <span ref={compactActionMeasureRef} className="nexora-site-header__primary nexora-site-header__compact-primary">
            {action.label} <ArrowRight size={16} aria-hidden="true" />
          </span>
        </div>
      </div>
    </header>
  );
}
