import {createContext} from 'react';
import {indiaDate} from './bookingDates';
import type {Stylist} from '../types';

/** Explicitly enabled only for the public template viewer, never a live salon. */
export const TemplateBookingPreview = createContext(false);

/** Illustrative slots for a demo only. They never create a hold or payment. */
export function templatePreviewSlots(date:string, staff:Stylist[], stylistId:string, minutes:number, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < indiaDate(0,now) || date > indiaDate(90,now) || !Number.isFinite(minutes) || minutes <= 0) return [];
  const specialist = staff.find(item => stylistId === 'any_available' || stylistId === 'any' || item.id === stylistId);
  if (!specialist) return [];
  const rows: {time:string;label:string;available:boolean;stylistId:string}[] = [];
  // These are deliberately labelled example hours, not a claim of live availability.
  for (let start=10*60;start+minutes<=18*60;start+=30) {
    const hh=String(Math.floor(start/60)).padStart(2,'0'), mm=String(start%60).padStart(2,'0');
    const time=`${hh}:${mm}`;
    if (Date.parse(`${date}T${time}:00+05:30`) <= now.getTime()) continue;
    const hour=Math.floor(start/60);
    rows.push({time,label:`${String(hour%12||12).padStart(2,'0')}:${mm} ${hour>=12?'PM':'AM'}`,available:true,stylistId:specialist.id});
  }
  return rows;
}
