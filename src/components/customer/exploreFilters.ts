import {promotionActive} from '../../lib/promotionStatus';
import {menu,staff,distanceFrom,type Salon,type Service,type Slot} from './model';
import {matchesCustomerCategory} from './categoryGroups';
export type ExploreFilters={query:string;group:string;treatment:string;city:string;stylist:string;minPrice:string;maxPrice:string;deals:string;sort:string;includeDemos:boolean};
export const DEFAULT_EXPLORE_FILTERS:ExploreFilters={query:'',group:'all',treatment:'all',city:'',stylist:'',minPrice:'',maxPrice:'',deals:'all',sort:'recommended',includeDemos:true};
export type ExploreMatch={salon:Salon;services:Service[];stylistId:string;price:number};
export function filterExplore(salons:Salon[],f:ExploreFilters,now:number,point:[number,number]|null=null,favorites:string[]=[]):ExploreMatch[]{
 const q=f.query.trim().toLowerCase(),city=f.city.trim().toLowerCase();
 const matches=salons.flatMap(salon=>{
  const p=salon.content.profile,c=p.promoCampaign;
  if((!f.includeDemos&&salon.demoTemplateId)||!matchesCustomerCategory(salon,f.group)||city&&!String(p.city||'').toLowerCase().includes(city))return [];
  const stylistId=f.stylist.startsWith(salon.slug+'|')?f.stylist.slice(salon.slug.length+1):'any';
  if(f.stylist&&(stylistId==='any'||!staff(salon).some(s=>s.id===stylistId)))return [];
  if(f.deals!=='all'&&(!promotionActive(c,now)||(f.deals==='codes'&&!String(c?.promoCode||'').trim())||(f.deals==='packages'&&!(Number(c?.discountPercent)>=20&&Number(c?.discountPercent)<=100))))return [];
  const salonSearch=[p.businessName,(typeof p.businessType === 'string' ? p.businessType.replaceAll('_',' ') : ''),p.city,p.address,...staff(salon).map(s=>s.name)].join(' ').toLowerCase();
  const services=menu(salon).filter(s=>Number.isFinite(Number(s.price))&&Number(s.price)>=0&&(f.treatment==='all'||s.category===f.treatment)&&(f.minPrice===''||Number(s.price)>=Number(f.minPrice))&&(f.maxPrice===''||Number(s.price)<=Number(f.maxPrice))&&(!q||salonSearch.includes(q)||[s.name,s.category,s.description].join(' ').toLowerCase().includes(q))&&(f.deals==='all'||s.id===c?.selectedServiceId)&&(f.deals!=='packages'||/package|combo|ritual/i.test([s.name,s.category].join(' '))));
  return services.length?[{salon,services,stylistId,price:Math.min(...services.map(s=>Number(s.price)))}]:[];
 });
 return matches.sort((a,b)=>{if(f.sort==='price-low')return a.price-b.price;if(f.sort==='price-high')return b.price-a.price;if(f.sort==='nearest'){const da=distanceFrom(point,a.salon),db=distanceFrom(point,b.salon);if(da!==db)return da<db?-1:1;}return Number(!!a.salon.demoTemplateId)-Number(!!b.salon.demoTemplateId)||Number(favorites.includes(b.salon.slug))-Number(favorites.includes(a.salon.slug))});
}
export function slotMatchesPeriod(slot:Slot,period:string){const hour=Number(slot.time.split(':')[0]);return period==='any'||period==='morning'&&hour<12||period==='afternoon'&&hour>=12&&hour<17||period==='evening'&&hour>=17;}
