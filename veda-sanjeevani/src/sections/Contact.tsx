import { ArrowUpRight, MapPin } from 'lucide-react';
import { Reveal, SectionHeading, SectionIntro } from '../components/UI';
import { ContactDetails } from '../components/Chrome';
import { useSite } from '../hooks/useSite';
import { safeExternalUrl } from '../lib/format';
import type { Section } from '../types';
export function Contact({ section }: { section: Section }) {
  const { site, source } = useSite(); const map = safeExternalUrl(site.settings.map_url);
  return <section id="contact" className="section-space bg-sandal/45"><div className="container-shell contact-grid"><Reveal><SectionHeading section={section} /><SectionIntro section={section} /><ContactDetails />{safeExternalUrl(site.settings.whatsapp ? `https://wa.me/${site.settings.whatsapp.replace(/\D/g, '')}` : null) && <a className="text-link mt-6" href={`https://wa.me/${site.settings.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">A conversation on WhatsApp<ArrowUpRight size={17} /></a>}</Reveal><Reveal className="map-card" delay={.1}>{map ? <iframe title={`Illustrative map of ${site.settings.city || 'the studio area'}`} src={map} loading="lazy" referrerPolicy="no-referrer" width={600} height={460} allowFullScreen /> : <div className="map-placeholder"><MapPin size={42} /><p>Our location will appear here once confirmed.</p></div>}<div className="map-caption"><MapPin size={17} /><span>{site.settings.city || 'Your sanctuary'} · {source === 'saved' ? 'Illustrative area map, not a verified studio location' : 'Find your way to a slower rhythm'}</span></div></Reveal></div></section>;
}
