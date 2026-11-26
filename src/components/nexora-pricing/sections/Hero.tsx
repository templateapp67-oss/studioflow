import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowDown, ArrowRight, BarChart3, CalendarDays, Clock3, IndianRupee, LayoutDashboard, Scissors, ShieldCheck, Sparkles, UsersRound, Wallet } from 'lucide-react';
import { PRICING_PAGE_COPY, SAMPLE_CONTENT } from '../../../lib/nexoraPricing';

export function DashboardPreview() {
  const [activeView, setActiveView] = useState<'overview' | 'bookings' | 'team' | 'billing' | 'reports'>('overview');
  const viewLabels = { overview: 'Workspace overview', bookings: 'Bookings & calendar', team: 'Staff schedule', billing: 'Billing overview', reports: 'Business reports' };
  const viewIcons = [LayoutDashboard, CalendarDays, UsersRound, Wallet, BarChart3] as const;
  const viewIds = ['overview', 'bookings', 'team', 'billing', 'reports'] as const;
  return <div className="np-dashboard" aria-label="Interactive illustrative salon workspace preview">
    <div className="np-dash-top"><div className="np-window-dots"><i/><i/><i/></div><span>Salon workspace <small>{SAMPLE_CONTENT?'SAMPLE CONTENT · VERIFY BEFORE PUBLISHING':'ILLUSTRATIVE PREVIEW'}</small></span><div className="np-dash-profile" aria-hidden="true">N</div></div>
    <div className="np-dash-body">
      <nav className="np-dash-side" aria-label="Dashboard preview sections">
        <span className="np-dash-mark" aria-hidden="true"><Scissors size={16}/></span>
        {viewIds.map((view,index)=>{const Icon=viewIcons[index];return <button key={view} type="button" className={activeView===view?'active':''} aria-label={viewLabels[view]} aria-pressed={activeView===view} title={viewLabels[view]} onClick={()=>setActiveView(view)}><Icon size={16}/></button>;})}
      </nav>
      <div className="np-dash-content">
        <div className="np-dash-greeting"><div><small>YOUR SALON WORKSPACE</small><h3>{viewLabels[activeView]}</h3></div><span className="np-dash-readonly">Preview</span></div>
        <div className="np-dash-stats"><div><small>Today's bookings</small><b>—</b><span><CalendarDays size={13}/> No live data</span></div><div><small>Revenue summary</small><b>—</b><span><IndianRupee size={13}/> No live data</span></div><div><small>Customers</small><b>—</b><span><UsersRound size={13}/> No live data</span></div></div>
        <div className="np-dash-lower"><div className="np-dash-panel"><div className="np-panel-title"><b>Booking calendar</b><span>Illustrative</span></div><div className="np-calendar"><div className="np-time-col">09 AM<br/>10 AM<br/>11 AM<br/>12 PM</div><div className="np-calendar-grid"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></div></div><div className="np-dash-panel np-staff-panel"><div className="np-panel-title"><b>Staff schedule</b><UsersRound size={15}/></div><div className="np-preview-empty">Schedule preview<br/><span>Illustrative layout · no salon records</span></div><div className="np-sales"><span><BarChart3 size={14}/> Sales overview</span><p>No live business data</p></div></div></div>
      </div>
    </div><div className="np-demo-label"><Sparkles size={13}/> Click the sidebar to explore · no live salon data</div>
  </div>;
}

export function Hero({ onExplore }: { onExplore: () => void }) {
  const reduceMotion = useReducedMotion();
  return <section className="np-hero"><div className="np-orb np-orb-a"/><div className="np-orb np-orb-b"/><div className="np-container np-hero-grid">
    <motion.div className="np-hero-copy" initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:reduceMotion?0:.55}}>
      <div className="np-eyebrow"><span/> {PRICING_PAGE_COPY.hero.eyebrow}</div><h1>{PRICING_PAGE_COPY.hero.title} <em>{PRICING_PAGE_COPY.hero.emphasis}</em></h1>
      <p>{PRICING_PAGE_COPY.hero.description}</p>
      <div className="np-hero-note">{PRICING_PAGE_COPY.hero.note}</div>
      <div className="np-hero-actions"><button className="np-btn np-btn-gold" onClick={onExplore}>Explore Plans <ArrowDown size={17}/></button><a className="np-btn np-btn-outline" href="#comparison">Compare All Features <ArrowRight size={16}/></a></div>
      <div className="np-trust-line"><span><ShieldCheck size={16}/> Clear annual pricing</span><span><IndianRupee size={16}/> Approved monthly and yearly rates</span></div>
    </motion.div><motion.div className="np-hero-art" initial={{opacity:0,scale:.97}} animate={{opacity:1,scale:1}} transition={{duration:reduceMotion?0:.65,delay:reduceMotion?0:.12}}><div className="np-art-glow"/><DashboardPreview/><div className="np-float-tag np-float-calendar"><CalendarDays size={16}/><span><b>Booking calendar</b><small>Appointments at a glance</small></span></div><div className="np-float-tag np-float-secure"><ShieldCheck size={16}/><span><b>Salon workspace</b><small>Tools in one place</small></span></div></motion.div>
  </div></section>;
}
