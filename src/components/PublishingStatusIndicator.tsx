import React from 'react';
import { SalonProfile, SalonService } from '../types';
import { CheckCircle, XCircle } from 'lucide-react';

export function PublishingStatusIndicator({ profile, services }: { profile: SalonProfile; services: SalonService[] }) {
  const requirements = [
    { label: 'Business name added', met: !!profile.businessName },
    { label: 'At least one service added', met: services.length > 0 },
    { label: 'Salon template selected', met: !!profile.serviceCatalogueInitialized },
  ];

  const allMet = requirements.every(r => r.met);

  return (
    <section className="workspace-card mb-4" aria-label="Publishing requirements">
      <h3 className="text-sm font-semibold mb-3">Publishing Checklist</h3>
      <div className="space-y-2">
        {requirements.map((req, i) => (
          <div key={i} className={`flex items-center gap-2 text-sm ${req.met ? 'text-emerald-700' : 'text-slate-600'}`}>
            {req.met ? <CheckCircle size={16} /> : <XCircle size={16} />}
            {req.label}
          </div>
        ))}
      </div>
      {!allMet && (
        <p className="mt-3 text-xs text-amber-700">
          Complete all steps to enable the Publish button.
        </p>
      )}
    </section>
  );
}
