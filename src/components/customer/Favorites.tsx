import React from 'react';
import {Heart} from 'lucide-react';
import {SalonDirectoryCards} from './SalonDirectoryCards';
import {Empty} from './Parts';
import type {Salon} from './model';
export function CustomerFavorites({salons,favorites,open,book,save,explore,signedIn,signIn}:{salons:Salon[];favorites:string[];open:(s:Salon)=>void;book:(s:Salon,ids?:string[])=>void;save:(s:string)=>void;explore:()=>void;signedIn:boolean;signIn:()=>void}){const saved=salons.filter(s=>!s.demoTemplateId&&favorites.includes(s.slug));return <div className="cr-zip-favorites"><div className="cr-zip-page-title"><h1>Saved Salons & Favorites</h1><p>Quickly access your preferred salons for fast rebooking</p></div>{!signedIn?<Empty action="Sign in" onAction={signIn}>Sign in to see your saved salons.</Empty>:saved.length?<SalonDirectoryCards salons={saved} favorites={favorites} open={open} book={book} save={save}/>:<section className="cr-empty"><Heart size={40}/><h3>No saved salons yet</h3><p>Tap the heart icon on any salon to save it here for instant bookings.</p><button className="cr-primary" onClick={explore}>Discover Salons</button></section>}</div>}
