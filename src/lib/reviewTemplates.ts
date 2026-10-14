export interface ReviewTemplate {id:string;label:string;text:string;}
/** Editable writing suggestions. Choosing a draft never changes the customer's rating. */
export function reviewTemplates(serviceName:string):ReviewTemplate[]{
 const service=serviceName.trim();if(!service)return [];
 const details=/beard|shav|moustache/i.test(service)?'shape aur finishing':/color|colour|balayage|highlight/i.test(service)?'colour aur finish':/nail|manicure|pedicure/i.test(service)?'design aur finishing':/facial|skin|glow|hydra/i.test(service)?'skin care aur comfort':/lash|brow/i.test(service)?'shape aur overall look':/makeup|bridal/i.test(service)?'makeup finish aur overall look':/massage|spa|ayurved/i.test(service)?'comfort aur relaxation':/tattoo|body art/i.test(service)?'design aur detailing':/cut|hair|scissor|styling/i.test(service)?'styling aur finishing':'service aur overall experience';
 return [
  {id:'result',label:'Result & finishing',text:`Maine ${service} service li. ${details} mujhe pasand aaye. Result meri expectations ke according tha.`},
  {id:'care',label:'Care & comfort',text:`${service} ke dauran team ne meri preferences dhyan se suni aur comfort ka khayal rakha. Overall experience achha raha.`},
  {id:'team',label:'Team & consultation',text:`${service} ke liye consultation helpful thi. Team ne process samjhaya aur mere questions ka jawab diya. Main apne experience se satisfied hoon.`},
  {id:'value',label:'Value & overall experience',text:`Maine ${service} try ki. Service, time aur pricing ka overall experience satisfactory tha. Mere liye yeh ek achha studio visit raha.`},
  {id:'feedback',label:'Balanced feedback',text:`Maine ${service} service li. Kuch cheezein achhi lagi, lekin result aur experience mein improvement ki gunjaish hai. Main apna feedback team ke saath share karna chahta/chahti hoon.`},
 ];
}
