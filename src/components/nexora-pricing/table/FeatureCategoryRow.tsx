import type { FeatureCategory } from '../../../lib/nexoraPricing';

/**
 * Full-width category separator for the comparison table.
 *
 * Rendered as a `<th scope="colgroup">` row spanning the feature column and all
 * four plan columns, so assistive technology announces the category once rather
 * than repeating it per plan. Styled as prominent Nexora-red text on white with a
 * thin light-grey divider, matching the approved reference.
 */
export function FeatureCategoryRow({
  category,
  planCount,
  featureCount,
}: {
  category: Pick<FeatureCategory, 'id' | 'label'>;
  planCount: number;
  featureCount?: number;
}) {
  return (
    <tr className="nx-cat" data-category={category.id}>
      <th scope="colgroup" colSpan={planCount + 1} className="nx-cat__cell">
        <span className="nx-cat__name">{category.label}</span>
        {typeof featureCount === 'number' ? (
          <span className="nx-cat__count">
            {featureCount} {featureCount === 1 ? 'feature' : 'features'}
          </span>
        ) : null}
      </th>
    </tr>
  );
}
