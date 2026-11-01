import { useState, type ReactNode, type ImgHTMLAttributes } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowRight, RefreshCw, Leaf, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useReducedMotionSafe } from '../hooks/useReducedMotionSafe';
import { Lotus } from './Artwork';
import type { Section } from '../types';

export function Brand({ light = false, name, tagline, logoUrl }: { light?: boolean; name: string; tagline: string; logoUrl: string | null }) {
  const [logoFailed, setLogoFailed] = useState(false);
  return <Link to="/" className={`brand ${light ? 'brand-light' : ''}`} aria-label={`${name} home`}>{logoUrl && !logoFailed ? <img className="brand-mark" src={logoUrl} alt="" width={45} height={49} loading="lazy" decoding="async" onError={() => setLogoFailed(true)} /> : <Lotus className="brand-mark" />}<span><span className="brand-name">{name}</span><span className="brand-subtitle">{tagline}</span></span></Link>;
}
export function Eyebrow({ children, light = false }: { children: ReactNode; light?: boolean }) { return <p className={`eyebrow ${light ? 'eyebrow-light' : ''}`}><span />{children}</p>; }
export function ButtonLink({ to, children, variant = 'primary', className = '', arrow = true }: { to: string; children: ReactNode; variant?: 'primary' | 'outline' | 'light'; className?: string; arrow?: boolean }) {
  return <Link to={to} className={`btn btn-${variant} ${className}`}>{children}{arrow && <ArrowUpRight size={17} aria-hidden="true" />}</Link>;
}
export function Picture({ src, alt, className = '', width = 800, height = 1000, eager = false, sizes = '(max-width: 767px) 92vw, 45vw', ...props }: { src: string | null; alt: string; width?: number; height?: number; eager?: boolean } & Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt' | 'width' | 'height'>) {
  const [failed, setFailed] = useState(false);
  const local = src?.match(/^\/images\/(.+)-(400|800|1600)\.webp$/);
  const srcSet = local ? [400, 800, 1600].map((size) => `/images/${local[1]}-${size}.webp ${size}w`).join(', ') : undefined;
  if (!src || failed) return <div className={`image-placeholder ${className}`} role="img" aria-label={alt}><Lotus /><span>{alt}</span></div>;
  return <img src={src} alt={alt} width={width} height={height} srcSet={srcSet} sizes={srcSet ? sizes : undefined} loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setFailed(true)} className={className} {...props} />;
}
export function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduced = useReducedMotionSafe();
  return <motion.div className={className} initial={{ opacity: 0, y: reduced ? 0 : 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: reduced ? 0 : .65, delay: reduced ? 0 : delay }}>{children}</motion.div>;
}
export function SectionHeading({ section, children, align = 'left' }: { section: Section; children?: ReactNode; align?: 'left' | 'center' }) {
  return <div className={`section-heading ${align === 'center' ? 'text-center mx-auto' : ''}`}><Eyebrow>{section.subtitle}</Eyebrow><h2>{section.title}</h2>{children}</div>;
}
export function SectionIntro({ section }: { section: Section }) { const body = section.body.startsWith('{') ? '' : section.body; return body ? <p className="section-intro">{body}</p> : null; }
export function Skeleton({ className = '' }: { className?: string }) { return <div className={`skeleton ${className}`} aria-hidden="true" />; }
export function PageSkeleton() { return <div className="container-shell py-16" role="status" aria-label="Loading page"><span className="sr-only">Loading…</span><Skeleton className="h-5 w-32 mb-8" /><Skeleton className="h-20 w-3/4 mb-8" /><div className="grid md:grid-cols-2 gap-10"><Skeleton className="h-96" /><Skeleton className="h-96" /></div></div>; }
export function AsyncState({ loading, error, empty, onRetry, children, label = 'content' }: { loading: boolean; error?: string | null; empty?: boolean; onRetry?: () => void; children: ReactNode; label?: string }) {
  if (loading) return <div role="status" aria-label={`Loading ${label}`}><Skeleton className="h-24 w-full" /><span className="sr-only">Loading {label}…</span></div>;
  if (error) return <div className="state-panel" role="alert"><AlertCircle aria-hidden="true" /><p>{error}</p>{onRetry && <button className="text-link" onClick={onRetry}><RefreshCw size={16} />Try again</button>}</div>;
  if (empty) return <div className="state-panel"><Leaf aria-hidden="true" /><p>No {label} available just yet. Please check back soon.</p></div>;
  return <>{children}</>;
}
export function TextArrow({ children }: { children: ReactNode }) { return <span className="inline-flex items-center gap-3">{children}<ArrowRight size={17} aria-hidden="true" /></span>; }
