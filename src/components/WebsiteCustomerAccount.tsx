import React,{useEffect,useState} from 'react';
import {supabase} from '../lib/supabase';
import type {Booking} from './customer/model';
import type {Session} from '@supabase/supabase-js';
import {CustomerProfilePage} from './customer/Profile';
import {useCustomerProfile} from './customer/useCustomerProfile';
import {useCustomerCatalog} from './customer/useCustomerCatalog';
import './customer-app.css';
import './customer/zip-ui.css';
import './customer/reference-layout.css';
export function WebsiteCustomerAccount({session,account}:{session:Session;account:ReturnType<typeof useCustomerProfile>}){
 const {salons}=useCustomerCatalog(0);
 const [revision,setRevision]=useState(0),[data,setData]=useState<{uid:string;bookings:Booking[];points:number;error:string}>({uid:'',bookings:[],points:0,error:''});
 useEffect(()=>{let active=true;const uid=session.user.id;void Promise.all([supabase.from('studioflow_bookings').select('id,owner_id,status,payload,hold_expires_at,starts_at,ends_at').eq('customer_id',uid).order('starts_at',{ascending:false}),supabase.rpc('studioflow_android_rewards')]).then(([b,r])=>{if(active)setData({uid,bookings:(b.data||[]) as Booking[],points:(Array.isArray(r.data)?r.data:[]).reduce((sum:number,x:any)=>sum+Number(x.points||0),0),error:b.error||r.error?'Account history could not load. Please retry.':''})});return()=>{active=false}},[session.user.id,revision]);
 if(data.uid!==session.user.id)return <p role="status">Loading your account…</p>;
 if(data.error)return <p role="alert">{data.error}<button onClick={()=>setRevision(n=>n+1)}>Retry</button></p>;
 return <div className={'cr-app cr-zip-ui sf-website-account-settings '+(account.preferences.theme==='dark'?'cr-dark':'')}><CustomerProfilePage key={session.user.id} session={session} account={account} points={data.points} bookings={data.bookings} salons={salons.filter(s=>!s.demoTemplateId)} navigate={tab=>location.assign('/?app=1&tab='+tab)} signIn={()=>location.assign('/?app=1&auth=forgot')} chooseAddress={city=>location.assign('/?app=1&city='+encodeURIComponent(city))} install={<a href="/?app=1&install=1">Install Nexora app</a>}/></div>;
}
