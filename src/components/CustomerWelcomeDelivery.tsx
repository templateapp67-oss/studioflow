import {useEffect} from 'react';
import type {Session} from '@supabase/supabase-js';
import {supabase} from '../lib/supabase';
/** Authenticated users can wake only their own consented welcome job. */
export function useCustomerWelcomeDelivery(session:Session|null){useEffect(()=>{if(!session?.user.email_confirmed_at || !supabase)return;let active=true;void supabase.rpc('studioflow_customer_welcome_status').then(({data,error})=>{if(active&&!error&&['pending','retry'].includes(data?.status))void supabase.functions.invoke('studioflow-welcome-whatsapp',{body:{}})});return()=>{active=false}},[session?.user.id]);return null}
