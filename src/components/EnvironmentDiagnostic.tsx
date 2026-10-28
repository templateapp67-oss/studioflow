import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export const EnvironmentDiagnostic = ({ profile }: { profile: any }) => {
  const [supabaseStatus, setSupabaseStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [contentStatus, setContentStatus] = useState<'checking' | 'valid' | 'invalid'>('checking');

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
    };
    check();
  }, [profile]);

  return (
    <section className="workspace-card">
      <h2>Environment Diagnostics</h2>
      <div className="space-y-2">
        <p><strong>Supabase Connection:</strong> {supabaseStatus === 'checking' ? 'Checking...' : supabaseStatus === 'connected' ? '✅ Connected' : '❌ Error'}</p>
        <p><strong>Website Content:</strong> {contentStatus === 'checking' ? 'Checking...' : contentStatus === 'valid' ? '✅ Valid' : '❌ Invalid'}</p>
      </div>
      {supabaseStatus === 'error' && <p className="text-red-500 text-sm mt-2">Check your internet connection or Supabase settings.</p>}
      {contentStatus === 'invalid' && <p className="text-red-500 text-sm mt-2">Missing critical business information.</p>}
    </section>
  );
};
