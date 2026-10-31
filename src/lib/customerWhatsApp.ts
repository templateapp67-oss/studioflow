/**
 * WhatsApp normalization and validation for Nexora customers.
 * Handles +91 country code and 10-digit national formatting.
 */

export function customerWhatsApp(national: string): string | undefined {
  const digits = national.replace(/\D/g, '');
  if (digits.length !== 10) return undefined;
  return `+91${digits}`;
}

export function whatsappNational(full: string): string {
  if (!full) return '';
  // Remove +91 if present
  if (full.startsWith('+91')) {
    return full.slice(3).replace(/\D/g, '');
  }
  return full.replace(/\D/g, '').slice(-10);
}

export function validCustomerWhatsApp(national: string): boolean {
  const digits = national.replace(/\D/g, '');
  // Must be exactly 10 digits and not start with 0
  return digits.length === 10 && !digits.startsWith('0');
}

/**
 * Generates a WhatsApp click-to-chat link.
 */
export function whatsAppLink(phone: string, text?: string): string {
  const normalized = phone.replace(/[^\d+]/g, '');
  const url = new URL(`https://wa.me/${normalized}`);
  if (text) {
    url.searchParams.set('text', text);
  }
  return url.toString();
}
