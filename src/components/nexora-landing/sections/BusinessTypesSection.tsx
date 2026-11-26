import { LandingIcon } from '../icons';
import { SectionHeading } from '../ui';
import { useLandingModel } from '../LandingContentProvider';

export function BusinessTypesSection({ id = 'solutions', aliasId }: { id?: string; aliasId?: string }) {
  const { copy, businessTypes, facts } = useLandingModel();

  return (
    <section className="sl-section sl-section--soft" id={id} aria-labelledby="sl-solutions-title">
      {aliasId ? <span id={aliasId} className="sl-anchor-target" aria-hidden="true" /> : null}
      <div className="sl-container">
        <SectionHeading
          eyebrow="WHO IT'S FOR"
          id="sl-solutions-title"
          title={copy.businessTypesTitle}
          description={copy.businessTypesDescription}
        />
        <ul className="sl-business-types">
          {businessTypes.map((type) => (
            <li key={type.id} className="sl-business-type">
              <span className="sl-business-type__icon">
                <LandingIcon name={type.icon} size={20} />
              </span>
              <h3>{type.title}</h3>
              <p>{type.description}</p>
            </li>
          ))}
        </ul>

        <ul className="sl-facts" aria-label="Nexora SalonOS platform facts">
          {facts.map((fact) => (
            <li key={fact.label}>
              <strong>{fact.value}</strong>
              <span>{fact.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
