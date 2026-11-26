// Payment Links are identified by plink_*; their create response does not
// guarantee an order_id. Verify payment membership from the fetched link's
// captured payments instead of trusting an arbitrary webhook payment.
type Row = Record<string, any>;

export function paymentLinkOrderKey(linkId: string): string {
  if (!/^plink_[A-Za-z0-9]+$/.test(linkId)) throw new Error('Invalid Razorpay Payment Link ID');
  return 'wa_link_' + linkId;
}

export function verifiedLinkPaymentId(link: Row, saved: Row, eventPaymentId?: string): string {
  if (
    link.id !== saved.payment_link_id ||
    link.status !== 'paid' ||
    link.currency !== 'INR' ||
    Number(link.amount) !== Number(saved.amount_paise) ||
    Number(link.amount_paid) !== Number(saved.amount_paise) ||
    link.notes?.studioflow_booking !== saved.booking_id
  ) {
    throw new Error('Razorpay Payment Link does not match the saved booking');
  }

  const captured = (Array.isArray(link.payments) ? link.payments : [])
    .filter((row: Row) => row.status === 'captured' && Number(row.amount) === Number(saved.amount_paise));
  const member = captured.find((row: Row) => !eventPaymentId || row.payment_id === eventPaymentId);
  if (!member || typeof member.payment_id !== 'string' || !/^pay_[A-Za-z0-9]+$/.test(member.payment_id)) {
    throw new Error('Captured payment is not a member of this Razorpay Payment Link');
  }
  return member.payment_id;
}

export function verifyLinkPayment(payment: Row, link: Row, saved: Row, paymentId: string): void {
  // Older rows may contain a real provider order ID. New rows can use the
  // deterministic local link key when Razorpay does not return order_id.
  const localKey = paymentLinkOrderKey(link.id);
  if (saved.order_id !== localKey && payment.order_id !== saved.order_id) {
    throw new Error('Payment does not match the saved Razorpay order');
  }
  if (
    payment.id !== paymentId ||
    payment.status !== 'captured' ||
    payment.currency !== 'INR' ||
    Number(payment.amount) !== Number(saved.amount_paise) ||
    (link.order_id && payment.order_id !== link.order_id)
  ) {
    throw new Error('Payment capture does not match the exact INR booking advance');
  }
}
