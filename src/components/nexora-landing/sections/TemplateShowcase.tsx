import { ArrowUpRight, Scissors } from 'lucide-react';
import { NEXORA_TEMPLATE_CARDS } from '../../../lib/nexoraLandingContent';
import { NEXORA_TEMPLATE_META } from '../../../lib/nexoraTemplateCatalogue';

export function TemplateShowcase() {
  return <section className="nl-section nl-templates" id="templates"><div className="nl-wrap">
    <div className="nl-section-head"><span className="nl-kicker">WEBSITE STARTING POINTS</span><h2>Explore the salon template collection</h2><p>Browse the NEXORA template catalogue. These are product templates—not partner salons or customer endorsements.</p></div>
    <div className="nl-fact-chip"><b>{NEXORA_TEMPLATE_META.length}</b><span>distinct salon website templates in the current catalogue</span></div>
    <div className="nl-template-grid">{NEXORA_TEMPLATE_CARDS.map((template,index)=><a className="nl-template-card" href={template.path} key={template.id}>
      <span className={`nl-template-swatch swatch-${index%4}`}><Scissors size={20}/></span><span><b>{template.name}</b><small>{template.category}</small></span><ArrowUpRight size={16}/>
    </a>)}</div>
  </div></section>;
}
