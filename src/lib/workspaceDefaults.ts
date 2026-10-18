import {readySalonPolicies} from './salonPolicies';
export type Extras = {
  gallery: string[];
  cancellationWindow: number;
  bookingLeadHours: number;
  policies: { cancellation: string; lateArrival: string; refund: string };
  whiteLabel: { platformName: string; supportEmail: string; customDomain: string; poweredBy: boolean; faviconUrl: string };
};

export const DEFAULT_EXTRAS: Extras = {
  gallery: [], cancellationWindow: 24, bookingLeadHours: 2,
  policies: readySalonPolicies(24),
  whiteLabel: { platformName: 'StudioFlow', supportEmail: 'support@yourbrand.com', customDomain: '', poweredBy: false, faviconUrl: '' },
};

