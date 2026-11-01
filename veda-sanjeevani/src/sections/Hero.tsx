import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowDown, Leaf, Sparkles, Star } from 'lucide-react';
import { ButtonLink, Eyebrow, Picture } from '../components/UI';
import { Mandala } from '../components/Artwork';
import { useReducedMotionSafe } from '../hooks/useReducedMotionSafe';
import { sectionContent, textFrom } from '../lib/format';
import type { Section } from '../types';

export function Hero({ section }: { section: Section }) {
  const ref = useRef<HTMLElement>(null); const reduced = useReducedMotionSafe();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const content = sectionContent(section.body);
  const chips = Array.isArray(content.chips) ? content.chips.filter((item): item is string => typeof item === 'string').slice(0, 3) : [];
  return <section ref={ref} className="hero" id="hero" aria-labelledby="hero-heading"><div className="container-shell hero-grid"><div className="hero-copy"><motion.div initial={{ opacity: 0, y: reduced ? 0 : 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : .8 }}><Eyebrow>{section.subtitle}</Eyebrow><h1 id="hero-heading" tabIndex={-1}>{section.title}</h1><p className="hero-description">{textFrom(content.text, section.body)}</p><div className="hero-buttons"><ButtonLink to="/#booking">Book your ritual</ButtonLink><ButtonLink to="/#services" variant="outline" arrow={false}>Explore therapies <ArrowDown size={16} /></ButtonLink></div><div className="hero-footnote"><span className="hero-small-leaves"><Leaf size={18} /></span><span>Ancient wisdom. A personal touch.<br /><strong>Care that feels like coming home.</strong></span></div></motion.div></div><div className="hero-visual"><motion.div className="hero-image-wrap" style={{ y: reduced ? 0 : y }}><motion.div initial={{ opacity: 0, scale: reduced ? 1 : .95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: reduced ? 0 : 1.1 }}><Picture src={section.image_url} alt="AI-generated illustrative Ayurvedic treatment room with carved jharokha window and brass vessels" className="arch-image hero-image" eager width={800} height={1000} /></motion.div></motion.div><div className="hero-outline-arch" /><Mandala className="hero-mandala" /><div className="hero-chip hero-chip-top"><Sparkles size={19} /><span>{chips[0] ?? 'Thoughtful care'}</span></div><div className="hero-chip hero-chip-bottom"><Leaf size={21} /><span>{chips[1] ?? 'Rooted in nature'}</span></div><span className="hero-vertical">SLOW DOWN. BREATHE DEEP. COME BACK TO YOU.</span></div></div><div className="hero-bottom container-shell"><span><span className="status-dot" /> A sanctuary for the senses</span><span className="hero-bottom-center">{chips[2] ?? 'Kerala-inspired care'}</span><span className="flex items-center gap-2"><Star size={13} /> Wellness, the way nature intended</span></div></section>;
}
