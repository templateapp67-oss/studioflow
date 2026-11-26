export function whatsappNational(value:string){const digits=value.replace(/\D/g,'');return digits.length===12&&digits.startsWith('91')?digits.slice(2):digits.length===14&&digits.startsWith('0091')?digits.slice(4):digits}
export function validCustomerWhatsApp(value:string){return !value||/^[1-9]\d{9}$/.test(whatsappNational(value))}
export function customerWhatsApp(value:string){return value?'+91'+whatsappNational(value):null}


/**
 * Normalize a salon owner's WhatsApp number for wa.me links.
 * Indian 10-digit mobile numbers receive country code 91.
 * Never fall back to a phone number, demo number, or NEXORA number.
 */
export function salonWhatsAppDigits(value: string | null | undefined): string {
  const rawDigits = String(value || '').trim().replace(/\D/g, '');
  const withoutInternationalPrefix = rawDigits.startsWith('00')
    ? rawDigits.slice(2)
    : rawDigits;
  const nationalDigits = withoutInternationalPrefix.replace(/^0(?=\d{10}$)/, '');
  const internationalDigits = nationalDigits.length === 10
    ? '91' + nationalDigits
    : nationalDigits;
  return /^\d{8,15}$/.test(internationalDigits) ? internationalDigits : '';
}

export function salonWhatsAppUrl(value: string | null | undefined, message: string): string {
  const digits = salonWhatsAppDigits(value);
  return digits
    ? 'https://wa.me/' + digits + '?text=' + encodeURIComponent(String(message || '').trim().slice(0, 1500))
    : '';
}
