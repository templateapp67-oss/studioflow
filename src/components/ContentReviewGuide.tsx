import React from 'react';
import type {SalonProfile, SalonService, Stylist} from '../types';

type Props = {
  profile: SalonProfile;
  services: SalonService[];
  stylists: Stylist[];
  onNavigate: (module: number) => void;
  onPreview: () => void;
  onAddAbout: () => void;
};

export function ContentReviewGuide({profile, services, stylists, onNavigate, onPreview, onAddAbout}: Props) {
  const [message, setMessage] = React.useState('');
  const hasAbout = Boolean(profile.about?.trim());
  const checks = [
    {label: 'Business identity', ok: Boolean(profile.businessName?.trim() && profile.tagline?.trim()), hint: 'Business name aur tagline add karein.', module: 2},
    {label: 'Contact details', ok: Boolean(profile.phone?.trim() && profile.email?.trim()), hint: 'Phone aur business email add karein; details sahi hain ya nahi khud check karein.', module: 2},
    {label: 'Service menu', ok: services.length >= 3, hint: 'Kam se kam 3 services add karein. Names, prices aur duration bhi review karein.', module: 3},
    {label: 'Team credibility', ok: stylists.length > 0, hint: 'Kam se kam 1 specialist add karein; photo, experience aur assigned services check karein.', module: 4},
    {label: 'Visual story', ok: Boolean(profile.coverImageUrl?.trim()), hint: 'Hero cover image add karein aur preview mein cropping check karein.', module: 10},
    {label: 'About your salon', ok: hasAbout, hint: 'Apne salon ki introduction likhein, ya neeche starter text add karke edit karein.', module: 27},
  ];
  const complete = checks.filter(check => check.ok).length;
  return <section className="workspace-card content-review">
    <p className="eyebrow">Website content check</p>
    <h2>AI content review</h2>
    <p className="muted">Website publish karne se pehle apne salon ki basic details aur content check karein.</p>
    <aside className="content-review-guide" aria-labelledby="review-guide-title">
      <h3 id="review-guide-title">Is section ka use kaise karein?</h3>
      <p>Yeh aapki current workspace details ki automatic completeness checklist hai. Is page par AI se naya content generate nahi hota. Green check ka matlab required detail present hai; accuracy, grammar, photos aur booking availability aapko khud verify karni hai.</p>
      <ol>
        <li><strong>Checklist dekhein:</strong> “Needs attention” wale item ka Edit button kholein aur missing details bharein.</li>
        <li><strong>About text taiyar karein:</strong> About khaali ho to “Add starter About text” dabayein. Phir About our studio mein apni actual services aur salon ki khasiyat ke hisab se edit karein. Existing About text replace nahi hoga.</li>
        <li><strong>Dobara review karein:</strong> Sidebar se “Content review” par wapas aayein. Checklist current changes ke saath update hoti hai. Workspace ka save status complete hone dein.</li>
        <li><strong>Preview aur publish:</strong> Preview mein mobile layout, contact details, images aur booking flow check karein. Sab sahi hone par Publish section se website publish/update karein.</li>
      </ol>
    </aside>
    <p className="content-review-summary"><strong>{complete} of {checks.length} basic checks complete</strong><br/><span>Yeh setup checklist hai; booking, payment ya website quality ki guarantee nahi.</span></p>
    <div className="review-list">{checks.map(check => <div key={check.label}>
      <span className="material-symbols-outlined" aria-hidden="true" style={{color: check.ok ? '#047857' : '#b45309'}}>{check.ok ? 'check_circle' : 'error'}</span>
      <strong>{check.label}</strong>
      <small>{check.ok ? 'Detail present' : 'Needs attention'}</small>
      <p>{check.hint}</p>
      <button type="button" className="secondary-action" onClick={() => onNavigate(check.module)} aria-label={`Edit ${check.label}`}>Edit details</button>
    </div>)}</div>
    <div className="content-review-about">
      <h3>Starter About text</h3>
      <p>{hasAbout ? 'About text already added hai. Edit About se existing text review ya change karein.' : 'Yeh button sirf khaali About field mein ek short starter introduction add karega. Phone, services, prices ya photos nahi badlenge.'}</p>
      {!hasAbout && <button type="button" className="secondary-action" onClick={() => { onAddAbout(); setMessage('Starter About text added. About our studio mein review/edit karein; workspace save complete hone dein.'); }}>Add starter About text</button>}
      <button type="button" className="secondary-action" onClick={() => onNavigate(27)}>Edit About</button>
      {message && <p role="status" aria-live="polite">{message}</p>}
    </div>
    <div className="action-buttons"><button type="button" className="secondary-action" onClick={onPreview}>Preview website</button><button type="button" className="secondary-action" onClick={() => onNavigate(13)}>Go to Publish</button></div>
    <p className="muted">Checklist dekhne se website publish nahi hoti. Public website update karne ke liye Publish step complete karein.</p>
  </section>;
}
