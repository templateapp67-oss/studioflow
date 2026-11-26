import { BarChart3, CalendarDays, CreditCard, Globe2, HeartHandshake, LayoutDashboard, Scissors, UsersRound, ArrowRight } from 'lucide-react';
import { PRICING_BENEFITS, PRICING_PAGE_COPY } from '../../../lib/nexoraPricing';

const benefitIcons = { workspace: LayoutDashboard, calendar: CalendarDays, customers: UsersRound, payments: CreditCard, staff: Scissors, retention: HeartHandshake, analytics: BarChart3, online: Globe2 };

export function Benefits() {
  return <section className="np-section np-benefits"><div className="np-container np-benefits-grid"><div className="np-benefit-intro"><span className="np-section-kicker">{PRICING_PAGE_COPY.benefits.eyebrow}</span><h2>{PRICING_PAGE_COPY.benefits.title}</h2><p>{PRICING_PAGE_COPY.benefits.description}</p><a href="/#features">Explore platform features <ArrowRight size={16}/></a></div><div className="np-benefit-list">{PRICING_BENEFITS.map(({title,description,icon})=>{const Icon=benefitIcons[icon];return <article key={title}><span><Icon size={19}/></span><div><h3>{title}</h3><p>{description}</p></div></article>;})}</div></div></section>;
}
