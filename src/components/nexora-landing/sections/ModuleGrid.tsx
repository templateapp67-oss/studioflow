import { ArrowRight } from 'lucide-react';
import { FEATURE_CATEGORIES } from '../../../lib/nexoraPricing';
import { NEXORA_LANDING_COPY } from '../../../lib/nexoraLandingContent';

export function ModuleGrid() {
  return <section className="nl-section nl-modules" id="platform"><div className="nl-wrap">
    <div className="nl-section-head"><span className="nl-kicker">PLATFORM AREAS</span><h2>{NEXORA_LANDING_COPY.featuresTitle}</h2><p>Browse the areas used in the plan comparison. A listed feature is not automatically included in every plan.</p></div>
    <div className="nl-module-grid">{FEATURE_CATEGORIES.map(category=><a className="nl-module-card" href="/pricing#comparison" key={category.id}><span className="nl-module-icon">{category.items.length}</span><h3>{category.label}</h3><p>{category.items.slice(0,3).map(item=>item.label).join(' · ')}</p><span className="nl-module-link">Check plan details <ArrowRight size={14}/></span></a>)}</div>
  </div></section>;
}
