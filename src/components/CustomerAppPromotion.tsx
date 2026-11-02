/**
 * Compatibility shim.
 *
 * The app-install banner moved to `./AppInstallSection` (one shared, theme-aware
 * component used by all 14 templates) and its install/deep-link helpers moved to
 * `../lib/customerApp`. Everything that used to be exported from here is still
 * re-exported so existing imports keep working — but new code should import
 * `AppInstallSection` directly.
 */
export {
  CUSTOMER_APP_AVAILABILITY,
  CUSTOMER_APP_INSTALL_ROUTE,
  CUSTOMER_APP_POSTER,
  CUSTOMER_APP_POSTER_HEIGHT,
  CUSTOMER_APP_POSTER_WIDTH,
  CUSTOMER_APP_ROUTE,
  customerAppCaption,
  shareCustomerApp,
} from '../lib/customerApp';

export { AppAnnouncementStrip, AppInstallSection } from './AppInstallSection';
export type { AppInstallSectionProps } from './AppInstallSection';

import { AppInstallSection } from './AppInstallSection';

/** @deprecated Use `AppInstallSection`. */
export const CustomerAppPromotion = AppInstallSection;
