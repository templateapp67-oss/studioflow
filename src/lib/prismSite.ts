export interface PrismLiveReview {
  id: string;
  author: string;
  rating: number;
  date: string;
  comment: string;
  serviceName?: string;
  status?: string;
  name?: string;
  verified?: boolean;
  isOwnerReview?: boolean;
  isMine?: boolean;
  salonReply?: string;
}

export interface PrismOffer {
  id: string;
  title: string;
  discount: string;
  code: string;
  validTill: string;
  serviceId?: string;
  description?: string;
}

export type PrismLiveOffer = PrismOffer;

export interface PrismEnquiryErrors {
  name?: string;
  phone?: string;
  email?: string;
  service?: string;
  preferredDate?: string;
}

export interface PrismSalonBusiness {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  whatsapp?: string;
  workingHoursDisplay?: string;
  mapEmbedUrl?: string;
}

export function getPrismSiteConfig() {
  return {
    newsletterTitle: 'Join the Prism Atelier VIP List',
    offersTitle: 'Current Prism Atelier Specials',
    reviewsTitle: 'Verified Client Transformations'
  };
}

export const prismSiteDefaults = {
  brandName: 'Prism & Chroma Hair Color Atelier',
  city: 'Mumbai',
  address: 'Linking Road, Bandra West',
  phone: '+91 98200 10010'
};

export const prismLiveBranches = [
  { name: 'Linking Road Atelier', address: 'Bandra West, Mumbai', phone: '+91 98200 10010' }
];

export const prismLiveGallery = [
  { url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80', title: 'Caramel Balayage' }
];

export const prismLivePackages = [
  { name: 'Prism Signature Balayage Package', price: 4900, duration: '120 mins' }
];

export const prismLiveStats = [
  { label: 'Color Transformations', value: '1,200+' },
  { label: 'Client Rating', value: '4.9 ★' }
];

export const prismLiveTransformations = [
  { before: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80', after: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80', title: 'Holographic Balayage' }
];

export function usePrismSite() {
  return {
    siteData: null,
    loading: false,
    error: null
  };
}

export function prismOfferValueLabel(offer: PrismOffer): string {
  return offer.discount || 'Special Discount';
}

export function prismOfferWindowLabel(offer: PrismOffer): string {
  return offer.validTill ? `Valid till ${offer.validTill}` : 'Limited time';
}

export function prismErrorMessage(err: any): string {
  if (typeof err === 'string') return err;
  return err?.message || 'An error occurred while communicating with Prism & Chroma server.';
}

export async function loadPrismOwnerInbox(): Promise<{ enquiries: any[]; subscribers: any[] }> {
  return {
    enquiries: [
      { id: 'enq-1', name: 'Ananya Roy', phone: '+91 98201 11223', service: 'Holographic Balayage', createdAt: 'Today 11:30 AM' }
    ],
    subscribers: [
      { id: 'sub-1', email: 'ananya.roy@example.com', subscribedAt: 'Yesterday' }
    ]
  };
}

export async function submitPrismReview(slug: string, review: Partial<PrismLiveReview>): Promise<PrismLiveReview> {
  return {
    id: `rev-${Date.now()}`,
    author: review.author || 'Anonymous Client',
    rating: review.rating || 5,
    date: 'Just now',
    comment: review.comment || 'Amazing color experience!',
    serviceName: review.serviceName,
    status: 'published'
  };
}

export function validatePrismNewsletterEmail(email: string): string | null {
  if (!email || !email.includes('@')) return 'Please enter a valid email address';
  return null;
}

export async function subscribePrismNewsletter(data: { slug: string; email: string }): Promise<boolean> {
  return Promise.resolve(true);
}

export async function fetchPrismOffers(slug: string): Promise<PrismOffer[]> {
  return [
    {
      id: 'po-1',
      title: 'Balayage & Gloss Special',
      discount: '15% OFF',
      code: 'PRISM15',
      validTill: 'This Weekend',
      description: 'Valid for all global color and highlights.'
    }
  ];
}

export function validatePrismEnquiry(data: any): PrismEnquiryErrors {
  const errors: PrismEnquiryErrors = {};
  if (!data?.name?.trim()) errors.name = 'Name is required';
  if (!data?.phone?.trim()) errors.phone = 'Phone number is required';
  return errors;
}

export async function submitPrismEnquiry(slug: string, data: any): Promise<{ success: boolean; id: string }> {
  return Promise.resolve({ success: true, id: `enq-${Date.now()}` });
}
