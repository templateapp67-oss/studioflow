import { NEXORA_LANDING_COPY, NEXORA_OVERVIEW_FACTS } from '../../../lib/nexoraLandingContent';

export function VerifiedOverview() {
  return <section className="nl-section nl-overview"><div className="nl-wrap">
    <div className="nl-section-head"><span className="nl-kicker">PLATFORM OVERVIEW</span><h2>{NEXORA_LANDING_COPY.overviewTitle}</h2><p>{NEXORA_LANDING_COPY.overviewNote}</p></div>
    <div className="nl-overview-grid">{NEXORA_OVERVIEW_FACTS.map(fact=><article key={fact.label}><strong>{fact.value}</strong><span>{fact.label}</span></article>)}</div>
  </div></section>;
}
