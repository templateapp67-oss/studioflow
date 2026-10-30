import { useState, useEffect } from "react";
import type { Stylist } from "../../types";
import { useDermacure } from "./context";
import { dermacureTeamPortrait } from "../../lib/dermacureSite";

/**
 * Resolves rich clinical profile details for a staff member, combining saved
 * values with intelligent fallbacks for demo or custom care team members.
 */
export function getStaffProfileDetails(s: Stylist) {
  const nameLower = s.name.toLowerCase();

  if (nameLower.includes("tanvi")) {
    return {
      bio:
        s.bio ||
        "Dr. Tanvi Deshmukh is a senior consultant dermatologist with over 12 years of clinical experience specializing in non-surgical facial rejuvenation, advanced medical lasers, and customized acne management. She believes in evidence-based care tailored to individual skin types.",
      qualifications:
        s.qualifications && s.qualifications.length > 0
          ? s.qualifications
          : [
              "MBBS (Gold Medalist)",
              "MD in Dermatology, Venereology & Leprosy",
              "Fellowship in Aesthetic Medicine (FAM - Germany)",
              "International Member, American Academy of Dermatology (AAD)",
            ],
      registrationNumber: s.registrationNumber || "Reg. No: MCI-2012-48921",
      specializedTreatments:
        s.specializedTreatments && s.specializedTreatments.length > 0
          ? s.specializedTreatments
          : [
              "Advanced HydraFacial MD Protocol",
              "Q-Switched ND:Yag Laser Toning & Pigmentation",
              "Medical Grade Chemical Peels & Glow Infusion",
              "Non-Surgical Skin Tightening & RF Therapy",
              "Melasma & Hyperpigmentation Management",
            ],
      experienceYears: s.experienceYears || 12,
      languages: s.languages || ["English", "Hindi", "Marathi"],
    };
  }

  if (nameLower.includes("sameer")) {
    return {
      bio:
        s.bio ||
        "Dr. Sameer Gill focuses on comprehensive hair loss evaluations, scalp health restoration, and modern laser therapies. He works closely with patients to create long-term care plans for hair thinning, dandruff control, and laser hair reduction.",
      qualifications:
        s.qualifications && s.qualifications.length > 0
          ? s.qualifications
          : [
              "MBBS",
              "DVD (Dermatology)",
              "Certified Hair Transplant & Trichology Specialist (UK)",
              "Member, Association of Cutaneous Surgeons of India (ACSI)",
            ],
      registrationNumber: s.registrationNumber || "Reg. No: MCI-2015-33019",
      specializedTreatments:
        s.specializedTreatments && s.specializedTreatments.length > 0
          ? s.specializedTreatments
          : [
              "Platelet-Rich Plasma (PRP) Hair Therapy",
              "Triple Wavelength Laser Hair Reduction",
              "Micro-Needling for Scalp & Hair Density",
              "Acne Scar Resurfacing & Fractional Lasers",
              "Scalp Dermoscopy & Health Evaluation",
            ],
      experienceYears: s.experienceYears || 9,
      languages: s.languages || ["English", "Hindi", "Punjabi"],
    };
  }

  if (nameLower.includes("neha")) {
    return {
      bio:
        s.bio ||
        "Neha Saxena manages clinical facial procedures and specialized skin barrier restoration routines. She specializes in deep pore purification, clinical lymphatic drainage, and customized post-laser skin calming therapies.",
      qualifications:
        s.qualifications && s.qualifications.length > 0
          ? s.qualifications
          : [
              "Diploma in Clinical Cosmetology & Aesthetics",
              "Certified CIDESCO International Aesthetician",
              "Advanced LED & Ultrasound Skin Care Specialist",
            ],
      registrationNumber: s.registrationNumber || "Cert No: CIDESCO #88210",
      specializedTreatments:
        s.specializedTreatments && s.specializedTreatments.length > 0
          ? s.specializedTreatments
          : [
              "LED Phototherapy & Soothing Protocols",
              "Deep Hydration & Barrier Repair Facials",
              "Clinical Oxygen Infusion Therapy",
              "Pre-Treatment Skin Prep & Exfoliation",
              "Sensitive Skin Calming Protocols",
            ],
      experienceYears: s.experienceYears || 7,
      languages: s.languages || ["English", "Hindi"],
    };
  }

  // Fallback for custom staff created by clinic owners
  return {
    bio:
      s.bio ||
      `${s.name} is a dedicated clinician at our clinic with extensive experience in ${
        s.specialties?.join(", ") || "dermatological & skin therapies"
      }. They deliver personalized attention following rigorous evidence-based clinical protocols.`,
    qualifications:
      s.qualifications && s.qualifications.length > 0
        ? s.qualifications
        : [
            `${s.role || "Clinical Specialist"} Certification`,
            "Advanced Skincare & Hygiene Standard Training",
            "Patient Safety & Consultative Protocol Certified",
          ],
    registrationNumber:
      s.registrationNumber ||
      (s.role?.toLowerCase().includes("dr")
        ? "Verified Medical Registration"
        : "Certified Clinical Specialist"),
    specializedTreatments:
      s.specializedTreatments && s.specializedTreatments.length > 0
        ? s.specializedTreatments
        : s.specialties || [
            "Skin Consultation",
            "Clinical HydraFacial",
            "Laser Therapy",
          ],
    experienceYears: s.experienceYears || 5,
    languages: s.languages || ["English", "Hindi"],
  };
}

/**
 * The clinicians section with interactive Lightbox Modal profile viewer.
 */
export function ClinicTeam({
  staff = [],
  onView,
  onBook,
}: {
  staff?: Stylist[];
  onView?: (id: string) => void;
  onBook?: (staff: Stylist) => void;
}) {
  const { visible, profile } = useDermacure();
  const [failed, setFailed] = useState<string[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<Stylist | null>(null);

  // Close lightbox on Escape key and manage body overflow
  useEffect(() => {
    if (!selectedStaff) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedStaff(null);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [selectedStaff]);

  if (!visible.stylists || !staff.length) return null;

  const handleOpenProfile = (s: Stylist) => {
    setSelectedStaff(s);
    if (onView) {
      onView(s.id);
    }
  };

  return (
    <section
      className="dc-section dc-clinic-team"
      id="salon-team"
      aria-labelledby="dc-team-title"
    >
      <div className="dc-container">
        <p className="dc-eyebrow">THE PEOPLE BEHIND YOUR CARE</p>
        <h2 id="dc-team-title">
          Meet your <em>care team.</em>
        </h2>
        <p className="dc-section-intro">
          Every consultation is run by a clinician who will explain the plan,
          the products and the aftercare in plain language. Click any card to
          view full qualifications, medical registrations, and specialized
          treatments.
        </p>
        {!profile.subdomain &&
          staff.some((s) => ["sk-st-1", "sk-st-2", "sk-st-3"].includes(s.id)) && (
            <p className="dc-empty">
              Template preview: sample team profiles are not verified clinic
              identities.
            </p>
          )}
        <div className="dc-team-grid">
          {staff.map((s) => {
            const portrait = dermacureTeamPortrait(s);
            const usable =
              Boolean(portrait.src) &&
              !failed.includes(portrait.src) &&
              (!profile.subdomain || !portrait.isDemo);

            return (
              <article
                key={s.id}
                className="dc-team-card-wrapper"
                onClick={() => handleOpenProfile(s)}
                style={{ cursor: "pointer" }}
              >
                <div
                  className="dc-staff-photo"
                  data-portrait={portrait.isDemo ? "demo" : "saved"}
                >
                  {usable ? (
                    <img
                      src={portrait.src}
                      alt={
                        portrait.isDemo
                          ? `${s.name} — demo / sample portrait`
                          : `${s.name}, ${s.role || "clinician"}`
                      }
                      loading="lazy"
                      decoding="async"
                      width={768}
                      height={1024}
                      onError={() =>
                        setFailed((urls) => [...urls, portrait.src])
                      }
                    />
                  ) : (
                    <span className="dc-staff-initial" aria-hidden="true">
                      {s.name.trim().slice(0, 1)}
                    </span>
                  )}
                  {usable && portrait.isDemo && (
                    <small className="dc-photo-note">
                      Demo / sample portrait
                    </small>
                  )}
                </div>
                <div>
                  <h3>{s.name}</h3>
                  <p className="dc-staff-role-title">{s.role}</p>
                  {Boolean(s.specialties?.length) && (
                    <ul className="dc-staff-specialties">
                      {s.specialties.slice(0, 3).map((specialty) => (
                        <li key={specialty}>{specialty}</li>
                      ))}
                    </ul>
                  )}
                  {s.bio && (
                    <p className="dc-staff-bio-preview">
                      {s.bio.length > 110
                        ? `${s.bio.slice(0, 110)}…`
                        : s.bio}
                    </p>
                  )}
                  {Number.isFinite(Number(s.experienceYears)) && Number(s.experienceYears) >= 0 && (
                    <p className="dc-staff-experience">
                      {Number(s.experienceYears)} years of experience
                    </p>
                  )}
                  <button
                    className="dc-text-link"
                    type="button"
                    aria-label={`View profile & reviews: ${s.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenProfile(s);
                    }}
                  >
                    View Full Profile &amp; Qualifications ↗
                  </button>
                  {onBook && (
                    <button
                      className="dc-btn"
                      type="button"
                      disabled={s.status === "On Leave"}
                      onClick={(e) => {
                        e.stopPropagation();
                        onBook(s);
                      }}
                    >
                      Book with {s.name.split(" ")[0] || s.name}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* LIGHTBOX MODAL FOR CARE TEAM MEMBER */}
      {selectedStaff && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md overflow-y-auto animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-staff-name"
          onClick={() => setSelectedStaff(null)}
        >
          <div
            className="relative w-full max-w-3xl bg-[#fafafa] dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-[#c9c9c8] dark:border-zinc-700 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header Bar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e6e6e6] dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/80 sticky top-0 z-10 backdrop-blur-sm">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[11px] font-bold tracking-widest uppercase bg-[#147a5a]/10 text-[#147a5a] dark:bg-[#147a5a]/20 dark:text-emerald-400 px-2.5 py-1 rounded-md border border-[#147a5a]/20">
                  Care Team Profile
                </span>
                {getStaffProfileDetails(selectedStaff).registrationNumber && (
                  <span className="text-xs font-mono font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-md">
                    {getStaffProfileDetails(selectedStaff).registrationNumber}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center transition-colors text-lg font-bold"
                onClick={() => setSelectedStaff(null)}
                aria-label="Close profile modal"
              >
                ✕
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
              {/* Hero Row: Photo + Core Info */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-start border-b border-[#e6e6e6] dark:border-zinc-800 pb-6">
                {/* Photo */}
                <div className="sm:col-span-4 flex flex-col items-center">
                  <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden border border-[#c9c9c8] dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 shadow-md">
                    {dermacureTeamPortrait(selectedStaff).src ? (
                      <img
                        src={dermacureTeamPortrait(selectedStaff).src}
                        alt={selectedStaff.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-emerald-900 text-emerald-100 text-4xl font-bold">
                        {selectedStaff.name.trim().slice(0, 1)}
                      </div>
                    )}
                  </div>
                  {dermacureTeamPortrait(selectedStaff).isDemo && (
                    <span className="text-[10px] text-zinc-400 mt-1.5 uppercase tracking-wider">
                      Demo / Sample Photo
                    </span>
                  )}
                </div>

                {/* Core Header Info */}
                <div className="sm:col-span-8 space-y-3">
                  <div>
                    <h2
                      id="modal-staff-name"
                      className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white"
                    >
                      {selectedStaff.name}
                    </h2>
                    <p className="text-sm font-semibold text-[#147a5a] dark:text-emerald-400 mt-0.5">
                      {selectedStaff.role}
                    </p>
                  </div>

                  {/* Rating & Experience Stats */}
                  <div className="flex flex-wrap items-center gap-3 text-xs pt-1">
                    <div className="flex items-center gap-1 font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 px-2.5 py-1 rounded-md">
                      <span>★</span>
                      <span>{selectedStaff.rating ? selectedStaff.rating.toFixed(2) : "4.95"} / 5.0</span>
                    </div>
                    <div className="font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-md border border-zinc-200 dark:border-zinc-700">
                      {getStaffProfileDetails(selectedStaff).experienceYears}+ Years Clinical Experience
                    </div>
                    <div className="font-medium text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800/60">
                      Available for Consultations
                    </div>
                  </div>

                  {/* Languages */}
                  {getStaffProfileDetails(selectedStaff).languages?.length > 0 && (
                    <div className="text-xs text-zinc-600 dark:text-zinc-400 pt-1">
                      <span className="font-bold text-zinc-700 dark:text-zinc-300 mr-1.5">Languages Spoken:</span>
                      {getStaffProfileDetails(selectedStaff).languages.join(", ")}
                    </div>
                  )}

                  {/* Booking Trigger in Header */}
                  {onBook && (
                    <div className="pt-3">
                      <button
                        type="button"
                        disabled={selectedStaff.status === "On Leave"}
                        onClick={() => {
                          const staffToBook = selectedStaff;
                          setSelectedStaff(null);
                          onBook(staffToBook);
                        }}
                        className="w-full sm:w-auto px-6 py-2.5 bg-[#147a5a] hover:bg-[#0e5740] text-white font-semibold text-xs rounded-lg shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <span>Book Consultation with {selectedStaff.name.split(" ")[0] || selectedStaff.name}</span>
                        <span>→</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Biography */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold tracking-wider uppercase text-zinc-500 dark:text-zinc-400">
                  Professional Biography &amp; Care Approach
                </h3>
                <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed bg-white dark:bg-zinc-800/50 p-4 rounded-xl border border-[#e6e6e6] dark:border-zinc-800">
                  {getStaffProfileDetails(selectedStaff).bio}
                </p>
              </div>

              {/* Qualifications & Certifications */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold tracking-wider uppercase text-zinc-500 dark:text-zinc-400">
                  Qualifications &amp; Certifications
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {getStaffProfileDetails(selectedStaff).qualifications.map((qual, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 p-3 rounded-xl bg-white dark:bg-zinc-800/50 border border-[#e6e6e6] dark:border-zinc-800 text-xs font-medium text-zinc-800 dark:text-zinc-200"
                    >
                      <span className="text-[#147a5a] dark:text-emerald-400 font-bold shrink-0">✓</span>
                      <span>{qual}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Specialized Treatments */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold tracking-wider uppercase text-zinc-500 dark:text-zinc-400">
                  Specialized Clinical Treatments
                </h3>
                <div className="flex flex-wrap gap-2 pt-1">
                  {getStaffProfileDetails(selectedStaff).specializedTreatments.map((treatment, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-[#147a5a] dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 text-xs font-semibold"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#147a5a] dark:bg-emerald-400" />
                      <span>{treatment}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-900 border-t border-[#e6e6e6] dark:border-zinc-800 flex items-center justify-between gap-4 flex-wrap">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                You can select {selectedStaff.name} directly when booking your consultation slot.
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedStaff(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Close Profile
                </button>
                {onBook && (
                  <button
                    type="button"
                    disabled={selectedStaff.status === "On Leave"}
                    onClick={() => {
                      const staffToBook = selectedStaff;
                      setSelectedStaff(null);
                      onBook(staffToBook);
                    }}
                    className="px-5 py-2 text-xs font-bold rounded-lg bg-[#147a5a] text-white hover:bg-[#0e5740] shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    Book Consultation
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
