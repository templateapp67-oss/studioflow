import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { messageOf, withTimeout } from '../lib/asyncDeadline';

export type ProfileLoadState='idle'|'loading'|'ready'|'user-mismatch'|'error';
type DiagStatus='checking'|'ok'|'problem'|'unknown';
type AccountDiagnostic={auth:DiagStatus;connection:DiagStatus;profile:DiagStatus;summary:string;detail:string};
const DIAGNOSTIC_AFTER_SECONDS=10,RETRY_COOLDOWN_MS=5000,DIAGNOSTIC_TIMEOUT_MS=8000;
/**
 * Read-only checks that tell the owner *why* the account is slow: sign-in, the
 * Supabase connection and the profile row. It never signs out, writes data or
 * changes the account; every request has a deadline.
 */
export async function diagnoseAccountLoad(userId:string):Promise<AccountDiagnostic>{
 const result:AccountDiagnostic={auth:'unknown',connection:'unknown',profile:'unknown',summary:'',detail:''};
 if(typeof navigator!=='undefined'&&navigator.onLine===false){
  result.connection='problem';
  result.summary='This device appears to be offline. Check your internet connection, then retry.';
  return result;
 }
 try{
  const {data,error}=await withTimeout(supabase.auth.getSession(),DIAGNOSTIC_TIMEOUT_MS,'Checking your sign-in');
  if(error)throw error;
  result.auth=!data?.session?'problem':userId&&data.session.user?.id!==userId?'problem':'ok';
  if(result.auth==='problem')result.detail='Your sign-in session is missing or belongs to a different account.';
 }catch(e){result.auth='problem';result.detail=messageOf(e,'Could not check your sign-in.');}
 if(userId){
  try{
   const response=await withTimeout(supabase.from('profiles').select('id').eq('id',userId).maybeSingle(),DIAGNOSTIC_TIMEOUT_MS,'Checking your profile');
   // Any answer from the server, even a refusal, proves the connection works.
   result.connection='ok';
   if(response.error){result.profile='problem';result.detail=result.detail||messageOf(response.error,'The profile could not be read.');}
   else result.profile=response.data?'ok':'problem';
   if(!response.error&&!response.data)result.detail=result.detail||'No profile record exists yet for this account.';
  }catch(e){result.connection='problem';result.detail=result.detail||messageOf(e,'Could not reach Supabase.');}
 }
 if(result.auth==='problem')result.summary='Authentication problem: please sign in again if this continues. You were not signed out.';
 else if(result.connection==='problem')result.summary='Supabase connection problem: the database did not respond. This is usually a slow or blocked network.';
 else if(result.profile==='problem'&&/No profile record/.test(result.detail))result.summary='Missing profile data: your saved workspace still opens, but the profile record is empty.';
 else if(result.profile==='problem')result.summary='Profile fetching problem: Supabase answered but refused or failed the profile request.';
 else result.summary='Sign-in, connection and profile all respond. The workspace is still being prepared; retry once.';
 return result;
}
const DIAG_LABEL:Record<DiagStatus,string>={checking:'Checking…',ok:'OK',problem:'Problem',unknown:'Not checked'};
/**
 * Account loader that never becomes a dead end. It is a plain waiting message
 * for the first seconds, then explains the delay, shows the current profile
 * state and a diagnostic, and offers a safe (single-flight, cooled-down) retry.
 * It never signs the user out by itself.
 */
export function AccountLoading({onRetry,onSignOut,profileState='loading',userId=''}:{onRetry:()=>void;onSignOut?:()=>void;profileState?:ProfileLoadState;userId?:string}){
 const [seconds,setSeconds]=useState(0);
 const [diag,setDiag]=useState<AccountDiagnostic|null>(null);
 const [checking,setChecking]=useState(false);
 const [retryError,setRetryError]=useState('');
 const [retries,setRetries]=useState(0);
 const [coolingDown,setCoolingDown]=useState(false);
 const mounted=useRef(true),inFlight=useRef(false),autoRan=useRef(false),cooldownTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>{
  mounted.current=true;
  const timer=setInterval(()=>setSeconds(value=>value+1),1000);
  return()=>{mounted.current=false;clearInterval(timer);if(cooldownTimer.current)clearTimeout(cooldownTimer.current);};
 },[]);
 const runDiagnostic=useCallback(async()=>{
  if(inFlight.current)return;
  inFlight.current=true;setChecking(true);
  try{
   const found=await diagnoseAccountLoad(userId);
   if(mounted.current){setDiag(found);setRetryError(found.summary&&(found.auth==='problem'||found.connection==='problem')?found.summary:'');}
  }catch(e){
   if(mounted.current)setRetryError(messageOf(e,'The diagnostic check failed.'));
  }finally{inFlight.current=false;if(mounted.current)setChecking(false);}
 },[userId]);
 const slow=seconds>=6,showDiagnostic=seconds>=DIAGNOSTIC_AFTER_SECONDS;
 useEffect(()=>{
  // One automatic check when the delay passes the threshold; later checks only on Retry.
  if(!showDiagnostic||autoRan.current)return;
  autoRan.current=true;void runDiagnostic();
 },[showDiagnostic,runDiagnostic]);
 const retry=async()=>{
  if(inFlight.current||coolingDown)return;
  setCoolingDown(true);setRetries(count=>count+1);setRetryError('');
  cooldownTimer.current=setTimeout(()=>{if(mounted.current)setCoolingDown(false);},RETRY_COOLDOWN_MS);
  try{onRetry();}catch(e){setRetryError(messageOf(e,'Retry could not start.'));}
  await runDiagnostic();
 };
 const stateLabel=profileState==='user-mismatch'?'user-mismatch (waiting for the signed-in account)':profileState;
 return <main role="status" aria-live="polite" className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#f9f9ff] px-6 text-center">
  <p className="font-semibold">Loading your salon from Supabase…</p>
  {slow?<>
   <p className="max-w-md text-sm text-slate-600">This is taking longer than usual ({seconds}s). Your workspace opens from its last saved copy when the live copy cannot be reached.</p>
   {showDiagnostic&&<section aria-label="Account loading diagnostic" className="max-w-md w-full rounded-xl border border-slate-200 bg-white p-4 text-left text-sm">
    <p className="font-semibold">Connection diagnostic</p>
    <p className="mt-1 text-slate-600">Profile state: <code data-testid="profile-state">{stateLabel}</code></p>
    <ul className="mt-2 space-y-1">
     <li>Authentication: <strong>{checking&&!diag?DIAG_LABEL.checking:DIAG_LABEL[diag?.auth||'unknown']}</strong></li>
     <li>Supabase connection: <strong>{checking&&!diag?DIAG_LABEL.checking:DIAG_LABEL[diag?.connection||'unknown']}</strong></li>
     <li>Profile record: <strong>{checking&&!diag?DIAG_LABEL.checking:DIAG_LABEL[diag?.profile||'unknown']}</strong></li>
    </ul>
    {diag?.summary&&<p className="mt-2 text-slate-700">{diag.summary}</p>}
    {diag?.detail&&<p className="mt-1 text-xs text-slate-500">{diag.detail}</p>}
    {retryError&&<p role="alert" className="mt-2 text-sm text-red-700">Retry did not succeed: {retryError}</p>}
    {retries>0&&<p className="mt-1 text-xs text-slate-500">Retries this session: {retries}</p>}
   </section>}
   <div className="flex flex-wrap justify-center gap-3"><button className="primary-action" disabled={checking||coolingDown} onClick={()=>void retry()}>{checking?'Checking…':'Retry now'}</button>{onSignOut&&<button className="secondary-action" onClick={onSignOut}>Sign out</button>}</div>
  </>:<p className="text-sm text-slate-500">Fetching your saved workspace. This usually takes a second.</p>}
 </main>;
}
