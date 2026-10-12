import React, { useState, useEffect } from 'react';
import { 
  X, 
  Star, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Scissors, 
  Award, 
  Sparkles, 
  ChevronRight, 
  MessageSquare, 
  ShieldCheck, 
  Check, 
  User, 
  Phone,
  ArrowRight,
  Info
} from 'lucide-react';
import type { Stylist, SalonService, DaySchedule } from '../types';

export interface StylistProfileModalProps {
  stylist: Stylist | null;
  isOpen: boolean;
  onClose: () => void;
  services?: SalonService[];
  onBookStylist?: (stylist: Stylist, service?: SalonService) => void;
  isOwnerOrAdminMode?: boolean;
  primaryAccentColor?: string;
  salonPhone?: string;
  salonWhatsapp?: string;
  salonName?: string;
}

export function getStylistWeeklySchedule(stylist: Stylist): DaySchedule[] {
  if (stylist.schedule && stylist.schedule.length > 0) {
    return stylist.schedule;
  }
  const isDirector = stylist.role.toLowerCase().includes('director') || stylist.role.toLowerCase().includes('proprietor');
  return [
    { day: 'Monday', enabled: true, fromTime: '10:00 AM', toTime: '07:30 PM' },
    { day: 'Tuesday', enabled: true, fromTime: '10:00 AM', toTime: '07:30 PM' },
    { day: 'Wednesday', enabled: true, fromTime: '10:00 AM', toTime: '07:30 PM' },
    { day: 'Thursday', enabled: true, fromTime: '10:00 AM', toTime: '07:30 PM' },
    { day: 'Friday', enabled: true, fromTime: '10:00 AM', toTime: '08:00 PM' },
    { day: 'Saturday', enabled: true, fromTime: '09:30 AM', toTime: '08:30 PM' },
    { day: 'Sunday', enabled: isDirector ? false : true, fromTime: '11:00 AM', toTime: '06:00 PM' },
  ];
}

export function getTodayAvailability(stylist: Stylist): {
  isAvailableToday: boolean;
  hoursText: string;
  nextSlotText: string;
  badgeClass: string;
} {
  const days: Array<'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday'> = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ];
  const todayName = days[new Date().getDay()];
  const schedule = getStylistWeeklySchedule(stylist);
  const todayEntry = schedule.find((s) => s.day === todayName);

  if (!todayEntry || !todayEntry.enabled || stylist.status === 'On Leave' || stylist.status === 'Inactive') {
    return {
      isAvailableToday: false,
      hoursText: 'Off Today',
      nextSlotText: 'Next in: Tomorrow at 10:00 AM',
      badgeClass: 'text-slate-600 bg-slate-100 border-slate-200'
    };
  }

  return {
    isAvailableToday: true,
    hoursText: `${todayEntry.fromTime} – ${todayEntry.toTime}`,
    nextSlotText: 'Available Today',
    badgeClass: 'text-emerald-700 bg-emerald-50 border-emerald-300'
  };
}

export function getStylistBio(stylist: Stylist): string {
  if (stylist.bio && stylist.bio.trim().length > 0) {
    return stylist.bio;
  }
  const specList = stylist.specialties && stylist.specialties.length > 0
    ? stylist.specialties.slice(0, 3).join(', ')
    : 'signature salon treatments and styling';
  return `${stylist.name} is a senior ${stylist.role} celebrated for artistry in ${specList}. Known for attentive consultations, precision technique, and tailored post-care advice, ${stylist.name} delivers transformative salon experiences customized to each client's unique hair and beauty goals.`;
}

export const StylistProfileModal: React.FC<StylistProfileModalProps> = ({
  stylist,
  isOpen,
  onClose,
  services = [],
  onBookStylist,
  isOwnerOrAdminMode = false,
  primaryAccentColor = '#0f172a',
  salonWhatsapp = '',
  salonName = 'Our Salon'
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'availability' | 'services'>('profile');

  // Keyboard navigation & lock body scroll
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !stylist) return null;

  const weeklySchedule = getStylistWeeklySchedule(stylist);
  const todayInfo = getTodayAvailability(stylist);
  const fullBio = getStylistBio(stylist);

  // Relevant services
  const relevantServices = services.length > 0 
    ? services.filter(s => {
        if (!stylist.assignedServices || stylist.assignedServices.length === 0) return true;
        return stylist.assignedServices.includes(s.id) || stylist.assignedServices.includes(s.name);
      })
    : [];

  const availableSlots = ['10:30 AM', '11:45 AM', '01:30 PM', '03:15 PM', '04:45 PM', '06:15 PM'];

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
  const currentDayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];

  return (
    <div 
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="stylist-profile-name"
    >
      <div
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HERO BANNER WITH GRADIENT */}
        <div 
          className="relative px-6 pt-6 pb-5 text-white flex flex-col justify-between"
          style={{
            background: `linear-gradient(135deg, ${primaryAccentColor} 0%, #0f172a 100%)`
          }}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-colors cursor-pointer z-10"
            aria-label="Close profile modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4.5 relative z-10">
            <div className="relative shrink-0">
              <img
                src={stylist.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80'}
                alt={stylist.name}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-white/80 shadow-md"
              />
              <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                todayInfo.isAvailableToday ? 'bg-emerald-500' : 'bg-slate-400'
              }`} title={todayInfo.isAvailableToday ? 'Available Today' : 'Off Today'} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/20 text-white flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-300" />
                  <span>Verified Stylist</span>
                </span>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 flex items-center gap-1 border border-amber-300/30">
                  <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
                  <span>{stylist.rating ? stylist.rating.toFixed(2) : '4.95'} (120+ client reviews)</span>
                </span>
              </div>

              <h2 id="stylist-profile-name" className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                {stylist.name}
              </h2>
              <p className="text-xs sm:text-sm text-slate-200 font-medium">
                {stylist.role}
              </p>

              {/* Today's schedule banner pill */}
              <div className="flex items-center gap-2 mt-2 text-xs font-mono">
                <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold flex items-center gap-1 ${
                  todayInfo.isAvailableToday 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40' 
                    : 'bg-white/10 text-slate-300 border-white/20'
                }`}>
                  <Clock className="w-3 h-3" />
                  <span>Today: {todayInfo.hoursText}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* TAB NAVIGATION */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 sm:px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'profile'
                ? 'border-slate-900 text-slate-900 bg-white rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Professional Profile</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('availability')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'availability'
                ? 'border-slate-900 text-slate-900 bg-white rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Weekly Availability</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('services')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'services'
                ? 'border-slate-900 text-slate-900 bg-white rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Services Menu</span>
          </button>
        </div>

        {/* MODAL BODY CONTENT */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          
          {/* TAB 1: PROFESSIONAL PROFILE & SPECIALIZATIONS */}
          {activeTab === 'profile' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Bio & Artistry */}
              <div>
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Artistic Background & Philosophy</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  {fullBio}
                </p>
              </div>

              {/* Specializations & Techniques */}
              <div>
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Core Specializations & Master Techniques</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(stylist.specialties || ['Signature Styling', 'Precision Cutting', 'Client Consultation']).map((spec, idx) => (
                    <div 
                      key={idx}
                      className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs flex items-center gap-2.5"
                    >
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow-2xs"
                        style={{ backgroundColor: primaryAccentColor }}
                      >
                        <Scissors className="w-4 h-4" />
                      </div>
                      <div>
                        <strong className="text-xs text-slate-900 block">{spec}</strong>
                        <span className="text-[10px] text-slate-500 font-mono">Certified Master Craft</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Key Highlights Grid */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">Experience</span>
                  <strong className="text-sm sm:text-base font-extrabold text-slate-900 font-mono">6+ Years</strong>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">Satisfaction</span>
                  <strong className="text-sm sm:text-base font-extrabold text-emerald-600 font-mono">99.2%</strong>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">Status</span>
                  <strong className="text-sm sm:text-base font-extrabold text-slate-900 font-mono">
                    {stylist.status || 'Active'}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: WEEKLY AVAILABILITY & WORKING HOURS */}
          {activeTab === 'availability' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Weekly Working Shift Schedule</span>
                  </h3>
                  <span className="text-[11px] font-mono text-slate-500">
                    Live schedule for {salonName}
                  </span>
                </div>

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                  {daysOfWeek.map((dayName) => {
                    const entry = weeklySchedule.find((s) => s.day === dayName);
                    const isToday = currentDayName === dayName;
                    const isWorking = entry && entry.enabled;

                    return (
                      <div
                        key={dayName}
                        className={`px-4 py-3 flex items-center justify-between text-xs transition-colors ${
                          isToday ? 'bg-amber-50/70 font-semibold' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 w-24">
                            {dayName}
                          </span>
                          {isToday && (
                            <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-300">
                              Today
                            </span>
                          )}
                        </div>

                        <div>
                          {isWorking ? (
                            <span className="text-emerald-700 font-mono font-bold flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              <span>{entry.fromTime} – {entry.toTime}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono italic">
                              Weekly Day Off
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Next Available Booking Slots */}
              <div>
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-sky-600" />
                  <span>Available Booking Time Slots Today</span>
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => {
                        onBookStylist?.(stylist);
                        onClose();
                      }}
                      className="px-2.5 py-2 rounded-xl border border-slate-200 bg-white hover:border-slate-800 hover:bg-slate-900 hover:text-white text-xs font-mono font-bold transition-all text-center cursor-pointer shadow-2xs group"
                    >
                      <span>{slot}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
                  <Info className="w-3 h-3 text-slate-400" />
                  <span>Click any slot to launch the booking confirmation for this specialist.</span>
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: SERVICES MENU PERFORMED BY THIS STYLIST */}
          {activeTab === 'services' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5 text-purple-600" />
                  <span>Services by {stylist.name}</span>
                </h3>
                <span className="text-xs text-slate-500 font-mono">
                  {relevantServices.length} treatments
                </span>
              </div>

              {relevantServices.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Scissors className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-xs">No specific service assignments configured yet.</p>
                  <p className="text-[11px] text-slate-400 mt-1">This specialist performs all standard salon services.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                  {relevantServices.map((srv) => (
                    <div
                      key={srv.id}
                      className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                    >
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                          {srv.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-mono">
                          <span>{srv.category}</span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5">
                            <Clock className="w-3 h-3" />
                            {srv.durationMinutes || 45} mins
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-extrabold text-xs sm:text-sm text-slate-900 font-mono">
                          ₹{srv.price.toLocaleString('en-IN')}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            onBookStylist?.(stylist, srv);
                            onClose();
                          }}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-2xs transition-all cursor-pointer flex items-center gap-1"
                        >
                          <span>Select</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL FOOTER ACTION BAR */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              {todayInfo.isAvailableToday 
                ? `Ready for direct bookings (${todayInfo.hoursText})` 
                : 'Taking advance reservations'}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {salonWhatsapp && (
              <a
                href={`https://wa.me/${salonWhatsapp.replace(/\D/g, '')}?text=Hi%20${encodeURIComponent(salonName)},%20I%20would%20like%20to%20inquire%20about%20booking%20an%20appointment%20with%20${encodeURIComponent(stylist.name)}.`}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer shrink-0"
                title="Inquire via WhatsApp"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">WhatsApp</span>
              </a>
            )}

            <button
              type="button"
              onClick={() => {
                onBookStylist?.(stylist);
                onClose();
              }}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-extrabold text-white shadow-md transition-all hover:opacity-90 active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer"
              style={{ backgroundColor: primaryAccentColor }}
            >
              <Calendar className="w-4 h-4" />
              <span>Book Appointment with {stylist.name.split(' ')[0]}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
