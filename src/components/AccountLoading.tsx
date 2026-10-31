import React, {useEffect, useRef, useState} from 'react';

export function AccountLoading({onRetry}:{onRetry:()=>void}){
 const [slow,setSlow]=useState(false);
 const [requested,setRequested]=useState(false);
 const retryStarted=useRef(false);
 useEffect(()=>{const timer=setTimeout(()=>setSlow(true),10000);return()=>clearTimeout(timer);},[]);
 return <main role="status" aria-live="polite" className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#f9f9ff] px-6 text-center">
  <p className="font-semibold">Loading your salon from Supabase…</p>
  {slow?<>
   <p className="max-w-md text-sm text-slate-600">Account loading state: loading. Authentication succeeded, but the account or profile fetch is taking longer than 10 seconds. Check your internet connection or Supabase availability; the account or profile data may also be missing. Your session and saved data will not be removed.</p>
   <button className="primary-action" disabled={requested} onClick={()=>{if(!retryStarted.current){retryStarted.current=true;setRequested(true);onRetry();}}}>Retry account loading</button>
  </>:<p className="text-sm text-slate-500">Fetching your saved workspace. This usually takes a second.</p>}
 </main>;
}

