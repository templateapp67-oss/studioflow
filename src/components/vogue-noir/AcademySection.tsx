import React, { useEffect, useMemo, useState } from 'react';
import { Award, Calendar, CheckCircle2, ChevronDown, ChevronUp, GraduationCap, Lock, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  VOGUE_NOIR_IMAGES,
  VOGUE_NOIR_ACADEMY_CITIES,
  parseAcademySchedules,
  upcomingAcademyBatchDates,
  type ResolvedVogueNoirConfig,
} from '../../lib/vogueNoir';
import { SafeImage } from './SafeImage';

function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(amount || 0));
}

export function AcademySection({
  config,
  slug,
  customerSignedIn,
  customerName,
  onAccount,
  readOnly,
}: {
  config: ResolvedVogueNoirConfig;
  slug: string;
  customerSignedIn?: boolean;
  customerName?: string;
  onAccount: (mode?: 'signin' | 'signup') => void;
  readOnly?: boolean;
}) {
  const autoBatches = useMemo(() => upcomingAcademyBatchDates(new Date(), 4), []);
  const courses = config.courses;

  const [openSyllabusId, setOpenSyllabusId] = useState<string | null>(
    courses[0]?.id || null,
  );
  const [selectedCourse, setSelectedCourse] = useState<string>(
    courses[1]?.title || courses[0]?.title || 'Professional Makeup Artist Course',
  );
  const [selectedBatch, setSelectedBatch] = useState<string>(
    courses[1]?.batchOverride || autoBatches[0] || '1st of Next Month',
  );
  const [selectedCity, setSelectedCity] = useState('');
  const schedules = useMemo(() => parseAcademySchedules(config.academyScheduleText), [config.academyScheduleText]);
  const cityOptions = useMemo(() => Array.from(new Set([...VOGUE_NOIR_ACADEMY_CITIES, ...Object.keys(schedules)])), [schedules]);
  const [name, setName] = useState<string>(customerName || '');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    if (customerName && !name.trim()) {
      setName(customerName);
    }
  }, [customerName, name]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string>('');
  const [submittedSummary, setSubmittedSummary] = useState<{
    course: string;
    batch: string;
  } | null>(null);

  const batchOptions = useMemo(() => {
    const custom = courses
      .map((c) => (c.batchOverride || '').trim())
      .filter(Boolean);
    const cityDates = schedules[selectedCity];
    return cityDates?.length ? cityDates : Array.from(new Set([...custom, ...autoBatches]));
  }, [courses, autoBatches, schedules, selectedCity]);

  useEffect(() => {
    if (!batchOptions.includes(selectedBatch)) setSelectedBatch(batchOptions[0] || '');
  }, [batchOptions, selectedBatch]);

  const chooseCourseForEnquiry = (courseTitle: string, batchLabel: string) => {
    setSelectedCourse(courseTitle);
    setSelectedBatch(batchLabel);
    setSubmittedSummary(null);
    setErrorText('');
    if (typeof document !== 'undefined') {
      document
        .getElementById('academy-enquire')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorText('');

    if (!customerSignedIn) {
      onAccount('signin');
      return;
    }

    const cleanSlug = (slug || '').trim();
    if (!cleanSlug) {
      setErrorText(
        'Publish this website first to accept live student enquiries. Preview mode does not store student records.',
      );
      return;
    }

    const digits = phone.replace(/[^0-9]/g, '');
    const normalizedPhone =
      digits.length === 12 && digits.startsWith('91')
        ? digits.slice(2)
        : digits.length === 11 && digits.startsWith('0')
          ? digits.slice(1)
          : digits;

    if (!selectedCity || selectedCity.length > 100 || !batchOptions.includes(selectedBatch)) {
      setErrorText('Please select your preferred city and batch.');
      return;
    }
    if (name.trim().length < 2 || !/^[6-9][0-9]{9}$/.test(normalizedPhone)) {
      setErrorText('Please enter your full name and a valid 10-digit Indian mobile number.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('studioflow_academy_enquire_with_city', {
        p_slug: cleanSlug,
        p_city: selectedCity,
        p_name: name.trim(),
        p_phone: normalizedPhone,
        p_email: email.trim(),
        p_course: selectedCourse,
        p_batch: selectedBatch,
        p_message: message.trim(),
      });
      if (error) throw error;
      setSubmittedSummary({ course: selectedCourse, batch: selectedBatch });
      setMessage('');
    } catch (err: any) {
      setErrorText(err?.message || 'Unable to submit enquiry right now. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id="academy"
      className="vn-section"
      aria-labelledby="vn-academy-heading"
    >
      <div className="vn-container">
        <div className="vn-section-header vn-section-header-split">
          <div>
            <p className="vn-eyebrow">Pro Makeup Education</p>
            <h2 id="vn-academy-heading" className="vn-heading">
              {config.academyHeading}
            </h2>
          </div>
          <p className="vn-subtext">{config.academySubtext}</p>
        </div>

        <div className="vn-academy-banner">
          <SafeImage
            src={config.academyHeroUrl}
            fallback={VOGUE_NOIR_IMAGES.academy.hero}
            alt="Vogue Noir Makeup Academy classroom with illuminated vanity stations and hands-on live model training"
            width={1600}
            height={700}
          />
          <div className="vn-academy-highlights">
            {config.academyHighlights.map((highlight, idx) => (
              <div key={idx} className="vn-academy-highlight-item">
                <Award size={18} color="var(--accent-gold)" aria-hidden="true" />
                <span>{highlight}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="vn-courses-grid">
          {courses.map((course, idx) => {
            const batchLabel =
              course.batchOverride || autoBatches[idx % autoBatches.length];
            const isSyllabusOpen = openSyllabusId === course.id;
            const syllabusPanelId = `vn-syllabus-${course.id}`;

            return (
              <article key={course.id} className="vn-course-card">
                <div className="vn-service-media">
                  <SafeImage
                    src={course.imageUrl}
                    fallback={VOGUE_NOIR_IMAGES.academy.pro}
                    alt={course.imageAlt || `${course.title} studio session`}
                    width={800}
                    height={600}
                  />
                </div>
                <div className="vn-service-body">
                  <div>
                    <div className="vn-course-meta-row">
                      <span className="vn-meta-pill">Duration: {course.duration}</span>
                      <span className="vn-meta-pill">
                        <Calendar
                          size={12}
                          style={{ display: 'inline', marginRight: 4, verticalAlign: '-1px' }}
                          aria-hidden="true"
                        />
                        Suggested date: {batchLabel}
                      </span>
                    </div>
                    <h3 className="vn-service-title">{course.title}</h3>
                    <p className="vn-service-desc">{course.summary}</p>

                    <p
                      style={{
                        margin: '0.85rem 0 0',
                        fontSize: '0.8rem',
                        color: 'var(--highlight-blush)',
                      }}
                    >
                      <GraduationCap
                        size={14}
                        style={{ display: 'inline', marginRight: 5, verticalAlign: '-2px' }}
                        aria-hidden="true"
                      />
                      {course.certification} · {course.emiNote}
                    </p>

                    <button
                      type="button"
                      className="vn-syllabus-toggle"
                      aria-expanded={isSyllabusOpen}
                      aria-controls={syllabusPanelId}
                      onClick={() =>
                        setOpenSyllabusId(isSyllabusOpen ? null : course.id)
                      }
                    >
                      <span>Course Syllabus ({course.syllabus.length} Modules)</span>
                      {isSyllabusOpen ? (
                        <ChevronUp size={16} aria-hidden="true" />
                      ) : (
                        <ChevronDown size={16} aria-hidden="true" />
                      )}
                    </button>
                    {isSyllabusOpen && (
                      <ol id={syllabusPanelId} className="vn-syllabus-list">
                        {course.syllabus.map((mod, mIdx) => (
                          <li key={mIdx}>{mod}</li>
                        ))}
                      </ol>
                    )}
                  </div>

                  <div className="vn-service-footer">
                    <div className="vn-price-stack">
                      <small>Course Fee</small>
                      <strong>{formatInr(course.fee)}</strong>
                    </div>
                    <button
                      type="button"
                      className="vn-btn-gold vn-btn-sm"
                      onClick={() => chooseCourseForEnquiry(course.title, batchLabel)}
                    >
                      Enquire / Enroll
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Academy Enquire / Enroll Panel */}
        <div id="academy-enquire" className="vn-enquiry-box">
          <div style={{ marginBottom: '1.5rem' }}>
            <p className="vn-eyebrow">Admissions &amp; Counseling</p>
            <h3
              style={{
                fontFamily: 'var(--vn-serif)',
                fontSize: 'clamp(1.65rem, 2.8vw, 2.25rem)',
                margin: '0 0 0.45rem',
                color: 'var(--text-primary)',
              }}
            >
              Enquire or Reserve Your Academy Seat
            </h3>
            <p className="vn-subtext">
              Choose your preferred city and batch date. The academy will confirm availability with you.
            </p>
          </div>

          {submittedSummary ? (
            <div
              role="status"
              style={{
                padding: '1.5rem',
                border: '1px solid var(--accent-gold)',
                background: 'var(--bg-primary)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
                <CheckCircle2 size={22} color="var(--accent-gold)" aria-hidden="true" />
                <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                  Academy Enquiry Received
                </strong>
              </div>
              <p style={{ margin: '0 0 1rem', color: 'var(--text-muted)', fontSize: '0.92rem' }}>
                Thank you! Our Academy Counselor has received your request for{' '}
                <strong style={{ color: 'var(--accent-gold)' }}>{submittedSummary.course}</strong> (Batch:{' '}
                <strong>{submittedSummary.batch}</strong>) and will reach out with syllabus brochure &amp; EMI details.
              </p>
              <button
                type="button"
                className="vn-btn-outline vn-btn-sm"
                onClick={() => setSubmittedSummary(null)}
              >
                Send Another Enquiry
              </button>
            </div>
          ) : !customerSignedIn ? (
            <div
              data-academy-auth-gate="true"
              style={{
                padding: '1.75rem',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <Lock size={20} color="var(--accent-gold)" style={{ flexShrink: 0, marginTop: 3 }} aria-hidden="true" />
                <div>
                  <strong style={{ display: 'block', color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
                    Customer Sign-In Required to Submit Academy Application
                  </strong>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    Selected Course: <span style={{ color: 'var(--accent-gold)' }}>{selectedCourse}</span> · Preferred Batch:{' '}
                    <span style={{ color: 'var(--highlight-blush)' }}>{selectedBatch}</span>. Sign in or create your customer account so we can confirm your counseling request securely.
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem' }}>
                <button
                  type="button"
                  className="vn-btn-gold vn-btn-sm"
                  onClick={() => onAccount('signin')}
                >
                  <Sparkles size={14} aria-hidden="true" />
                  Sign In to Enquire
                </button>
                <button
                  type="button"
                  className="vn-btn-outline vn-btn-sm"
                  onClick={() => onAccount('signup')}
                >
                  Create Customer Account
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="vn-form-grid" noValidate>
              <div className="vn-form-grid vn-form-grid-2">
                <div className="vn-field">
                  <label htmlFor="vn-aca-name">Full Name *</label>
                  <input
                    id="vn-aca-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Aarohi Sharma"
                  />
                </div>
                <div className="vn-field">
                  <label htmlFor="vn-aca-phone">10-Digit Mobile / WhatsApp *</label>
                  <input
                    id="vn-aca-phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              <div className="vn-form-grid vn-form-grid-2">
                <div className="vn-field">
                  <label htmlFor="vn-aca-email">Email Address</label>
                  <input
                    id="vn-aca-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <div className="vn-field">
                  <label htmlFor="vn-aca-course">Select Course *</label>
                  <select
                    id="vn-aca-course"
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.title}>
                        {c.title} ({c.duration} — {formatInr(c.fee)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="vn-field">
                <label htmlFor="vn-aca-city">Preferred City / Online *</label>
                <select id="vn-aca-city" required value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)}>
                  <option value="">Select city or Online</option>
                  {cityOptions.map(city => <option key={city} value={city}>{city}</option>)}
                </select>
              </div>
              <div className="vn-form-grid vn-form-grid-2">
                <div className="vn-field">
                  <label htmlFor="vn-aca-batch">Preferred Batch Start Date *</label>
                  <select
                    id="vn-aca-batch"
                    value={selectedBatch}
                    onChange={(e) => setSelectedBatch(e.target.value)}
                  >
                    {batchOptions.map((batch) => (
                      <option key={batch} value={batch}>
                        {batch}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="vn-field">
                  <label htmlFor="vn-aca-msg">Experience Level / Questions</label>
                  <input
                    id="vn-aca-msg"
                    type="text"
                    maxLength={1000}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Fresher, practicing artist, EMI query, weekend batch..."
                  />
                </div>
              </div>

              {errorText && (
                <p role="alert" style={{ margin: 0, color: '#fca5a5', fontSize: '0.88rem' }}>
                  {errorText}
                </p>
              )}

              <div>
                <button
                  type="submit"
                  className="vn-btn-gold"
                  disabled={submitting}
                >
                  {submitting ? 'Submitting Enquiry…' : 'Submit Academy Enquiry'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
