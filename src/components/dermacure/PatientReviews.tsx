import { CustomerReviewPanel } from "../CustomerReviewPanel";
import { ExternalReviewFeed } from "../ExternalReviewFeed";
import { useDermacure } from "./context";
export function PatientReviews() {
  const { profile, visible, customerSignedIn, onAccount, services } =
    useDermacure();
  if (!visible.testimonials || !profile.subdomain) return null;
  return (
    <section className="dc-section dc-patient-reviews" id="salon-testimonials">
      <div className="dc-container">
        <p className="dc-eyebrow">YOUR EXPERIENCE MATTERS</p>
        <h2>
          What our <em>community says.</em>
        </h2>
        {profile.reviewSource?.mode !== "simulation" && (
          <ExternalReviewFeed profile={profile} />
        )}
        <CustomerReviewPanel
          authenticOnly
          businessType={profile.businessType}
          slug={profile.subdomain}
          fallbackReviews={[]}
          signedIn={customerSignedIn}
          services={services.map((s) => s.name)}
          onLogin={onAccount}
        />
      </div>
    </section>
  );
}
