/**
 * Customer-app install & deep-link plumbing shared by every template.
 *
 * These are the real routes the customer app listens on (`/?app=1` opens it,
 * `/?app=1&install=1` opens it straight into the install guide). Nothing here
 * invents a store listing: Nexora is a Chrome-installable PWA, so the copy and
 * the steps stay honest about that.
 */

/** Opens the customer app. */
export const CUSTOMER_APP_ROUTE = '/?app=1';

/** Opens the customer app directly on its install guide. */
export const CUSTOMER_APP_INSTALL_ROUTE = '/?app=1&install=1';

/** Bundled promotional poster (1122 x 1402, portrait). */
export const CUSTOMER_APP_POSTER = '/promo/nexora-customer-app-ad.png';

/** Intrinsic poster size — used for the aspect ratio so it is never cropped. */
export const CUSTOMER_APP_POSTER_WIDTH = 1122;
export const CUSTOMER_APP_POSTER_HEIGHT = 1402;

/** Honest availability line: Android/Chrome PWA install, no store download. */
export const CUSTOMER_APP_AVAILABILITY =
  'Android · Chrome से "Add to Home screen" — Play Store या APK की ज़रूरत नहीं';

export const customerAppCaption = (origin: string) =>
  `अब salon booking, सीधे Nexora app से! Salon खोजें, services चुनें और slot बुक करें। हर बार salon website खोलने की ज़रूरत नहीं। Android Chrome में link खोलें → ⋮ → Add to Home screen → Install.\n${origin}${CUSTOMER_APP_INSTALL_ROUTE}`;

/**
 * Shares the app link (plus the poster when the platform allows file sharing)
 * and falls back to the clipboard. Rejections named `AbortError` mean the
 * visitor closed the share sheet and are rethrown for the caller to ignore.
 */
export async function shareCustomerApp(includePoster = false): Promise<string> {
  const url = location.origin + CUSTOMER_APP_INSTALL_ROUTE;
  const text = customerAppCaption(location.origin).split('\n')[0];
  if (navigator.share) {
    if (includePoster && navigator.canShare) {
      try {
        const response = await fetch(CUSTOMER_APP_POSTER);
        if (!response.ok) throw new Error('Poster unavailable');
        const file = new File([await response.blob()], 'nexora-customer-app-ad.png', { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ title: 'Nexora Customer App', text, url, files: [file] });
          return 'App poster and link shared';
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') throw error;
      }
    }
    await navigator.share({ title: 'Nexora Customer App', text, url });
    return 'App link shared';
  }
  await navigator.clipboard.writeText(customerAppCaption(location.origin));
  return 'App message and link copied. Download the poster below to share it too.';
}
