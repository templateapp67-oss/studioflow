import React,{useEffect,useRef,useState} from 'react';
import {CURRENT_BUILD,latestAppVersion,applyAppVersion,alreadyTriedVersion,updateReadiness} from '../lib/appUpdates';
import {notifyAppUpdate} from '../lib/updateNotifications';
import {UpdateNotificationSettings} from './UpdateNotificationSettings';
export function AppUpdateManager({currentBuild=CURRENT_BUILD,checkEveryMs=45000,autoAfterMs=5000,reload=applyAppVersion}:{currentBuild?:string;checkEveryMs?:number;autoAfterMs?:number;reload?:(version:string)=>boolean}){
 const [version,setVersion]=useState(''),[status,setStatus]=useState({busy:false,safe:false,reason:''}),[seconds,setSeconds]=useState(5),[snoozed,setSnoozed]=useState(false);
 const pending=useRef(''),dirty=useRef(new Set<Element>()),safeSince=useRef(0),snoozeUntil=useRef(0),reloading=useRef(false);
 useEffect(()=>{
  if(currentBuild==='development')return;
  let active=true,inflight=false,lastCheck=0;
  const edit=(event:Event)=>{const node=event.target as Element;if(node?.matches?.('input,textarea,select,[contenteditable="true"]')&&!node.closest('.sf-app-update'))dirty.current.add(node)};
  const check=async()=>{
   if(inflight||document.visibilityState==='hidden'||navigator.onLine===false||Date.now()-lastCheck<10000)return;
   inflight=true;lastCheck=Date.now();
   try{const latest=await latestAppVersion();if(active&&latest&&latest!==currentBuild&&latest!==pending.current){pending.current=latest;safeSince.current=0;snoozeUntil.current=0;setSnoozed(false);setVersion(latest);void notifyAppUpdate(latest);}}
   catch{/* Offline, captive portals and transient errors must not interrupt the app. */}finally{inflight=false;}
  };
  document.addEventListener('input',edit,true);document.addEventListener('change',edit,true);
  document.addEventListener('visibilitychange',check);window.addEventListener('focus',check);window.addEventListener('online',check);
  void check();const poll=setInterval(()=>void check(),checkEveryMs);
  return()=>{active=false;clearInterval(poll);document.removeEventListener('input',edit,true);document.removeEventListener('change',edit,true);document.removeEventListener('visibilitychange',check);window.removeEventListener('focus',check);window.removeEventListener('online',check)};
 },[currentBuild,checkEveryMs]);
 useEffect(()=>{
  if(!version)return;
  const tick=()=>{
   const now=Date.now(),state=navigator.onLine===false?{busy:true,safe:false,reason:'Internet offline hai. Connection lautne par update hoga.'}:updateReadiness(dirty.current);setStatus(state);
   if(now<snoozeUntil.current){setSnoozed(true);safeSince.current=0;return}setSnoozed(false);
   if(!state.safe||document.visibilityState==='hidden'||navigator.onLine===false||alreadyTriedVersion(version)){safeSince.current=0;return;}
   if(!safeSince.current)safeSince.current=now;
   const left=Math.max(0,Math.ceil((autoAfterMs-(now-safeSince.current))/1000));setSeconds(left);
   if(!left&&!reloading.current){reloading.current=true;reload(version);}
  };
  tick();const timer=setInterval(tick,500);return()=>clearInterval(timer);
 },[version,autoAfterMs,reload]);
 if(!version||snoozed)return null;
 return <aside className="sf-app-update" aria-label="App update available" role="status" aria-live="polite"><div className="sf-update-icon" aria-hidden="true">↻</div><div><strong>Nexora update available</strong><p>{status.reason||(alreadyTriedVersion(version)?'Latest version ready hai. Update now dabayein.':`Naye features ready hain. ${seconds}s mein automatic update hoga.`)}</p><small>Website aur installed app · Login aur saved data same rahenge.</small><div className="sf-update-actions"><button type="button" disabled={status.busy} onClick={()=>{const state=updateReadiness(dirty.current);setStatus(state);if(!state.busy&&!reloading.current){reloading.current=true;reload(version)}}}>Update now</button><button type="button" onClick={()=>{snoozeUntil.current=Date.now()+5*60000;safeSince.current=0;setSnoozed(true)}}>5 min later</button></div><UpdateNotificationSettings pendingVersion={version} compact/></div></aside>;
}
