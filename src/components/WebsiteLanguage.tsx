import React,{createContext,useContext,useState} from 'react';
import type {WebsiteLanguage} from '../lib/conversionFeatures';
const copy:Record<string,[string,string]>={
 'Home':['होम','Home'],'Services':['सेवाएँ','Services'],'Packages':['पैकेज','Packages'],'Gallery':['गैलरी','Gallery'],'About':['हमारे बारे में','Hamare baare mein'],'Contact':['संपर्क','Sampark'],'My Bookings':['मेरी बुकिंग','Meri bookings'],'Bookings':['बुकिंग','Bookings'],
 'Customer Login':['ग्राहक लॉगिन','Customer login'],'Sign up':['खाता बनाएँ','Sign up'],'Book':['बुक करें','Book karein'],'Book Appointment':['अपॉइंटमेंट बुक करें','Appointment book karein'],'Book an Appointment':['अपॉइंटमेंट बुक करें','Appointment book karein'],
 'Offers':['ऑफ़र','Offers'],'Our Team':['हमारी टीम','Hamari team'],'Lookbook':['लुकबुक','Lookbook'],'Reviews':['समीक्षाएँ','Reviews'],'Location':['स्थान','Location'],'Get directions':['रास्ता देखें','Rasta dekhein'],'About our studio':['हमारे स्टूडियो के बारे में','Hamare studio ke baare mein'],
 'Curated Services & Treatments':['सेवाएँ और ट्रीटमेंट','Services aur treatments'],'Packages & Signature Rituals':['पैकेज और खास सेवाएँ','Packages aur khaas services'],'Meet Our Specialists':['हमारे विशेषज्ञ','Hamare specialists'],'Client Experiences':['ग्राहकों के अनुभव','Customer experiences'],'Studio Lookbook':['स्टूडियो लुकबुक','Studio lookbook'],'Location & Studio Hours':['स्थान और समय','Location aur timings'],
 'Choose for online booking':['ऑनलाइन बुकिंग के लिए चुनें','Online booking ke liye chunein'],'View profile & reviews':['प्रोफ़ाइल और समीक्षाएँ','Profile aur reviews dekhein'],'Weekly availability':['साप्ताहिक उपलब्धता','Haftay ke available slots'],'Choose service':['सेवा चुनें','Service chunein'],'Available slots':['उपलब्ध समय','Available slots'],'Before':['पहले','Pehle'],'After':['बाद में','Baad mein'],'Add-on services':['अतिरिक्त सेवाएँ','Extra services'],'Booking summary':['बुकिंग सारांश','Booking summary'],'All':['सभी','Sabhi']
};
const LanguageContext=createContext({language:'en' as WebsiteLanguage,setLanguage:(_v:WebsiteLanguage)=>{},t:(s:string)=>s});
export function WebsiteLanguageProvider({children,defaultLanguage='en'}:{key?:React.Key;children:React.ReactNode;defaultLanguage?:WebsiteLanguage}){
 const [language,setLanguageState]=useState<WebsiteLanguage>(()=>{try{const saved=localStorage.getItem('nexora-website-language');if(saved==='en'||saved==='hi'||saved==='hinglish')return saved;}catch{}return defaultLanguage;});
 const setLanguage=(value:WebsiteLanguage)=>{setLanguageState(value);try{localStorage.setItem('nexora-website-language',value)}catch{}};
 const t=(text:string)=>language==='en'?text:copy[text]?.[language==='hi'?0:1]||text;
 return <LanguageContext.Provider value={{language,setLanguage,t}}><div lang={language==='hi'?'hi':language==='hinglish'?'hi-Latn':'en'}>{children}</div></LanguageContext.Provider>;
}
export const useWebsiteLanguage=()=>useContext(LanguageContext);
export function WebsiteLanguageSwitcher(){const {language,setLanguage}=useWebsiteLanguage();return <label className="sf-language-switch"><span className="sr-only">Website language</span><select aria-label="Website language" value={language} onChange={e=>setLanguage(e.target.value as WebsiteLanguage)}><option value="en">English</option><option value="hi">हिंदी</option><option value="hinglish">Hinglish</option></select></label>;}
