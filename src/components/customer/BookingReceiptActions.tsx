import React from 'react';
import type { Appointment } from '../../types';
import { bookingReceipt, downloadBookingReceipt } from '../../lib/platformPayments';

export function BookingReceiptActions({ booking }: { booking: Appointment }) {
  const receipt = bookingReceipt(booking);

  return (
    <section aria-label="Booking receipt" className="rounded-xl border border-slate-200 bg-white p-4 text-slate-900">
      <dl className="mb-4 space-y-2 text-sm">
        <div><dt className="font-semibold">Booking ID</dt><dd className="break-all">{booking.id}</dd></div>
        <div><dt className="font-semibold">Service</dt><dd>{booking.serviceName}</dd></div>
        <div><dt className="font-semibold">Appointment</dt><dd>{booking.date} · {booking.time} IST</dd></div>
        <div><dt className="font-semibold">{booking.paymentId ? 'Paid' : 'Pay at venue'}</dt><dd>₹{(booking.paymentId ? booking.amountPaid : booking.servicePrice - booking.amountPaid).toLocaleString('en-IN')}</dd></div>
        {booking.paymentId && <div><dt className="font-semibold">Transaction ID</dt><dd className="break-all">{booking.paymentId}</dd></div>}
      </dl>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <button type="button" className="underline" onClick={() => downloadBookingReceipt(booking)}>Download receipt</button>
        {receipt.whatsappUrl && <a className="underline" href={receipt.whatsappUrl} target="_blank" rel="noopener noreferrer">Send receipt on WhatsApp</a>}
      </div>
    </section>
  );
}

export function BookingPaymentOptions({ method, onChange, venue, locked }: {
  method: 'online' | 'venue'; onChange: (method: 'online' | 'venue') => void; venue: boolean; locked: boolean;
}) {
  return (
    <fieldset disabled={locked} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-900">
      <legend className="px-1 font-semibold">Payment options</legend>
      <label className="flex cursor-pointer items-center gap-2">
        <input type="radio" checked={method === 'online'} onChange={() => onChange('online')} />
        <span>Online payment · UPI, cards or netbanking via Razorpay</span>
      </label>
      {venue && <label className="flex cursor-pointer items-center gap-2">
        <input type="radio" checked={method === 'venue'} onChange={() => onChange('venue')} />
        <span>Pay at Venue</span>
      </label>}
    </fieldset>
  );
}
