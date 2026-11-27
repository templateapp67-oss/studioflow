import {
  bookingEmailTemplate,
  paymentReceiptTemplate,
  formatINR,
} from "./resendEmail.ts";

Deno.test("booking confirmation renders safe customer and appointment details", () => {
  const mail = bookingEmailTemplate({
    bookingId: "booking-1",
    bookingReference: "NX-JPR-12345",
    recipientEmail: "customer@example.com",
    customerName: "<script>alert(1)</script>",
    salonName: "NEXORA Jaipur",
    serviceName: "Hair spa",
    stylistName: "Asha",
    date: "Friday, 27 November 2026",
    time: "5:30 PM",
    totalAmount: 2000,
    amountPaid: 500,
    salonAddress: "Jaipur",
  });

  if (!mail.html.includes("&lt;script&gt;")) {
    throw new Error("Customer-supplied names must be HTML-escaped");
  }
  if (!mail.html.includes("NX-JPR-12345") || !mail.text.includes("Hair spa")) {
    throw new Error("Booking reference and service must be present");
  }
  if (!mail.html.includes("₹") || !mail.html.includes("Balance due")) {
    throw new Error("Booking email must include INR totals and balance");
  }
});

Deno.test("home-service booking includes customer address and instructions", () => {
  const mail = bookingEmailTemplate({
    bookingId: "booking-2",
    bookingReference: "NX-JPR-12346",
    recipientEmail: "customer@example.com",
    customerName: "Customer",
    salonName: "NEXORA Jaipur",
    serviceName: "Bridal makeup",
    date: "27 November 2026",
    time: "11:00 AM",
    totalAmount: 10000,
    amountPaid: 2500,
    serviceType: "home_service",
    homeServiceAddress: "Mansarovar, Jaipur",
    homeServiceInstructions: "Call on arrival",
  });

  if (!mail.html.includes("Mansarovar, Jaipur") || !mail.text.includes("Call on arrival")) {
    throw new Error("Home service location and instructions must be included");
  }
  if (!mail.html.includes("Home service")) {
    throw new Error("Home-service type must be explicit");
  }
});

Deno.test("payment receipt contains payment reference, INR and advance summary", () => {
  const mail = paymentReceiptTemplate({
    bookingId: "booking-3",
    paymentId: "pay_test_123",
    recipientEmail: "customer@example.com",
    customerName: "Customer",
    salonName: "NEXORA Jaipur",
    bookingReference: "NX-JPR-12347",
    paymentDate: "27 Nov 2026, 5:30 pm IST",
    paymentMethod: "upi",
    transactionAmount: 250,
    totalAmount: 1000,
    amountPaidToDate: 250,
    balanceDue: 750,
    depositPercent: 25,
  });

  if (!mail.subject.includes("pay_test_123")) {
    throw new Error("Receipt subject must contain the payment reference");
  }
  if (!mail.html.includes("25%") || !mail.html.includes("Balance due")) {
    throw new Error("Receipt must describe deposit percentage and remaining balance");
  }
  if (!mail.text.includes("₹250.00") || !mail.text.includes("₹750.00")) {
    throw new Error("Receipt plain-text fallback must include INR totals");
  }
});

Deno.test("INR formatter rejects invalid amounts", () => {
  let rejected = false;
  try { formatINR(Number.NaN); } catch { rejected = true; }
  if (!rejected) throw new Error("Non-finite INR amounts must be rejected");
});
