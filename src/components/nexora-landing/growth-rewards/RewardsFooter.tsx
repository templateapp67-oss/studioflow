import { REWARDS_FOOTER_LINKS } from './content';

export function RewardsFooter() {
  return (
    <footer className="ngr-footer">
      <div className="ngr-container ngr-footer__bar">
        <a href="/" className="ngr-footer__brand">
          <span className="ngr-brand__mark ngr-brand__mark--small" aria-hidden="true">N</span>
          <span>
            NEXORA <span className="ngr-footer__product">SALON OS</span>
          </span>
        </a>
        <nav aria-label="Footer navigation">
          <ul className="ngr-footer__links">
            {REWARDS_FOOTER_LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href}>{link.label}</a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
