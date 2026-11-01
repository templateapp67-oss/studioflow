import type { ComponentType } from 'react';
import { Seo } from '../components/Seo';
import { useSite } from '../hooks/useSite';
import { LeafDivider } from '../components/Artwork';
import { Hero } from '../sections/Hero';
import { Services } from '../sections/Services';
import { Quiz } from '../sections/Quiz';
import { About, Team, Packages, Faq } from '../sections/Story';
import { Gallery } from '../sections/Gallery';
import { Testimonials } from '../sections/Testimonials';
import { Blog } from '../sections/Blog';
import { Booking } from '../sections/Booking';
import { Contact } from '../sections/Contact';
import type { Section, SectionKey } from '../types';
const components: Record<SectionKey, ComponentType<{ section: Section }>> = { hero: Hero, services: Services, quiz: Quiz, about: About, team: Team, packages: Packages, gallery: Gallery, testimonials: Testimonials, blog: Blog, booking: Booking, faq: Faq, contact: Contact };
export default function Home() {
  const { site } = useSite();
  const ordered = [...site.settings.section_order, ...site.sections.map((section) => section.key).filter((key) => !site.settings.section_order.includes(key))];
  return <><Seo path="/" /><div className="page-enter">{[...new Set(ordered)].map((key) => { const section = site.sections.find((item) => item.key === key); if (!section || section.visible === false) return null; const Component = components[key]; return <div key={key}><Component section={section} />{['about', 'packages', 'blog'].includes(key) && <LeafDivider />}</div>; })}{!site.sections.length && <div className="container-shell section-space"><h1>A quieter rhythm is on its way.</h1><p>Our rituals are being thoughtfully prepared. Please check back soon.</p></div>}</div></>;
}
