/**
 * WhatsApp click-to-chat helpers shared by the public NEXORA site and future
 * salon-template contact surfaces. This is a normal wa.me link; it does not
 * call the WhatsApp Business API or require backend credentials.
 */
export interface WhatsAppClickToChatOptions {
  /** A full international phone number, e.g. +91 7852877721. */
  phoneNumber: string;
  /** Optional text to place in the customer's WhatsApp message box. */
  prefilledMessage?: string;
}

export function buildWhatsAppClickToChatUrl({
  phoneNumber,
  prefilledMessage,
}: WhatsAppClickToChatOptions): string {
  const input = phoneNumber.trim();
  if (!input.startsWith('+') && !input.startsWith('00')) {
    throw new Error('Enter the WhatsApp number in full international format, including +country code.');
  }

  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (!/^[1-9]\d{7,14}$/.test(digits)) {
    throw new Error('WhatsApp numbers must contain 8 to 15 international digits and cannot start with zero.');
  }

  const message = prefilledMessage?.trim();
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}

/** NEXORA's official customer-support contact on the main marketing website. */
export const NEXORA_OFFICIAL_WHATSAPP_NUMBER = '+91 7852877721';
export const NEXORA_OFFICIAL_WHATSAPP_MESSAGE =
  "Hi, I found your website and I'd like more information about NEXORA Salon OS.";
export const NEXORA_OFFICIAL_WHATSAPP_URL = buildWhatsAppClickToChatUrl({
  phoneNumber: NEXORA_OFFICIAL_WHATSAPP_NUMBER,
  prefilledMessage: NEXORA_OFFICIAL_WHATSAPP_MESSAGE,
});
