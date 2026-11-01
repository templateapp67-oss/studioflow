import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Check, Clock3, ShieldCheck } from 'lucide-react';
import { useSite } from '../hooks/useSite';
import { Seo } from '../components/Seo';
import { ButtonLink, Eyebrow, Picture, Reveal } from '../components/UI';
import { LeafDivider, Lotus } from '../components/Artwork';
import { ServiceCard } from '../sections/Services';
import { inr, MEDICAL_DISCLAIMER } from '../lib/format';
import NotFound from './NotFound';
export default function ServicePage() {
  const { slug } = useParams(); const { site } = useSite(); const service = site.services.find((item) => item.slug === slug);
  if (!service) return <NotFound />;
  const related = site.services.filter((item) => item.category === service.category && item.id !== service.id).slice(0, 3);
  return <><Seo title={service.name} description={service.short_desc} path={`/service/${service.slug}`} service={service} image={service.image_url} /><div className="container-shell service-detail page-enter"><Link to="/#services" className="text-link breadcrumb"><ArrowLeft size={16} />All rituals</Link><div className="service-detail-grid"><Reveal><Picture src={service.image_url} alt={service.image_alt || service.name} className="arch-image detail-image" width={800} height={1000} eager /></Reveal><Reveal className="service-detail-copy" delay={.1}><Eyebrow>{service.category.replace('_', ' ')} · A RITUAL BY VEDA SANJEEVANI</Eyebrow><h1 tabIndex={-1}>{service.name}</h1><p className="detail-lead">{service.short_desc}</p><div className="detail-meta"><span><Clock3 size={18} />{service.duration_min} minutes</span><strong>{inr(service.price)}</strong></div><p>{service.long_desc}</p><h2 className="detail-subheading">A little of what it offers</h2><ul className="detail-benefits">{service.benefits.map((benefit) => <li key={benefit}><Check size={18} />{benefit}</li>)}</ul><ButtonLink to={`/?service=${service.slug}#booking`}>Make time for this ritual</ButtonLink><div className="dosha-tags"><span>Traditionally associated with</span>{service.dosha_tags.map((tag) => <span key={tag}>{tag}</span>)}</div></Reveal></div><aside className="medical-disclaimer"><ShieldCheck size={25} /><div><h2>Your wellbeing comes first.</h2><p>{MEDICAL_DISCLAIMER}</p></div></aside><LeafDivider />{related.length > 0 && <section className="section-space"><h2 className="text-5xl mb-8">Kindred rituals</h2><div className="services-grid">{related.map((item) => <ServiceCard key={item.id} service={item} />)}</div></section>}<div className="detail-end"><Lotus /><p>Every visit begins with listening.</p></div></div></>;
}
