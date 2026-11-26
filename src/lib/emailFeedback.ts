export type BookingEmailFeedbackResult = {
  success?: boolean;
  delivered?: boolean;
  simulated?: boolean;
  error?: string;
  notice?: string;
};

/** Never report an unconfirmed/simulated provider result as delivered. */
export function bookingEmailFeedback(
  result: BookingEmailFeedbackResult,
  recipient: string,
  kind: 'Confirmation' | 'Reminder' = 'Confirmation',
): string {
  if (!result.success) return result.error || result.notice || `${kind} email could not be sent.`;
  if (result.delivered) return `${kind} email delivered to ${recipient}.`;
  return result.notice || `${kind} email prepared for ${recipient}; delivery is not confirmed.`;
}
