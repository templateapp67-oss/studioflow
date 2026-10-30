import React,{useState} from 'react';
import {supabase} from '../lib/supabase';
export function BusinessNotificationLink(){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const connect=async()=>{setBusy(true);setError('');try{const {data,error}=await supabase.rpc('nexora_create_notification_link');if(error)throw error;if(typeof data!=='string'||!/^[a-f0-9]{64}$/.test(data))throw new Error('A secure connection link could not be created.');location.assign('https://nexora-beauty-network.templateapp67.chatgpt.site/notifications/#connect='+data);}catch(e){setError(e instanceof Error?e.message:'Could not connect notifications');setBusy(false);}};
 return <span className="inline-flex items-center"><button type="button" className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold text-xs transition-all cursor-pointer disabled:opacity-50" disabled={busy} onClick={()=>void connect()}>{busy?'Opening…':'Connect Nexora notifications'}</button>{error&&<span role="alert" className="block text-red-700 text-xs ml-2">{error}</span>}</span>;
}

