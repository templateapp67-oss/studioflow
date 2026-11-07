import { CalendarDays, Settings2, ShieldCheck } from 'lucide-react';
import { NEXORA_LANDING_COPY, NEXORA_WORKFLOW_CARDS } from '../../../lib/nexoraLandingContent';

const icons = [CalendarDays, Settings2, ShieldCheck] as const;

export function WorkflowSection() {
  return <section className="nl-section nl-workflows" id="workflows"><div className="nl-wrap">
    <div className="nl-section-head"><span className="nl-kicker">DAY-TO-DAY OPERATIONS</span><h2>{NEXORA_LANDING_COPY.workflowsTitle}</h2><p>These are product workflow areas, not promises about revenue, time saved or customer outcomes.</p></div>
    <div className="nl-workflow-grid">{NEXORA_WORKFLOW_CARDS.map((item,index)=>{const Icon=icons[index];return <article className="nl-workflow-card" key={item.title}><span><Icon size={18}/></span><h3>{item.title}</h3><p>{item.body}</p></article>;})}</div>
  </div></section>;
}
