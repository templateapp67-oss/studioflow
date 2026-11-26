import { LandingIcon } from '../icons';
import { SectionHeading } from '../ui';
import type { FeatureItem } from '../../../lib/nexoraPricing';
import { useLandingModel } from '../LandingContentProvider';

export function FeatureSections({ id = 'features', aliasId }: { id?: string; aliasId?: string }) {
  const { copy, featureGroups, featureItems } = useLandingModel();

  return (
    <section className="sl-section sl-section--soft" id={id} aria-labelledby="sl-features-title">
      {aliasId ? <span id={aliasId} className="sl-anchor-target" aria-hidden="true" /> : null}
      <div className="sl-container">
        <SectionHeading
          eyebrow="CORE FEATURES"
          id="sl-features-title"
          title={copy.featuresTitle}
          description={copy.featuresDescription}
        />

        <div className="sl-feature-grid">
          {featureGroups.map((category) => {
            const items = category.featureIds
              .map((id) => featureItems[id])
              .filter((item): item is FeatureItem => Boolean(item));
            return (
              <article className="sl-feature-card" key={category.id}>
                <span className="sl-feature-card__icon">
                  <LandingIcon name={category.icon} size={21} />
                </span>
                <h3>{category.title}</h3>
                <p className="sl-feature-card__benefit">{category.benefit}</p>
                <ul className="sl-feature-card__list">
                  {items.map((item) => (
                    <li key={item.id}>{item.label}</li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
