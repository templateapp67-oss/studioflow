import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X, SlidersHorizontal, Phone, MessageCircle, CalendarDays, Check, WifiOff, ArrowUpRight, Leaf, MapPin, Clock3 } from 'lucide-react';
import { Brand, ButtonLink, Picture } from './UI';
import { Dialog } from './Dialog';
import { LeafDivider, Lotus } from './Artwork';
import { useSite } from '../hooks/useSite';
import { applyTheme, readSavedTheme, saveTheme, THEME_PRESETS } from '../lib/theme';
import { phoneHref, whatsappHref, safeExternalUrl } from '../lib/format';
import type { ThemePreset } from '../types';

export function Header() {
  const { site } = useSite();
  const [menu, setMenu] = useState(false);
  const [settings, setSettings] = useState(false);
  const [theme, setTheme] = useState<ThemePreset>(readSavedTheme() ?? site.settings.theme_preset);
  const location = useLocation();
  const closeMenu = useCallback(() => setMenu(false), []);
  const closeSettings = useCallback(() => setSettings(false), []);
  useEffect(() => { setMenu(false); }, [location.pathname, location.hash]);
  const links = [{ label: 'Our rituals', to: '/#services' }, { label: 'Our philosophy', to: '/#about' }, { label: 'The journal', to: '/#blog' }, { label: 'Visit us', to: '/#contact' }];
  return <><header className="site-header"><div className="container-shell header-inner"><Brand name={site.settings.business_name} tagline={site.settings.tagline} logoUrl={site.settings.logo_url} /><nav className="desktop-nav" aria-label="Main navigation">{links.map((link) => <Link key={link.to} to={link.to}>{link.label}</Link>)}</nav><div className="header-actions"><button className="icon-btn settings-trigger" onClick={() => setSettings(true)} aria-label="Open appearance settings" title="Appearance settings"><SlidersHorizontal size={19} /></button><ButtonLink to="/#booking" className="header-book">Book a ritual</ButtonLink><button className="icon-btn mobile-menu-trigger" onClick={() => setMenu(true)} aria-label="Open navigation" aria-expanded={menu}><Menu size={24} /></button></div></div></header>
    <Dialog open={menu} onClose={closeMenu} title="Navigation" className="nav-dialog"><Brand name={site.settings.business_name} tagline={site.settings.tagline} logoUrl={site.settings.logo_url} /><button className="icon-btn absolute right-4 top-4" onClick={closeMenu} aria-label="Close navigation"><X /></button><nav aria-label="Mobile navigation">{links.map((link) => <Link key={link.to} to={link.to} onClick={closeMenu}>{link.label}<ArrowUpRight size={20} /></Link>)}<Link to="/#quiz" onClick={closeMenu}>Discover your dosha<ArrowUpRight size={20} /></Link></nav><ButtonLink to="/#booking">Book a ritual</ButtonLink><p className="font-hindi text-2xl mt-8 text-neem">जीवन में संतुलन</p></Dialog>
    <Dialog open={settings} onClose={closeSettings} title="Appearance settings"><p className="eyebrow">Make yourself at home</p><h2 className="text-4xl mt-3 mb-3">Your kind of calm.</h2><p className="text-muted text-sm mb-6">Choose a palette for your visit. Your preference stays on this device.</p><fieldset><legend className="sr-only">Theme preset</legend><div className="theme-options">{(Object.entries(THEME_PRESETS) as [ThemePreset, typeof THEME_PRESETS[ThemePreset]][]).map(([key, preset]) => <label key={key} className={`theme-option ${theme === key ? 'selected' : ''}`}><input type="radio" name="theme" value={key} checked={theme === key} onChange={() => { setTheme(key); applyTheme(key, key === site.settings.theme_preset ? site.settings.colors : {}); saveTheme(key); }} /><span className="theme-swatch" style={{ background: preset.sandal, color: preset.neem }}><Leaf size={20} /></span><span><strong>{preset.name}</strong><small>{preset.description}</small></span>{theme === key && <Check size={18} />}</label>)}</div></fieldset><button className="text-link mt-5" onClick={() => { setTheme(site.settings.theme_preset); applyTheme(site.settings.theme_preset, site.settings.colors); try { localStorage.removeItem('veda-theme'); } catch { /* Storage is optional. */ } }}>Use the studio’s theme</button></Dialog>
  </>;
}
export function Footer() {
  const { site } = useSite(); const s = site.settings;
  return <footer className="site-footer"><div className="container-shell"><div className="footer-top"><div><Brand light name={site.settings.business_name} tagline={site.settings.tagline} logoUrl={site.settings.logo_url} /><p className="footer-mantra">A quieter rhythm.<br /><em>A little closer to yourself.</em></p><span className="font-hindi text-xl opacity-70">आयुर्वेद · जीवन का संतुलन</span></div><div><h3>Explore</h3><Link to="/#services">Our rituals</Link><Link to="/#quiz">Discover your dosha</Link><Link to="/#team">Our Vaidyas</Link><Link to="/#blog">The wellness journal</Link></div><div><h3>Come, slow down</h3><p>{s.address || `${s.city || 'Our sanctuary'} · address coming soon`}</p><p>Mon–Sat · {s.timings.monday_saturday?.open ?? '10:00'}–{s.timings.monday_saturday?.close ?? '19:00'}<br />Sunday · a day of rest</p></div><div><h3>Your next moment of calm</h3><ButtonLink to="/#booking" variant="light">Book a ritual</ButtonLink><div className="social-links">{Object.entries(s.social).filter((entry): entry is [string, string] => typeof entry[1] === 'string').map(([name, url]) => safeExternalUrl(url) && <a key={name} href={safeExternalUrl(url)!} target="_blank" rel="noreferrer">{name}<ArrowUpRight size={14} /></a>)}</div></div></div><LeafDivider /><div className="footer-bottom"><p>© {new Date().getFullYear()} {s.business_name}. Thoughtfully, naturally.</p><div><NavLink to="/privacy">Privacy</NavLink><NavLink to="/terms">Terms</NavLink><span>Made with intention <Leaf size={13} /></span></div></div><p className="preview-note">Illustrative website preview. Photography, practitioner profiles and guest reflections are examples; verify business details before publishing.</p></div></footer>;
}
export function MobileBar() {
  const { site } = useSite(); const tel = phoneHref(site.settings.phone); const wa = whatsappHref(site.settings.whatsapp);
  return <nav className="mobile-bar" aria-label="Quick actions">{tel ? <a href={tel}><Phone size={19} />Call</a> : <Link to="/#contact"><Phone size={19} />Call us</Link>}{wa ? <a href={wa} target="_blank" rel="noreferrer"><MessageCircle size={19} />WhatsApp</a> : <Link to="/#contact"><MessageCircle size={19} />WhatsApp</Link>}<Link to="/#booking" className="mobile-book"><CalendarDays size={19} />Book now</Link></nav>;
}
export function StatusBanners() {
  const { source, refresh } = useSite(); const [offline, setOffline] = useState(!navigator.onLine);
  useEffect(() => { const update = () => setOffline(!navigator.onLine); window.addEventListener('online', update); window.addEventListener('offline', update); return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); }; }, []);
  return <>{offline && <div className="offline-banner" role="status"><WifiOff size={16} />You’re offline. Saved stories are here; live booking needs a connection.</div>}{source === 'saved' && import.meta.env.DEV && <div className="saved-banner" role="status">Showing saved preview content · live availability is unavailable <button onClick={refresh}>Retry connection</button></div>}</>;
}
export function CookieConsent() {
  const [visible, setVisible] = useState(() => { try { return !['accepted', 'declined'].includes(localStorage.getItem('veda-consent') ?? ''); } catch { return true; } });
  const choose = (choice: string) => { try { localStorage.setItem('veda-consent', choice); } catch { /* Do not block browsing. */ } window.dispatchEvent(new CustomEvent('veda:consent', { detail: choice })); setVisible(false); };
  if (!visible) return null;
  return <aside className="cookie-banner" aria-label="Cookie preferences"><Lotus className="w-10 h-10 shrink-0 text-neem" /><div><strong>A little privacy, by design.</strong><p>Essential storage keeps your preferences. Optional analytics stay off unless you agree. <Link to="/privacy">Our privacy promise</Link></p></div><div className="flex gap-2"><button className="btn btn-outline btn-small" onClick={() => choose('declined')}>Essential only</button><button className="btn btn-primary btn-small" onClick={() => choose('accepted')}>Allow analytics</button></div></aside>;
}
export function ContactDetails() {
  const { site } = useSite(); const s = site.settings;
  return <div className="contact-details"><div><MapPin /><span><strong>Find our sanctuary</strong><p>{s.address || 'Studio address coming soon'}</p></span></div><div><Clock3 /><span><strong>Time for yourself</strong><p>Monday–Saturday · {s.timings.monday_saturday?.open ?? '10:00'}–{s.timings.monday_saturday?.close ?? '19:00'}<br />Sunday · closed</p></span></div><div><Phone /><span><strong>Let’s talk</strong>{phoneHref(s.phone) ? <a href={phoneHref(s.phone)!}>{s.phone}</a> : <p>Phone details coming soon</p>}{s.email && <a href={`mailto:${s.email}`}>{s.email}</a>}</span></div></div>;
}
export function ImageCollage({ src, alt }: { src: string | null; alt: string }) { return <div className="image-collage"><Picture src={src} alt={alt} className="arch-image collage-main" /><Picture src="/images/herbal-ritual-800.webp" alt="Herbal oil and fresh botanicals, illustrative photography" className="collage-small" /><div className="collage-seal"><Lotus /><span>ROOTED IN<br />NATURE</span></div></div>; }
