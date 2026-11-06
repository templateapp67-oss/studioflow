/**
 * AppInstallSection — the one app-install banner used by all 14 website
 * templates.
 *
 * It replaced a full-bleed, indigo-gradient panel that ignored the host
 * template, cropped its 1122x1402 poster into a 4:3 box and stacked an install
 * guide, a share row and a poster download into ~700px of vertical space.
 *
 * This version is a compact card (image left, copy right, ~200px tall on
 * desktop) that inherits the surrounding template's design system: every
 * colour, radius and font is read from `--ai-*` custom properties, which
 * `appInstallSection.css` binds to each template's own tokens (`.vd-site`,
 * `.bt-site`, `.iron-ink`, `.sf-page`, …). One implementation, sixteen looks.
 *
 * The poster is laid out from its intrinsic ratio with `object-fit: contain`,
 * so it is fully visible at every breakpoint and never stretched or cropped.
 *
 * The longer install guide and the share/poster tools are still here — folded
 * into a `<details>` disclosure so the banner stays compact without dropping
 * any existing capability or link.
 */
import React, { useState } from 'react';
import { ArrowUpRight, Download, Share2, Smartphone } from 'lucide-react';
import { PromotionalBanner } from './PromotionalBanner';
import {
  CUSTOMER_APP_AVAILABILITY,
  CUSTOMER_APP_INSTALL_ROUTE,
  CUSTOMER_APP_POSTER,
  CUSTOMER_APP_POSTER_HEIGHT,
  CUSTOMER_APP_POSTER_WIDTH,
  CUSTOMER_APP_ROUTE,
  customerAppCaption,
  shareCustomerApp,
} from '../lib/customerApp';

export interface AppInstallSectionProps {
  /** Small kicker above the heading. */
  eyebrow?: string;
  /** Promotional heading. Keep it to one line on desktop. */
  title?: React.ReactNode;
  /** One or two lines of supporting copy. */
  description?: React.ReactNode;
  /** Preview/promotional image. Defaults to the bundled Nexora poster. */
  image?: string;
  imageAlt?: string;
  /** Intrinsic image size — drives the aspect ratio so nothing is cropped. */
  imageWidth?: number;
  imageHeight?: number;
  /** Which side the preview image sits on. */
  imagePosition?: 'left' | 'right';
  /** Honest availability line. Pass `null` to hide it. */
  availability?: React.ReactNode | null;
  /** Install deep link. Uses the real customer-app install route by default. */
  installHref?: string;
  /** "Open app" link. Uses the real customer-app route by default. */
  openHref?: string;
  installLabel?: React.ReactNode;
  openLabel?: React.ReactNode;
  /** Replaces the install control entirely (the customer app passes its own). */
  installControl?: React.ReactNode;
  /** Hide the whole banner — honoured by templates that toggle sections. */
  hidden?: boolean;
  /** Extra class on the section root. */
  className?: string;
  id?: string;
  'aria-label'?: string;
}

const DEFAULT_TITLE = (
  <>
    आपका salon, <span className="app-install__title-nowrap">अब आपके phone में.</span>
  </>
);

const DEFAULT_DESCRIPTION =
  'Nexora app में salon search करें, services देखें और अपना slot बुक करें — हर booking के लिए website खोलने की ज़रूरत नहीं.';

export function AppInstallSection({
  eyebrow = 'NEXORA CUSTOMER APP',
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  image = CUSTOMER_APP_POSTER,
  imageAlt = 'Nexora customer app preview: salon खोजें, services चुनें और slot बुक करें.',
  imageWidth = CUSTOMER_APP_POSTER_WIDTH,
  imageHeight = CUSTOMER_APP_POSTER_HEIGHT,
  imagePosition = 'left',
  availability = CUSTOMER_APP_AVAILABILITY,
  installHref = CUSTOMER_APP_INSTALL_ROUTE,
  openHref = CUSTOMER_APP_ROUTE,
  installLabel = (
    <>
      <Download size={16} aria-hidden="true" />
      Install / Add to Home screen
    </>
  ),
  openLabel = (
    <>
      Open App
      <ArrowUpRight size={15} aria-hidden="true" />
    </>
  ),
  installControl,
  hidden = false,
  className = '',
  id = 'nexora-customer-app',
  'aria-label': ariaLabel = 'Install and share Nexora customer app',
}: AppInstallSectionProps) {
  const [notice, setNotice] = useState('');

  if (hidden) return null;

  async function share() {
    try {
      setNotice(await shareCustomerApp(true));
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        setNotice('Use Copy app link or download the poster to share.');
      }
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(customerAppCaption(location.origin));
      setNotice('App message and link copied');
    } catch {
      setNotice('Open the app link and copy it from your browser address bar.');
    }
  }

  return (
    <section
      className={`app-install${className ? ` ${className}` : ''}`}
      id={id}
      aria-label={ariaLabel}
      data-image-position={imagePosition}
    >
      <div className="app-install__card">
        <a
          className="app-install__media"
          href={installHref}
          aria-label="Open the Nexora app install guide"
        >
          <img
            src={image}
            alt={imageAlt}
            width={imageWidth}
            height={imageHeight}
            loading="lazy"
            decoding="async"
          />
        </a>

        <div className="app-install__body">
          {eyebrow ? (
            <p className="app-install__eyebrow">
              <Smartphone size={13} aria-hidden="true" />
              {eyebrow}
            </p>
          ) : null}

          <h2 className="app-install__title">{title}</h2>

          {description ? <p className="app-install__text">{description}</p> : null}

          <div className="app-install__actions">
            {installControl || (
              <a className="app-install__cta" href={installHref}>
                {installLabel}
              </a>
            )}
            <a className="app-install__cta app-install__cta--ghost" href={openHref}>
              {openLabel}
            </a>
          </div>

          <div className="app-install__foot">
            {availability ? <p className="app-install__availability">{availability}</p> : null}

            {/* The full guide, share and poster tools — collapsed so the banner
                stays inside its compact height budget. */}
            <details className="app-install__more">
              <summary>Install steps, share &amp; poster</summary>
              <div className="app-install__more-body">
                <h3>Android phone पर कैसे install करें?</h3>
                <ol>
                  <li>App link को Android Chrome में खोलें.</li>
                  <li>Install Nexora App दबाएं. Prompt न आए तो Chrome का ⋮ menu खोलें.</li>
                  <li>Add to Home screen → Install चुनें. फिर home screen के Nexora icon से app खोलें.</li>
                </ol>
                <p>
                  Chrome से install होने वाली web app है. Play Store या APK download की ज़रूरत नहीं.
                  दूसरे browsers में इसे link से खोल सकते हैं.
                </p>
                <div className="app-install__share">
                  <button type="button" onClick={() => void share()}>
                    <Share2 size={14} aria-hidden="true" />
                    Share App &amp; Poster
                  </button>
                  <button type="button" onClick={() => void copy()}>
                    Copy app link
                  </button>
                  <a href={CUSTOMER_APP_POSTER} download="nexora-customer-app-ad.png">
                    Download ad image
                  </a>
                </div>
                {notice ? (
                  <p className="app-install__notice" role="status">
                    {notice}
                  </p>
                ) : null}
              </div>
            </details>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Thin announcement strip shown above a template's header. Reads the same
 * `--ai-*` tokens as the banner, so it follows the host template too.
 */
export function AppAnnouncementStrip() {
  return (
    <PromotionalBanner
      label="Nexora app announcement"
      id="customer-app-v1"
      text="अब salon booking, सीधे Nexora app से! Salon खोजें और slot बुक करें."
      actionLabel="Open / Install App"
      actionHref={CUSTOMER_APP_INSTALL_ROUTE}
      className="app-install-strip"
    />
  );
}
