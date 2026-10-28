import {PromotionalBanner} from "./PromotionalBanner";
import React,{useState} from 'react';
import {Smartphone,Download,Share2,ArrowUpRight,Search,CalendarCheck,Check} from 'lucide-react';
export const CUSTOMER_APP_ROUTE='/?app=1';
export const CUSTOMER_APP_INSTALL_ROUTE='/?app=1&install=1';
export const CUSTOMER_APP_POSTER='/promo/nexora-customer-app-ad.png';
export const customerAppCaption=(origin:string)=>`अब salon booking, सीधे Nexora app से! Salon खोजें, services चुनें और slot बुक करें। हर बार salon website खोलने की ज़रूरत नहीं। Android Chrome में link खोलें → ⋮ → Add to Home screen → Install.\n${origin}${CUSTOMER_APP_INSTALL_ROUTE}`;
export async function shareCustomerApp(includePoster=false){
 const url=location.origin+CUSTOMER_APP_INSTALL_ROUTE,text=customerAppCaption(location.origin).split('\n')[0];
 if(navigator.share){
  if(includePoster&&navigator.canShare){try{const response=await fetch(CUSTOMER_APP_POSTER);if(!response.ok)throw new Error('Poster unavailable');const file=new File([await response.blob()],'nexora-customer-app-ad.png',{type:'image/png'});if(navigator.canShare({files:[file]})){await navigator.share({title:'Nexora Customer App',text,url,files:[file]});return 'App poster and link shared';}}catch(e){if((e as Error).name==='AbortError')throw e;}}
  await navigator.share({title:'Nexora Customer App',text,url});return 'App link shared';
 }
 await navigator.clipboard.writeText(customerAppCaption(location.origin));return 'App message and link copied. Download the poster below to share it too.';
}
export function AppAnnouncementStrip(){return <PromotionalBanner label="Nexora app announcement" id="customer-app-v1" text="अब salon booking, सीधे Nexora app से! Salon खोजें और slot बुक करें." actionLabel="Open / Install App" actionHref={CUSTOMER_APP_INSTALL_ROUTE} className="nexora-app-strip"/>;}

export function CustomerAppPromotion({installControl}:{installControl?:React.ReactNode}){
 const [notice,setNotice]=useState('');
 async function share(){try{setNotice(await shareCustomerApp(true))}catch(e){if((e as Error).name!=='AbortError')setNotice('Use Copy app link or download the poster to share.')}}
 async function copy(){try{await navigator.clipboard.writeText(customerAppCaption(location.origin));setNotice('App message and link copied')}catch{setNotice('Open the app link and copy it from your browser address bar.')}}
 return <section className="nexora-app-promotion" id="nexora-customer-app" aria-label="Install and share Nexora customer app"><div className="nexora-app-promo-inner"><a className="nexora-app-poster" href={CUSTOMER_APP_INSTALL_ROUTE} aria-label="Open Nexora app install guide"><img src={CUSTOMER_APP_POSTER} alt="Nexora customer app: salon खोजें, services चुनें और slot बुक करें. Android Chrome में install करें." width="1122" height="1402" loading="lazy"/></a><div className="nexora-app-copy"><span className="nexora-app-eyebrow"><Smartphone size={16}/> NEXORA CUSTOMER APP</span><h2>आपका salon,<br/>अब आपके phone में.</h2><p className="nexora-app-lead">हर booking के लिए salon की website खोलना ज़रूरी नहीं. Nexora app में salon search करें, services देखें और अपना पसंदीदा slot बुक करें.</p><ul><li><Search size={18}/>Salon, service या city से search करें</li><li><CalendarCheck size={18}/>Professional और available booking slot चुनें</li><li><Check size={18}/>My Bookings से bookings दोबारा देखें और manage करें</li></ul><div className="nexora-app-actions">{installControl||<a className="nexora-app-primary" href={CUSTOMER_APP_INSTALL_ROUTE}><Download size={18}/>Install / Add to Home screen</a>}<a className="nexora-app-secondary" href={CUSTOMER_APP_ROUTE}>Open Customer App <ArrowUpRight size={16}/></a></div><div className="nexora-install-steps"><h3>Android phone पर कैसे install करें?</h3><ol><li>App link को Android Chrome में खोलें.</li><li>Install Nexora App दबाएं. Prompt न आए तो Chrome का ⋮ menu खोलें.</li><li>Add to Home screen → Install चुनें. फिर home screen के Nexora icon से app खोलें.</li></ol><p>Chrome से install होने वाली web app है. Play Store या APK download की ज़रूरत नहीं. दूसरे browsers में इसे link से खोल सकते हैं.</p></div><div className="nexora-app-share"><button onClick={()=>void share()}><Share2 size={16}/>Share App & Poster</button><button onClick={()=>void copy()}>Copy app link</button><a href={CUSTOMER_APP_POSTER} download="nexora-customer-app-ad.png">Download ad image</a></div>{notice&&<p className="nexora-app-notice" role="status">{notice}</p>}</div></div></section>
}
