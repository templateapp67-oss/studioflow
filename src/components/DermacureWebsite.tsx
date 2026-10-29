import { useRevealRecovery } from "./dermacure/useRevealRecovery";
import type { CSSProperties } from "react";
import type { Stylist } from "../types";
import type { SalonGalleryPhoto } from "../lib/photoGallery";
import { ClinicGallery } from "./dermacure/ClinicGallery";
import { ClinicTeam } from "./dermacure/ClinicTeam";
import { PatientReviews } from "./dermacure/PatientReviews";
import {
  AppAnnouncementStrip,
  CustomerAppPromotion,
} from "./CustomerAppPromotion";
import { DermacureContext, useDermacureState } from "./dermacure/context";
import { Header } from "./dermacure/Header";
import { HeroSection } from "./dermacure/HeroSection";
import { BrandPhilosophy } from "./dermacure/BrandPhilosophy";
import { FeaturedTreatments } from "./dermacure/FeaturedTreatments";
import { TechnologyShowcase } from "./dermacure/TechnologyShowcase";
import { ServicesSection } from "./dermacure/ServicesSection";
import { ResultsSection } from "./dermacure/ResultsSection";
import { PersonalizedCare } from "./dermacure/PersonalizedCare";
import { PatientJourney } from "./dermacure/PatientJourney";
import { TestimonialsSection } from "./dermacure/TestimonialsSection";
import { BookingSection } from "./dermacure/BookingSection";
import { ContactSection } from "./dermacure/ContactSection";
import { PlatformSections } from "./dermacure/PlatformSections";
import { PopularTreatments, TreatmentStories, CurrentOffers, ClinicFAQ } from "./dermacure/DiscoverySections";
import { PatientBenefits } from "./dermacure/PatientBenefits";
import { ClinicJournal } from "./dermacure/ClinicJournal";
import { ClinicEnquiryDialog } from "./dermacure/ClinicEnquiryDialog";
import { Footer } from "./dermacure/Footer";

export function DermacureWebsite(
  props: Parameters<typeof useDermacureState>[0] & {
    galleryPhotos?: SalonGalleryPhoto[];
    stylists?: Stylist[];
    onViewStaff?: (id: string) => void;
    onBookStaff?: (staff: Stylist) => void;
    customerPhotoUrl?: string;
    customerName?: string;
  },
) {
  const state = useDermacureState({ ...props, hasTeam: Boolean(props.stylists?.length && props.onViewStaff) });
  useRevealRecovery();
  return (
    <DermacureContext.Provider value={state}>
      <div className="dc-announcement">
        <AppAnnouncementStrip />
      </div>
      <div
        className="dc"
        style={{ "--dc-host-offset": `${state.hostOffset}px` } as CSSProperties}
      >
        {!props.profile.subdomain && <p className="dc-booking-notice" role="note">Template preview: sample treatments, team profiles and images are not verified clinic information.</p>}
        <Header
          customerName={props.customerName}
          customerPhotoUrl={props.customerPhotoUrl}
        />
        <main>
          {state.bookingNotice && (
            <p className="dc-booking-notice" role="status">
              {state.bookingNotice}
            </p>
          )}
          <HeroSection />
          <FeaturedTreatments />
          <PopularTreatments />
          <BrandPhilosophy />
          <ServicesSection />
          <TechnologyShowcase />
          <ResultsSection />
          <ClinicGallery photos={props.galleryPhotos} />
          <ClinicTeam
            staff={props.stylists}
            onView={props.onViewStaff}
            onBook={props.onBookStaff}
          />
          <PersonalizedCare />
          <PatientJourney />
          <TreatmentStories />
          <CurrentOffers />
          <PatientBenefits />
          <TestimonialsSection />
          <PatientReviews />
          <ClinicJournal />
          <ClinicFAQ />
          <BookingSection />
          <ContactSection />
          <PlatformSections />
          <CustomerAppPromotion />
        </main>
        <Footer />
        <ClinicEnquiryDialog />
      </div>
    </DermacureContext.Provider>
  );
}
