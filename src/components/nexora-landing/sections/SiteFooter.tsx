import { ArrowRight } from 'lucide-react';
import { NexoraMark } from '../ui';
import { useDemoDialog } from '../../nexora-pricing/DemoProvider';
import { useLandingModel } from '../LandingContentProvider';

const LEGAL_LINKS = ['Privacy Policy', 'Terms and Conditions', 'Refund Policy'];

export function SiteFooter() {
  const { openDemo } = useDemoDialog();
  const { footerNav, footerDescription, footerCopyright, cta } = useLandingModel();
  const year = new Date().getFullYear();
  const copyright = footerCopyright.includes(String(year))
    ? footerCopyright
    : `© ${year} ${footerCopyright.replace(/^©\s*/, '')}`;

  return (
    <footer className="sl-footer">
      <div className="sl-container">
        <div className="sl-footer__main">
          <div className="sl-footer__brand">
            <a href="/">
              <NexoraMark tone="dark" />
            </a>
            <p>{footerDescription}</p>
            <div className="sl-footer__actions">
              <a className="sl-btn sl-btn--accent" href={cta.signup}>
                Get Started <ArrowRight size={15} aria-hidden="true" />
              </a>
              <button type="button" className="sl-btn sl-btn--on-dark" onClick={() => openDemo()}>
                Book a Demo
              </button>
            </div>
          </div>

          {footerNav.map((group) => (
            <nav key={group.title} className="sl-footer__nav" aria-label={`${group.title} links`}>
              <h2>{group.title}</h2>
              <ul>
                {group.links.map((link) => (
                  <li key={`${group.title}-${link.label}`}>
                    <a href={link.href}>{link.label}</a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="sl-footer__legal">
          <div>
            <h2>Legal</h2>
            <ul>
              {LEGAL_LINKS.map((label) => (
                <li key={label} className="sl-footer__unavailable">
                  <span>{label}</span>
                  <small>Not published yet</small>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2>Social</h2>
            <p>Official Nexora social destinations are not configured for this page, so no follow links are shown.</p>
          </div>
          <div>
            <h2>Support</h2>
            <p>
              Signed-in owners can use the support channel provided inside their Nexora account. For a walkthrough, use
              the demo request form on this page.
            </p>
          </div>
        </div>

        <div className="sl-footer__bottom">
          <p>{copyright}</p>
          <p>Made for salon, spa and beauty businesses in India.</p>
        </div>
      </div>
    </footer>
  );
}
