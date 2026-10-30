const ENABLED='nexora_update_notifications';
const SEEN='nexora_update_notification_version';
const delivered=new Set<string>();
const sending=new Set<string>();
export function updateNotificationState(){
 if(typeof Notification==='undefined'||!window.isSecureContext)return 'unsupported';
 if(Notification.permission==='denied')return 'denied';
 try{return Notification.permission==='granted'&&localStorage.getItem(ENABLED)==='on'?'enabled':'disabled'}catch{return 'disabled'}
}
export async function enableUpdateNotifications(){
 if(updateNotificationState()==='unsupported')return 'unsupported';
 try{
  const permission=await Notification.requestPermission();
  if(permission==='granted')localStorage.setItem(ENABLED,'on');
  window.dispatchEvent(new Event('nexora-update-notifications'));
  return updateNotificationState();
 }catch{return 'disabled'}
}
export function disableUpdateNotifications(){
 try{localStorage.removeItem(ENABLED)}catch{/* Browser storage may be restricted. */}
 window.dispatchEvent(new Event('nexora-update-notifications'));
}
export async function notifyAppUpdate(version:string){
 if(!/^[a-z0-9-]{16,80}$/i.test(version)||updateNotificationState()!=='enabled'||delivered.has(version)||sending.has(version))return false;
 try{if(localStorage.getItem(SEEN)===version)return false}catch{/* In-memory deduplication still applies. */}
 sending.add(version);
 try{
  // Only public routing parameters belong in a device notification, never auth/referral tokens.
  const url=new URL('/',window.location.origin),current=new URL(window.location.href);
  for(const key of ['app','site','module']){const value=current.searchParams.get(key);if(value&&/^[a-z0-9_-]{1,100}$/i.test(value))url.searchParams.set(key,value)}
  const options:NotificationOptions={body:'Naye features ready hain. Nexora kholkar update dekhein. Booking ya payment interrupt nahi hoga.',tag:`nexora-update-${version}`,icon:'/customer-icon-192.png',data:{type:'nexora-update',url:url.href}};
  const registration='serviceWorker' in navigator?await navigator.serviceWorker.getRegistration('/'):undefined;
  if(registration?.active)await registration.showNotification('Nexora update available',options);
  else {const notification=new Notification('Nexora update available',options);notification.onclick=()=>{window.focus();notification.close()}}
  delivered.add(version);try{localStorage.setItem(SEEN,version)}catch{/* No account data is stored here. */}
  return true;
 }catch{return false}finally{sending.delete(version)}
}
