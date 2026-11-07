import { Building2, CalendarDays, UsersRound, UserRound } from 'lucide-react';
import { NEXORA_LANDING_AUDIENCES, NEXORA_LANDING_COPY } from '../../../lib/nexoraLandingContent';

const icons = [Building2, UsersRound, UserRound, CalendarDays] as const;

export function AudienceSection() {
  return <section className="nl-section nl-audience" id="audience"><div className="nl-wrap">
    <div className="nl-section-head"><span className="nl-kicker">WHO IT SERVES</span><h2>{NEXORA_LANDING_COPY.audienceTitle}</h2><p>Specific features and access depend on the plan and workspace configuration.</p></div>
    <div className="nl-audience-grid">{NEXORA_LANDING_AUDIENCES.map((item,index)=>{const Icon=icons[index];return <article className="nl-info-card" key={item.title}><span><Icon size={19}/></span><h3>{item.title}</h3><p>{item.body}</p></article>;})}</div>
  </div></section>;
}
