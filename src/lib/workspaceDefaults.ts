export type Extras = {
  gallery: string[];
  cancellationWindow: number;
  bookingLeadHours: number;
  enableEmailReminders: boolean;
  enableSmsReminders: boolean;
  policies: { cancellation: string; lateArrival: string; refund: string };
  whiteLabel: { platformName: string; supportEmail: string; customDomain: string; poweredBy: boolean; faviconUrl: string };
};

export const DEFAULT_EXTRAS: Extras = {
  gallery: [], cancellationWindow: 24, bookingLeadHours: 2,
  enableEmailReminders: true,
  enableSmsReminders: true,
  policies: {
    cancellation: 'Free cancellation up to 24 hours before the appointment.',
    lateArrival: 'Appointments may be shortened after a 15-minute delay.',
    refund: 'Deposits are transferable once and are otherwise non-refundable.',
  },
  whiteLabel: { platformName: 'StudioFlow', supportEmail: 'support@yourbrand.com', customDomain: '', poweredBy: false, faviconUrl: '' },
};

