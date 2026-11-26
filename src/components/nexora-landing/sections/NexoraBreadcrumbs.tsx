import {
  nexoraBreadcrumbsForPath,
  type NexoraBreadcrumbItem,
} from '../../../lib/nexoraBreadcrumbs';
import './nexoraBreadcrumbs.css';

/**
 * Accessible breadcrumb trail for the public NEXORA marketing pages.
 *
 * On phones, intermediate ancestors are collapsed behind a native ellipsis
 * disclosure; the first item and immediate parent remain visible, and the
 * omitted ancestor links are available when the disclosure is opened.
 */
export function NexoraBreadcrumbs({
  path,
  items,
}: {
  path?: string;
  items?: readonly NexoraBreadcrumbItem[];
}) {
  const breadcrumbs = items ?? nexoraBreadcrumbsForPath(path ?? '/');
  if (!breadcrumbs?.length) return null;

  return (
    <nav className="nx-breadcrumbs" aria-label="Breadcrumb">
      <ol className="nx-breadcrumbs__list">
        {breadcrumbs.map((crumb, index) => {
          const current = index === breadcrumbs.length - 1;
          const immediateParent = breadcrumbs.length > 3 && index === breadcrumbs.length - 2;
          const collapsedMiddle = breadcrumbs.length > 3 && index > 0 && index < breadcrumbs.length - 2;
          const hiddenAncestors = immediateParent ? breadcrumbs.slice(1, -2) : [];

          if (!current && !crumb.href) {
            throw new Error(`Breadcrumb ancestor "${crumb.label}" must have a destination.`);
          }

          return (
            <li
              className={`nx-breadcrumbs__item${collapsedMiddle ? ' nx-breadcrumbs__item--middle' : ''}`}
              key={`${crumb.href ?? ''}-${crumb.label}-${index}`}
            >
              {immediateParent ? (
                <details className="nx-breadcrumbs__collapsed">
                  <summary aria-label={`Show ${hiddenAncestors.length} hidden breadcrumb ${hiddenAncestors.length === 1 ? 'page' : 'pages'}`}>
                    <span className="nx-breadcrumbs__separator" aria-hidden="true">›</span>
                    <span className="nx-breadcrumbs__ellipsis" aria-hidden="true">…</span>
                  </summary>
                  <ol className="nx-breadcrumbs__collapsed-list">
                    {hiddenAncestors.map((hidden) => (
                      <li key={`${hidden.href}-${hidden.label}`}>
                        <a href={hidden.href}>{hidden.label}</a>
                      </li>
                    ))}
                  </ol>
                </details>
              ) : null}
              {index > 0 ? <span className="nx-breadcrumbs__separator" aria-hidden="true">›</span> : null}
              {current ? (
                <span className="nx-breadcrumbs__label" aria-current="page">{crumb.label}</span>
              ) : (
                <a className="nx-breadcrumbs__label" href={crumb.href}>{crumb.label}</a>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
