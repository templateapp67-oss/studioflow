import {promotionActive,type Promotion} from '../../lib/promotionStatus';
import {menu,type Salon,type Service} from './model';
export type CustomerOffer={salon:Salon;service:Service;campaign:Promotion;demo:boolean};
export function discoveryFeed(salons:Salon[],now=Date.now()){
 const quick=salons.flatMap(salon=>menu(salon).filter(s=>Number(s.durationMinutes)>0&&Number(s.durationMinutes)<=30&&Number.isFinite(Number(s.price))&&Number(s.price)>=0).map(service=>({salon,service})));
 const offers:CustomerOffer[]=salons.flatMap(salon=>{const campaign:Promotion=salon.content.profile.promoCampaign;const service=menu(salon).find(s=>s.id===campaign?.selectedServiceId);return promotionActive(campaign,now)&&service?[{salon,service,campaign,demo:!!salon.demoTemplateId}]:[]});
 const lastMinute=offers.filter(o=>o.campaign.lastMinute&&(o.demo||!!o.campaign.endsAt&&Date.parse(o.campaign.endsAt)-now<=86400000)).sort((a,b)=>Number(a.demo)-Number(b.demo)||(Date.parse(a.campaign.endsAt||'')||Infinity)-(Date.parse(b.campaign.endsAt||'')||Infinity));
 return{quick,offers,lastMinute};
}
