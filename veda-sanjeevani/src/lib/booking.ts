import { z } from 'zod';
import { isIndianPhone } from './format';
export const bookingDetailsSchema = z.object({
  name: z.string().trim().min(2, 'Please enter at least 2 characters.').max(80, 'Please use no more than 80 characters.'),
  phone: z.string().refine(isIndianPhone, 'Enter a valid Indian mobile number: 10 digits starting with 6–9.'),
  email: z.string().trim().max(254).refine((value) => !value || z.string().email().safeParse(value).success, 'Please enter a valid email address, or leave it blank.'),
  notes: z.string().trim().max(500, 'Please keep notes under 500 characters.'),
  website: z.string().max(200),
});
export type BookingDetails = z.infer<typeof bookingDetailsSchema>;
export const BOOKING_ERROR_COPY: Record<string, string> = {
  SLOT_TAKEN: 'That slot was just taken, please pick another.',
  RATE_LIMITED: 'You’ve made a few requests recently. Please wait a little before trying again.',
  CLOSED: 'The studio is closed at that time. Please choose another available slot.',
  PAST_TIME: 'That time is too soon to book. Please choose a slot at least two hours ahead.',
  INVALID_INPUT: 'Please check your details and selected ritual, then try again.',
  INTERNAL: 'We couldn’t confirm your booking just now. Please try again or contact the studio.',
};
