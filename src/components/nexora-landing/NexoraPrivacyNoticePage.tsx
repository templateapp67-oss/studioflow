import { useEffect } from 'react';
import { NEXORA_PUBLIC_ORIGIN } from '../../lib/publicSeo';
import { NEXORA_PRIVACY_NOTICE_VERSION } from '../../lib/nexoraPrivacyNotice';
import './nexoraLanding.css';

const PAGE_TITLE = 'Privacy notice — Nexora SalonOS demo requests';
const PAGE_DESCRIPTION =
  'How Nexora SalonOS collects, stores, uses and deletes the details you send with a demo request.';

/**
 * Public privacy notice for the demo-request form.
 *
 * The page states exactly what the lead service stores, where it is stored,
 * how long it is kept and how a visitor can have it removed. It deliberately
 * contains no contact address that is not configured, no tracking claim and
 * no promise the business has not approved.
 */
export function NexoraPrivacyNoticePage() {
  useEffect(() => {
    document.title = PAGE_TITLE;
    const upsertMeta = (attribute: 'name' | 'property', key: string, content: string) => {
      let node = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
      if (!node) {
        node = document.createElement('meta');
        node.setAttribute(attribute, key);
        document.head.appendChild(node);
      }
      node.setAttribute('content', content);
    };
    upsertMeta('name', 'description', PAGE_DESCRIPTION);
    upsertMeta('name', 'robots', 'index,follow');
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:site_name', 'NEXORA SALONOS');
    upsertMeta('property', 'og:title', PAGE_TITLE);
    upsertMeta('property', 'og:description', PAGE_DESCRIPTION);
    upsertMeta('property', 'og:url', `${NEXORA_PUBLIC_ORIGIN}/privacy`);
    upsertMeta('property', 'og:image', `${NEXORA_PUBLIC_ORIGIN}/nexora-homepage-og.jpg`);
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', PAGE_TITLE);
    upsertMeta('name', 'twitter:description', PAGE_DESCRIPTION);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = `${NEXORA_PUBLIC_ORIGIN}/privacy`;
  }, []);

  return (
    <div className="sl-page">
      <a className="sl-skip" href="#sl-main">
        Skip to main content
      </a>
      <header className="sl-header">
        <div className="sl-container sl-header__inner">
          <a className="sl-brand" href="/">
            <span className="sl-brand__mark" aria-hidden="true">
              N
            </span>
            <span className="sl-brand__text">
              <strong>NEXORA</strong>
              <span>SALONOS</span>
            </span>
          </a>
          <nav className="sl-header__nav" aria-label="Primary">
            <a className="sl-header__link" href="/pricing">
              Pricing
            </a>
            <a className="sl-header__link" href="/salon-os">
              Product
            </a>
            <a className="sl-header__link" href="/login">
              Sign in
            </a>
          </nav>
        </div>
      </header>

      <main id="sl-main" className="sl-main">
        <section className="sl-section">
          <div className="sl-container">
            <span className="sl-section-kicker">LEGAL</span>
            <h1 className="sl-section__title">Privacy notice for demo requests</h1>
            <p className="sl-section__lead">
              This notice describes what happens to the details you send with a demo request on this website.
              Version {NEXORA_PRIVACY_NOTICE_VERSION}.
            </p>

            <div className="sl-prose">
              <h2>What is collected</h2>
              <p>
                When you submit the demo request form we store your name, your email address, your salon or
                business name, and — only if you fill them in — your phone number and city. We also store the
                page you submitted the form from, the time of the request and the version of this notice that
                was in force. A marketing campaign is only recorded when the URL of the page you came from
                contains one.
              </p>

              <h2>Why it is collected</h2>
              <p>
                The details are used for one purpose: to answer your demo request and to plan the conversation
                that follows it. No marketing newsletter is sent from this form and your details are never sold
                or handed to a third-party advertising network.
              </p>

              <h2>Where it is stored</h2>
              <p>
                The request is written to a private lead register in the Nexora Supabase project that powers
                this website. The register is not readable by visitors: the browser submits the request through
                a validated submission service, and only an authorised manager of the register can open it.
              </p>
              <p>
                If a customer relationship system is connected for follow-up, the stored request is forwarded
                to it with a server-side credential. The forwarding step never replaces the stored register
                entry, so a failure there cannot lose your request.
              </p>

              <h2>How long it is kept</h2>
              <p>
                A demo request is kept for 180 days from the day it was received and is then deleted. If you
                ask us to delete it earlier, the request is removed as soon as an authorised manager processes
                the request, and the deletion is recorded in the register&rsquo;s audit trail.
              </p>

              <h2>Spam protection</h2>
              <p>
                The submission service limits how many requests one connection may send in a short period. For
                that purpose it stores a salted hash of the connection address for ten minutes. The address
                itself is never written to the lead register.
              </p>

              <h2>Your choices</h2>
              <p>
                You can ask for a copy of the details we hold, ask for them to be corrected, or ask for them to
                be deleted. Use the demo request form on this site and describe your request; an authorised
                manager of the lead register handles it. Nothing on this page is used to open a marketing
                relationship.
              </p>

              <h2>Changes to this notice</h2>
              <p>
                When this notice changes, its version number changes with it, and the version that applied to
                your request is stored together with it.
              </p>
            </div>

            <p>
              <a className="sl-btn sl-btn--primary" href="/pricing">
                Back to pricing
              </a>
            </p>
          </div>
        </section>
      </main>

      <footer className="sl-footer">
        <div className="sl-container">
          <p className="sl-footer__copy">© {new Date().getFullYear()} Nexora SalonOS.</p>
          <nav className="sl-footer__nav" aria-label="Footer">
            <a href="/pricing">Pricing</a>
            <a href="/salon-os">Product</a>
            <a href="/login">Sign in</a>
            <a href="/">Home</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
