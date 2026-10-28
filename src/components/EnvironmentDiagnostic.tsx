import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { checkEmailServiceStatus, sendBookingConfirmationEmail, EmailServiceStatus } from '../lib/emailService';

export const EnvironmentDiagnostic = ({ profile }: { profile: any }) => {
  const [supabaseStatus, setSupabaseStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [contentStatus, setContentStatus] = useState<'checking' | 'valid' | 'invalid'>('checking');
  const [emailStatus, setEmailStatus] = useState<EmailServiceStatus | null>(null);
  const [testEmail, setTestEmail] = useState(profile?.email || 'customer@example.com');
  const [testingEmail, setTestingEmail] = useState(false);
  const [testFeedback, setTestFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    const check = async () => {
      // Check Supabase
      try {
        const { error } = await supabase.from('studioflow_websites').select('id').limit(1);
        if (error) throw error;
        setSupabaseStatus('connected');
      } catch (e) {
        console.error('Supabase diagnostic error:', e);
        setSupabaseStatus('error');
      }

      // Check Content (basic validation)
      if (profile && profile.businessName && profile.subdomain) {
        setContentStatus('valid');
      } else {
        setContentStatus('invalid');
      }

      // Check Email Service
      try {
        const status = await checkEmailServiceStatus();
        setEmailStatus(status);
      } catch (e) {
        console.error('Email service diagnostic error:', e);
      }
    };
    check();
  }, [profile]);

  const handleTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail || !testEmail.includes('@')) return;
    setTestingEmail(true);
    setTestFeedback(null);
    try {
      const result = await sendBookingConfirmationEmail({
        to: testEmail,
        clientName: 'Diagnostic Test Guest',
        bookingRef: `TEST-${Math.floor(1000 + Math.random() * 9000)}`,
        serviceName: 'Diagnostic Hair & Scalp Ritual',
        servicePrice: 1200,
        amountPaid: 300,
        stylistName: 'Master Stylist',
        date: new Date().toISOString().slice(0, 10),
        time: '11:00 AM',
        salonName: profile?.businessName || 'StudioFlow Salon',
        salonAddress: profile?.address || '128 Indiranagar Main Road',
        salonCity: profile?.city || 'Bengaluru',
        salonPhone: profile?.phone || '+91 98765 43210',
      });

      if (result.success) {
        setTestFeedback({
          ok: true,
          msg: result.delivered
            ? `Live confirmation email delivered via Resend to ${testEmail}! (ID: ${result.emailId})`
            : `Email template verified & generated for ${testEmail}! ${result.notice || ''}`,
        });
      } else {
        setTestFeedback({
          ok: false,
          msg: result.error || 'Failed to dispatch test booking email.',
        });
      }
    } catch (err: any) {
      setTestFeedback({
        ok: false,
        msg: err?.message || 'Error executing email test.',
      });
    } finally {
      setTestingEmail(false);
    }
  };

  return (
    <section className="workspace-card">
      <h2>Environment Diagnostics</h2>
      <div className="space-y-3">
        <p>
          <strong>Supabase Connection:</strong>{' '}
          {supabaseStatus === 'checking' ? 'Checking...' : supabaseStatus === 'connected' ? '✅ Connected' : '❌ Error'}
        </p>
        <p>
          <strong>Website Content:</strong>{' '}
          {contentStatus === 'checking' ? 'Checking...' : contentStatus === 'valid' ? '✅ Valid' : '❌ Invalid'}
        </p>
        <p>
          <strong>Automated Email Service (Resend):</strong>{' '}
          {!emailStatus ? (
            'Checking...'
          ) : emailStatus.configured ? (
            <span className="text-emerald-700 font-bold">✅ Configured & Active (Resend API)</span>
          ) : (
            <span className="text-blue-700 font-medium">
              ℹ️ Ready (Template Engine Active • Set RESEND_API_KEY in .env for live inbox delivery)
            </span>
          )}
        </p>
      </div>

      {supabaseStatus === 'error' && (
        <p className="text-red-500 text-sm mt-2">Check your internet connection or Supabase settings.</p>
      )}
      {contentStatus === 'invalid' && (
        <p className="text-red-500 text-sm mt-2">Missing critical business information.</p>
      )}

      {/* Interactive Email Service Test Box */}
      <div className="mt-5 p-4 rounded-xl border border-slate-200 bg-slate-50">
        <h3 className="font-bold text-sm text-slate-800">Test Automated Booking Email Dispatch</h3>
        <p className="text-xs text-slate-500 mt-1">
          Verify that booking confirmation and reminder emails render and dispatch accurately.
        </p>
        <form onSubmit={handleTestEmail} className="mt-3 flex flex-wrap gap-2 items-center">
          <input
            type="email"
            required
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="recipient@example.com"
            className="workspace-input flex-1 min-w-[200px] text-xs py-2"
          />
          <button
            type="submit"
            disabled={testingEmail}
            className="primary-action text-xs py-2 px-3 shrink-0"
          >
            {testingEmail ? 'Sending...' : 'Send Test Booking Email'}
          </button>
        </form>
        {testFeedback && (
          <p
            className={`text-xs mt-2 font-medium ${
              testFeedback.ok ? 'text-emerald-700 bg-emerald-50 p-2 rounded border border-emerald-200' : 'text-red-600'
            }`}
          >
            {testFeedback.msg}
          </p>
        )}
      </div>
    </section>
  );
};

