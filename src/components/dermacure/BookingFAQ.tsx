/** Answers describe the existing workflow, not unverified clinical promises. */
export function BookingFAQ() {
  return (
    <div className="dc-faq" aria-label="Consultation booking questions">
      <details>
        <summary>Does choosing a time confirm my appointment?</summary>
        <p>
          No. Available times are checked again during checkout. Follow the
          booking steps and check the final confirmation status before your
          visit.
        </p>
      </details>
      <details>
        <summary>What should I include in the optional message?</summary>
        <p>
          You can briefly describe what you would like to discuss. Do not
          include medical records or sensitive health information in this field.
        </p>
      </details>
    </div>
  );
}
