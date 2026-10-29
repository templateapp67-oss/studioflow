import {photoGallery,type PhotoCategory} from '../lib/photoGallery';
import {updateInlineService} from '../lib/serviceCatalogue';
import {ServiceManagement} from './ServiceManagement';
import {TeamManagement} from './TeamManagement';
import {WebsiteContentManager} from './WebsiteContentManager';
import {ClinicTechnologyEditor} from './dermacure/ClinicTechnologyEditor';
import {VogueNoirEditor} from './vogue-noir/VogueNoirEditor';
import {BodhiTreeEditor} from './bodhi-tree/BodhiTreeEditor';
import {PrismChromaEditor} from './prism-chroma/PrismChromaEditor';
import {AcademyEnquiriesPanel} from './vogue-noir/AcademyEnquiriesPanel';
import {CustomerAppPromotion} from './CustomerAppPromotion';
import {CustomerSalonWebsite} from './CustomerSalonWebsite';
import { WebsiteSections } from './WebsiteSections';
import { websiteSections, socialUrl } from '../lib/websiteContent';
import type { LoyaltyConfig } from '../types';
import { websiteLink } from '../lib/supabase';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  Sparkles, 
  Copy, 
  Check, 
  X, 
  CalendarCheck, 
  MapPin, 
  Phone, 
  MessageSquare, 
  Mail, 
  Clock, 
  Star, 
  ShieldCheck,
  Facebook,
  Youtube,
  Instagram, 
  Award, 
  Navigation, 
  ExternalLink, 
  ChevronRight, 
  ChevronLeft,
  ZoomIn,
  ArrowRight, 
  Edit3, 
  Sliders, 
  Eye, 
  EyeOff, 
  Plus, 
  Trash2, 
  Wand2, 
  Smartphone, 
  Tablet, 
  Monitor, 
  Share2, 
  RefreshCw, 
  Scissors
} from 'lucide-react';
import { SalonProfile, SalonService, Stylist, Appointment, BusinessTypeId } from '../types';
import { CATEGORY_TEMPLATES } from '../categoryTemplates';
import { ACCENT_PALETTES, DEFAULT_CATEGORY_ACCENTS, AccentPaletteKey, applyPrimaryAccentCssVar, getContrastTextColor, getLuminance } from '../themeAccents';
import { CATEGORY_STANDARDIZED_DATA, Testimonial } from '../templateData';
import { applyTemplateDesign } from '../lib/templateSelection';
import { INITIAL_SALON_PROFILE } from '../mockData';
import { BookingModal } from './BookingModal';
import { InlineEditable } from './InlineEditable';
import { SidePanelCustomizer, SectionVisibilityState, DEFAULT_SECTION_VISIBILITY } from './SidePanelCustomizer';
import { PinkyNailsFaqEditor } from './PinkyNailsFaqEditor';
import { PINKY_NAILS_AI_PRESETS, pinkyNailsAiRewrite } from '../lib/pinkyNails';
import { InteractiveMapSetup } from './InteractiveMapSetup';
import { computeHeroAIStyling, extractImageMoodAsync, HeroAIStyling } from '../utils/heroImageMood';
import { TestimonialModal } from './ClientTestimonials';

export interface SalonWebsitePreviewProps {
  profile: SalonProfile;
  setProfile?: React.Dispatch<React.SetStateAction<SalonProfile>>;
  services: SalonService[];
  setServices?: React.Dispatch<React.SetStateAction<SalonService[]>>;
  stylists: Stylist[];
  setStylists?: React.Dispatch<React.SetStateAction<Stylist[]>>;
  onAddAppointment: (appointment: Appointment) => Promise<Appointment>;
  readOnly?: boolean;
  previewDocument?: Document;
  onEnterClientPreview?:()=>void;
  gallery?: string[];
  policies?:Record<string,string>;
  branding?:{platformName:string;poweredBy:boolean;supportEmail:string};
  loyaltyConfig?:LoyaltyConfig;
  onManageDashboard?:(section:string)=>void;
  onCustomerAccount?:(mode?:'signin'|'signup')=>void;
  customerSignedIn?:boolean;
  customerName?:string;
  customerPhotoUrl?:string;
  onSelectCategory?: (categoryId: BusinessTypeId) => void;
}

type DeviceMode = 'desktop' | 'tablet' | 'mobile';

export const SalonWebsitePreview: React.FC<SalonWebsitePreviewProps> = props => {
 const [editing,setEditing]=useState(false);
 if(props.readOnly)return <CustomerSalonWebsite {...props}/>;
 return <><div className="pt-28 px-4 pb-4 flex flex-wrap gap-3 bg-white text-slate-900"><button className="secondary-action" onClick={()=>setEditing(value=>!value)}>{editing?'Show redesigned website':'Open owner editing tools'}</button><button className="secondary-action" onClick={props.onEnterClientPreview}>Customer device preview</button></div>{editing?(props.profile.businessType==='skincare_clinic'?<ClinicPreviewEditor {...props}/>:props.profile.businessType==='makeup_studio'?<VogueNoirPreviewEditor {...props}/>:props.profile.businessType==='massage_wellness'?<BodhiTreePreviewEditor {...props}/>:props.profile.businessType==='hair_coloring'?<PrismChromaPreviewEditor {...props}/>:<SalonWebsiteEditor {...props}/>):<CustomerSalonWebsite {...props} readOnly/>}</>;
};

function VogueNoirPreviewEditor(props:SalonWebsitePreviewProps) {
 const accent=props.profile.customAccentColor||'#C9A96E';
 return <main className="max-w-6xl mx-auto p-4 space-y-6" aria-label="Vogue Noir owner editing tools">
  <p>Edit your Vogue Noir Makeup Studio &amp; Academy website, Bridal Packages, optional Academy module, services, artists, and enquiries. Changes save with your connected workspace.</p>
  {props.setProfile?<><VogueNoirEditor profile={props.profile} setProfile={props.setProfile} showBrandIdentityFields/><WebsiteContentManager profile={props.profile} setProfile={props.setProfile} services={props.services} gallery={props.gallery} showGallery={false}/></>:<p role="status">Content editing requires a connected owner workspace.</p>}
  {props.setServices?<ServiceManagement services={props.services} setServices={props.setServices} profile={props.profile} primaryAccentColor={accent}/>:<p role="status">Service editing requires a connected owner workspace.</p>}
  {props.setStylists?<TeamManagement stylists={props.stylists} setStylists={props.setStylists} services={props.services} setServices={props.setServices} businessType="makeup_studio" primaryAccentColor={accent}/>:null}
  <AcademyEnquiriesPanel/>
 </main>;
}

function PrismChromaPreviewEditor(props:SalonWebsitePreviewProps) {
 const accent=props.profile.customAccentColor||'#7C5CFF';
 return <main className="max-w-6xl mx-auto p-4 space-y-6" aria-label="Prism and Chroma owner editing tools">
  <p>Edit your Prism &amp; Chroma Hair Color Atelier website — hero, Shade Studio, branches, services, colour experts and reviews. Changes save with your connected workspace.</p>
  {props.setProfile?<><PrismChromaEditor profile={props.profile} setProfile={props.setProfile} showBrandIdentityFields/><WebsiteContentManager profile={props.profile} setProfile={props.setProfile} services={props.services} gallery={props.gallery} showGallery={false}/></>:<p role="status">Content editing requires a connected owner workspace.</p>}
  {props.setServices?<ServiceManagement services={props.services} setServices={props.setServices} profile={props.profile} primaryAccentColor={accent}/>:<p role="status">Service editing requires a connected owner workspace.</p>}
  {props.setStylists?<TeamManagement stylists={props.stylists} setStylists={props.setStylists} services={props.services} setServices={props.setServices} businessType="hair_coloring" primaryAccentColor={accent}/>:null}
 </main>;
}

function BodhiTreePreviewEditor(props:SalonWebsitePreviewProps) {
 const accent=props.profile.customAccentColor||'#4E6E58';
 return <main className="max-w-6xl mx-auto p-4 space-y-6" aria-label="Bodhi Tree owner editing tools">
  <p>Edit your Bodhi Tree Massage &amp; Wellness Sanctuary website — hero, Jaipur Palace Collection, branches, services, therapists and reviews. Changes save with your connected workspace.</p>
  {props.setProfile?<><BodhiTreeEditor profile={props.profile} setProfile={props.setProfile} showBrandIdentityFields/><WebsiteContentManager profile={props.profile} setProfile={props.setProfile} services={props.services} gallery={props.gallery} showGallery={false}/></>:<p role="status">Content editing requires a connected owner workspace.</p>}
  {props.setServices?<ServiceManagement services={props.services} setServices={props.setServices} profile={props.profile} primaryAccentColor={accent}/>:<p role="status">Service editing requires a connected owner workspace.</p>}
  {props.setStylists?<TeamManagement stylists={props.stylists} setStylists={props.setStylists} services={props.services} setServices={props.setServices} businessType="massage_wellness" primaryAccentColor={accent}/>:null}
 </main>;
}

/** Template 07 uses the existing workspace editors, not the legacy mock-data canvas. */
function ClinicPreviewEditor(props:SalonWebsitePreviewProps) {
 const accent=props.profile.customAccentColor||'#000000';
 return <main className="max-w-6xl mx-auto p-4 space-y-6" aria-label="Clinic owner editing tools">
  <p>These are the existing workspace editors. Changes use your connected workspace save; verify service details and fees before publication.</p>
  {props.setProfile?<><WebsiteContentManager profile={props.profile} setProfile={props.setProfile} services={props.services} gallery={props.gallery} showGallery={false}/><section className="workspace-card"><ClinicTechnologyEditor profile={props.profile} setProfile={props.setProfile}/></section></>:<p role="status">Content editing requires a connected owner workspace.</p>}
  {props.setServices?<ServiceManagement services={props.services} setServices={props.setServices} profile={props.profile} primaryAccentColor={accent}/>:<p role="status">Service editing requires a connected owner workspace.</p>}
  {props.setStylists?<TeamManagement stylists={props.stylists} setStylists={props.setStylists} services={props.services} setServices={props.setServices} businessType="skincare_clinic" primaryAccentColor={accent}/>:null}
 </main>;
}

const SalonWebsiteEditor: React.FC<SalonWebsitePreviewProps> = ({
  profile,
  setProfile: setProfileProp,
  services,
  setServices: setServicesProp,
  stylists,
  setStylists: setStylistsProp,
  onAddAppointment,
  readOnly = false,
  previewDocument,onEnterClientPreview,
  gallery,
  policies,branding,loyaltyConfig,onManageDashboard,onCustomerAccount,customerSignedIn,
  onSelectCategory,
}) => {
  // Fallback internal state if setters not passed
  const [internalProfile, setInternalProfile] = useState<SalonProfile>(profile);
  const [internalServices, setInternalServices] = useState<SalonService[]>(services);
  const [internalStylists, setInternalStylists] = useState<Stylist[]>(stylists);

  const activeProfile = ((readOnly || setProfileProp) ? profile : internalProfile) || INITIAL_SALON_PROFILE;
  const setProfile = setProfileProp || setInternalProfile;

  const activeServices = (readOnly || setServicesProp) ? services : internalServices;
  const setServices = setServicesProp || setInternalServices;

  const activeStylists = (readOnly || setStylistsProp) ? stylists : internalStylists;
  const setStylists = setStylistsProp || setInternalStylists;

  // Viewport & Editor Controls
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState<boolean>(false);
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<BusinessTypeId>(activeProfile.businessType || 'hair_salon');

  // Synchronize category selection if parent changes businessType
  useEffect(() => {
    if (activeProfile.businessType && activeProfile.businessType !== selectedCategoryKey) {
      setSelectedCategoryKey(activeProfile.businessType);
    }
  }, [activeProfile.businessType]);

  const sectionVisibility=websiteSections(activeProfile);
  const setSectionVisibility:React.Dispatch<React.SetStateAction<SectionVisibilityState>>=next=>setProfile(prev=>({...prev,websiteSections:typeof next==='function'?next(websiteSections(prev)):next}));

  // Active template configuration
  const activeTemplate = CATEGORY_TEMPLATES[selectedCategoryKey] || CATEGORY_TEMPLATES.hair_salon;

  // Active Accent Palette selection
  const [selectedAccentKey, setSelectedAccentKey] = useState<AccentPaletteKey>(
    (activeProfile.themeAccentKey as AccentPaletteKey) || DEFAULT_CATEGORY_ACCENTS[selectedCategoryKey] || 'slate'
  );
  const [isDarkCanvas, setIsDarkCanvas] = useState<boolean>(
    activeProfile.darkCanvas ?? (activeTemplate.themeStyle.isDark || selectedAccentKey === 'obsidian')
  );

  // Synchronize accent changes when profile.themeAccentKey changes externally
  useEffect(() => {
    if (
      activeProfile.themeAccentKey &&
      ACCENT_PALETTES[activeProfile.themeAccentKey as AccentPaletteKey] &&
      activeProfile.themeAccentKey !== selectedAccentKey
    ) {
      setSelectedAccentKey(activeProfile.themeAccentKey as AccentPaletteKey);
    }
  }, [activeProfile.themeAccentKey, selectedAccentKey]);

  useEffect(()=>{setIsDarkCanvas(activeProfile.darkCanvas ?? (activeTemplate.themeStyle.isDark || selectedAccentKey==='obsidian'));},[activeProfile.darkCanvas,activeTemplate.themeStyle.isDark,selectedAccentKey]);

  const activeAccent = {...(ACCENT_PALETTES[selectedAccentKey] || ACCENT_PALETTES.slate), ...(activeProfile.customAccentColor ? {primaryHex:activeProfile.customAccentColor} : {})};
  const primaryAccentColor = activeProfile.customAccentColor || activeAccent.primaryHex;

  // Update primary accent CSS variable across the document
  useEffect(() => {
    applyPrimaryAccentCssVar(primaryAccentColor, activeAccent.secondaryHex, previewDocument);
  }, [primaryAccentColor, activeAccent.secondaryHex, previewDocument]);

  // Dynamic Image-Based AI Styling State
  const [heroAIStyling, setHeroAIStyling] = useState<HeroAIStyling>(() =>
    computeHeroAIStyling(activeProfile.coverImageUrl, primaryAccentColor)
  );

  useEffect(() => {
    let isMounted = true;

    extractImageMoodAsync(activeProfile.coverImageUrl, primaryAccentColor).then((extracted) => {
      if (isMounted) {
        setHeroAIStyling(extracted);
      }
    });

    return () => { isMounted = false; };
  }, [activeProfile.coverImageUrl, primaryAccentColor]);

  const baseStandardData = CATEGORY_STANDARDIZED_DATA[selectedCategoryKey] || CATEGORY_STANDARDIZED_DATA.hair_salon;
  const categoryPhotos=photoGallery(activeProfile,gallery||[]);
  const standardData={...baseStandardData,gallery:categoryPhotos.map(photo=>({...photo,tag:photo.category}))};
  const [galleryCategory,setGalleryCategory]=useState<PhotoCategory|'All'>('All');
 useEffect(()=>{setGalleryCategory('All');},[activeProfile.businessType]);

  // Interactive filters & booking modals
  const [activeSubCategory, setActiveSubCategory] = useState<string>('All');
  const [isBookingOpen, setIsBookingOpen] = useState<boolean>(false);
  const [selectedService, setSelectedService] = useState<SalonService>(activeServices[0] || activeTemplate.services[0]);
  const [selectedStylist, setSelectedStylist] = useState<Stylist>(activeStylists[0] || activeTemplate.stylists[0]);
  const [selectedGalleryPhoto, setSelectedGalleryPhoto] = useState<string | null>(null);

  // Dynamic client testimonials state
  const activeReviews=activeProfile.websiteTestimonials??[];
  const setActiveReviews:React.Dispatch<React.SetStateAction<Testimonial[]>>=next=>setProfile(prev=>({...prev,websiteTestimonials:typeof next==='function'?next(prev.websiteTestimonials??[]):next}));
  const [testimonialIndex, setTestimonialIndex] = useState(0);

  useEffect(() => {
    if (activeReviews.length <= 1) return;
    const interval = setInterval(() => {
      setTestimonialIndex((prev) => (prev + 1) % activeReviews.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeReviews.length]);

  const [isTestimonialModalOpen, setIsTestimonialModalOpen] = useState<boolean>(false);
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);

  // Editable section custom headings
  const defaultHeadings={servicesTitle:'Curated Services & Treatments',servicesSubtitle:'Explore our services with transparent pricing in INR (₹).',stylistsTitle:'Meet Our Specialists & Stylists',stylistsSubtitle:'Meet the team caring for your salon experience.',testimonialsTitle:'Client Experiences',galleryTitle:'Studio Lookbook & Client Transformations',locationTitle:'Visit Our Salon'};
  const sectionHeadings={...defaultHeadings,...Object.fromEntries(Object.entries(activeProfile.sectionHeadings||{}).filter(([,v])=>v))};
  const setSectionHeadings:React.Dispatch<React.SetStateAction<typeof sectionHeadings>>=next=>setProfile(prev=>({...prev,sectionHeadings:typeof next==='function'?next({...defaultHeadings,...prev.sectionHeadings}):next}));

  // Top AI Prompt state
  const [topAiPrompt, setTopAiPrompt] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  // Toast message
  const [toastMessage, setToastMessage] = useState<{
    id: string;
    title: string;
    clientName: string;
    serviceName: string;
    stylistName: string;
    dateTime: string;
    refCode: string;
    price: number;
  } | null>(null);
  const [notificationToast, setNotificationToast] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState<boolean>(false);

  const showNotification = (msg: string) => {
    setNotificationToast(msg);
    setTimeout(() => setNotificationToast(null), 3500);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 5500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Lightbox keyboard navigation (Left/Right arrow keys and Escape key)
  useEffect(() => {
    if (!selectedGalleryPhoto) return;
    const galleryPhotos = standardData.gallery || [];
    const currentIndex = galleryPhotos.findIndex(photo => photo.url === selectedGalleryPhoto);
    if (currentIndex === -1) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedGalleryPhoto(null);
      } else if (e.key === 'ArrowLeft') {
        const prevIndex = (currentIndex - 1 + galleryPhotos.length) % galleryPhotos.length;
        setSelectedGalleryPhoto(galleryPhotos[prevIndex].url);
      } else if (e.key === 'ArrowRight') {
        const nextIndex = (currentIndex + 1) % galleryPhotos.length;
        setSelectedGalleryPhoto(galleryPhotos[nextIndex].url);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedGalleryPhoto, standardData.gallery]);

  const handleCopyRefCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const subCategoriesList = ['All', ...(activeTemplate.subCategories || ['Hair', 'Spa', 'Care'])];

  const filteredServices = activeSubCategory === 'All'
    ? activeServices
    : activeServices.filter((s) => s.category === activeSubCategory);

  // Category template switcher
  const handleCategorySwitch = (catId: BusinessTypeId) => {
    setSelectedCategoryKey(catId);
    const tmpl = CATEGORY_TEMPLATES[catId];
    if (tmpl) {
      setIsEditMode(false);
      setActiveSubCategory('All');
      setSelectedService(activeServices[0]);
      setSelectedStylist(activeStylists[0]);
      
      const newAccent = DEFAULT_CATEGORY_ACCENTS[catId] || 'slate';
      setSelectedAccentKey(newAccent);
      setIsDarkCanvas(tmpl.themeStyle.isDark || newAccent === 'obsidian');

      if (!onSelectCategory) setProfile(prev=>applyTemplateDesign(prev,tmpl));

      if (onSelectCategory) {
        onSelectCategory(catId);
      }

      showNotification(`Switched to "${tmpl.title}" template with Indian INR (₹) rates!`);
    }
  };

  const handleOpenBooking = (srv?: SalonService) => {
    if (srv) {
      setSelectedService(srv);
    } else {
      setSelectedService(activeServices[0] || activeTemplate.services[0]);
    }
    setSelectedStylist(activeStylists[0] || activeTemplate.stylists[0]);
    setIsBookingOpen(true);
  };

  // Inline Service Actions
  const handleUpdateServicePrice = (serviceId: string, newPrice: number) => {
    if (!Number.isFinite(newPrice) || newPrice < 0) return;
    setServices(prev=>prev.map(s=>s.id===serviceId?updateInlineService(s,'price',newPrice,activeProfile.businessType==='skincare_clinic'):s));
    showNotification(activeProfile.businessType==='skincare_clinic'?'Price changed. Review its verification and wait for the workspace save.':`Updated service price to ₹${newPrice}`);
  };

  const handleUpdateServiceName = (serviceId: string, newName: string) => {
    setServices(prev=>prev.map(s=>s.id===serviceId?updateInlineService(s,'name',String(newName),activeProfile.businessType==='skincare_clinic'):s));
  };

  const handleUpdateServiceDesc = (serviceId: string, newDesc: string) => {
    setServices(prev=>prev.map(s=>s.id===serviceId?updateInlineService(s,'description',String(newDesc),activeProfile.businessType==='skincare_clinic'):s));
  };

  const handleUpdateServiceDuration = (serviceId: string, newDuration: number) => {
    setServices(prev=>prev.map(s=>s.id===serviceId?updateInlineService(s,'durationMinutes',Number(newDuration),activeProfile.businessType==='skincare_clinic'):s));
  };

  const handleToggleServiceShowDuration = (serviceId: string) => {
    setServices((prev) =>
      prev.map((s) => {
        if (s.id !== serviceId) return s;
        const newShow = s.showDuration === false;
        showNotification(
          newShow
            ? `Duration will be displayed on public menu for "${s.name}".`
            : `Duration hidden on public menu for "${s.name}".`
        );
        return { ...s, origin:'custom', showDuration: newShow };
      })
    );
  };

  const handleAddNewService = () => {
    const newSrv: SalonService = {
      id: `srv-${crypto.randomUUID()}`,
      origin:'custom',
      name: 'New Signature Treatment',
      category: activeSubCategory === 'All' ? (activeTemplate.subCategories[0] || 'General') : activeSubCategory,
      durationMinutes: 45,
      price: 950,
      description: 'Personalized salon care with organic essential extracts and precision styling.',
      icon: 'spa',
      popular: true
    };
    setServices((prev) => [newSrv, ...prev]);
    showNotification(`Added new service "${newSrv.name}" (₹${newSrv.price})!`);
  };

  const handleDeleteService = (serviceId: string) => {
    setServices((prev) => prev.filter((s) => s.id !== serviceId));
    showNotification('Service removed from menu.');
  };

  // Inline Stylist Actions
  const handleUpdateStylistName = (stylistId: string, newName: string) => {
    setStylists((prev) =>
      prev.map((st) => (st.id === stylistId ? { ...st, name: String(newName) } : st))
    );
  };

  const handleUpdateStylistRole = (stylistId: string, newRole: string) => {
    setStylists((prev) =>
      prev.map((st) => (st.id === stylistId ? { ...st, role: String(newRole) } : st))
    );
  };

  const handleUpdateStylistRating = (stylistId: string, newRating: number) => {
    setStylists((prev) =>
      prev.map((st) => (st.id === stylistId ? { ...st, rating: Number(newRating) } : st))
    );
  };

  const handleAddNewStylist = () => {
    const newSt: Stylist = {
      id: `st-${Date.now()}`,
      name: 'Specialist Artisan',
      role: 'Senior Hair & Beauty Expert',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
      rating: 4.9,
      specialties: ['Precision Styling', 'Color Artistry', 'Scalp Detox']
    };
    setStylists((prev) => [...prev, newSt]);
    showNotification(`Specialist "${newSt.name}" added to roster!`);
  };

  const handleDeleteStylist = (stylistId: string) => {
    setStylists((prev) => prev.filter((st) => st.id !== stylistId));
    showNotification('Specialist removed from roster.');
  };

  // Dynamic Testimonials Management Actions
  const handleAddNewTestimonial = () => {
    setEditingTestimonial(null);
    setIsTestimonialModalOpen(true);
  };

  const handleEditTestimonial = (testimonial: Testimonial) => {
    setEditingTestimonial(testimonial);
    setIsTestimonialModalOpen(true);
  };

  const handleDeleteTestimonial = (id: string) => {
    setActiveReviews((prev) => prev.filter((r) => r.id !== id));
    showNotification('Review removed from featured testimonials list.');
  };

  const handleSaveTestimonial = (saved: Testimonial) => {
    setActiveReviews((prev) => {
      const exists = prev.some((r) => r.id === saved.id);
      if (exists) {
        return prev.map((r) => r.id === saved.id ? saved : r);
      } else {
        return [saved, ...prev];
      }
    });
    showNotification(editingTestimonial ? 'Featured testimonial updated successfully!' : 'New testimonial added to website!');
  };

  // AI Studio Prompts Engine
  const handleAIGeneratePrompt = (presetType: string, customPrompt?: string) => {
    setIsAiLoading(true);
    const nailStudio = activeProfile.businessType === 'nail_studio' || selectedCategoryKey === 'nail_studio';
    setTimeout(() => {
      if (nailStudio) {
        const rewrite = pinkyNailsAiRewrite(
          presetType === 'luxury' || presetType === 'bridal' || presetType === 'ayurvedic' || presetType === 'genz'
            ? presetType
            : 'custom',
          { businessName: activeProfile.businessName, city: activeProfile.city, customPrompt },
        );
        setProfile((prev) => ({
          ...prev,
          tagline: rewrite.tagline,
          about: rewrite.about,
          sectionHeadings: { ...prev.sectionHeadings, ...rewrite.sectionHeadings },
        }));
      } else if (presetType === 'luxury') {
        setProfile((prev) => ({
          ...prev,
          tagline: `Bespoke Botanical Luxury & Haute Artistry in ${prev.city}`,
          about: `Step into ${prev.businessName}, an exclusive sanctuary where world-class precision meets restorative organic wellness. From runway-ready styling to deep ayurvedic scalp therapies, every moment is crafted to elevate your radiance.`
        }));
        setSectionHeadings((prev) => ({
          ...prev,
          servicesTitle: 'Haute Beauty & Wellness Experiences',
          servicesSubtitle: 'Uncompromising luxury treatments with transparent INR (₹) rates.'
        }));
      } else if (presetType === 'bridal') {
        setProfile((prev) => ({
          ...prev,
          tagline: `Royal Indian Bridal Makeovers & Festive Luxury Packages`,
          about: `Celebrate your milestone moments with ${prev.businessName}. Our award-winning bridal artisans specialize in HD makeup, intricate bridal hairstyles, pre-wedding skin detox, and luxury festive rejuvenation.`
        }));
        setSectionHeadings((prev) => ({
          ...prev,
          servicesTitle: 'Bridal & Festive Ceremony Menus',
          servicesSubtitle: 'Complete bespoke pre-bridal and wedding day packages in INR (₹).'
        }));
      } else if (presetType === 'ayurvedic') {
        setProfile((prev) => ({
          ...prev,
          tagline: `Authentic Ayurvedic Healing & Pure Herbal Rejuvenation`,
          about: `Rooted in ancient Vedic traditions, ${prev.businessName} brings you pure herbal infusions, therapeutic scalp detoxes, and dosha-balancing treatments administered by certified master vaidyas.`
        }));
        setSectionHeadings((prev) => ({
          ...prev,
          servicesTitle: 'Traditional Ayurvedic Rituals',
          servicesSubtitle: 'Pure herbal therapies and holistic body polishes in INR (₹).'
        }));
      } else if (presetType === 'genz') {
        setProfile((prev) => ({
          ...prev,
          tagline: `Next-Gen Hair Artistry, Bold Colors & Trendsetting Cuts`,
          about: `Welcome to ${prev.businessName}—the ultimate style destination for trendsetters. We turn hair into art with precision fades, vivid balayage, express blowouts, and aesthetic nail glam.`
        }));
      } else if (customPrompt) {
        setProfile((prev) => ({
          ...prev,
          tagline: `Elevated Salon Care Tailored for ${prev.city}`,
          about: `At ${prev.businessName}, we combine innovative techniques with personalized care inspired by "${customPrompt}". Discover customized beauty services crafted to celebrate your unique individuality.`
        }));
      }
      setIsAiLoading(false);
      showNotification('AI regenerated copy and headline variations applied to canvas!');
    }, 600);
  };

  // AI preset chips — Template 05 uses nail wording for the same preset ids
  const aiPresetChips = activeProfile.businessType === 'nail_studio' || selectedCategoryKey === 'nail_studio'
    ? PINKY_NAILS_AI_PRESETS.map(preset => ({ id: preset.id, label: preset.label, hint: preset.hint }))
    : [
        { id: 'luxury', label: '✨ Luxury & Organic', hint: 'High-ticket premium salon wording' },
        { id: 'bridal', label: '👰 Bridal & Festive', hint: 'Diwali, wedding and makeover headlines' },
        { id: 'ayurvedic', label: '🌿 Ayurvedic Glow', hint: 'Herbal, wellness and scalp healing copy' },
        { id: 'genz', label: '⚡ Gen-Z Trendsetter', hint: 'Punchy, bold styling and color studio' },
      ];
  const aiPresetChipClass: Record<string, string> = {
    luxury: 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200',
    bridal: 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200',
    ayurvedic: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200',
    genz: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border-indigo-200',
  };

  // Device width class
  const deviceWidthClass = {
    desktop: 'w-full max-w-[1240px]',
    tablet: 'w-full max-w-[768px]',
    mobile: 'w-full max-w-[390px]'
  }[deviceMode];

  const themeStyle = activeTemplate.themeStyle;
  const contrastTextColor = getContrastTextColor(primaryAccentColor);
  const accentLuminance = getLuminance(primaryAccentColor);

  return (
    <div 
      className={`min-h-screen ${previewDocument ? 'py-2' : 'pt-20 pb-24'} flex flex-col items-center bg-slate-100 text-slate-900 font-sans relative select-text`}
      style={{
        '--primary-accent': primaryAccentColor,
        '--theme-primary': primaryAccentColor,
        '--theme-secondary': activeAccent.secondaryHex,
        '--color-primary': primaryAccentColor,
        '--accent-luminance': accentLuminance.toFixed(4),
        '--accent-text-color': contrastTextColor,
        '--accent-contrast-text': contrastTextColor,
        '--color-on-primary': contrastTextColor,
        '--theme-on-accent': contrastTextColor,
        '--heading-text-shadow': '0 1px 3px rgba(0, 0, 0, 0.45)',
      } as React.CSSProperties}
    >
      
      {/* Toast Notifications */}
      <AnimatePresence>
        {notificationToast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-24 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs border border-slate-700 font-medium"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{notificationToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* 1. TOP UNIFIED NAVIGATION & AI STUDIO CONTROLS BAR */}
      {/* ============================================================ */}
      {!readOnly && <div className="w-full bg-white border-b border-slate-200 sticky top-20 z-40 shadow-xs">
        <div className="max-w-[1440px] mx-auto px-4 py-2.5 flex flex-col gap-2.5">
          
          {/* Main Controls Row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            
            {/* Left Status & Subdomain */}
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-700">
                <span className="font-bold">{activeProfile.subdomain ? websiteLink(activeProfile.subdomain) : 'Website draft'}</span>
                <span className="text-slate-400">•</span>
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[11px] font-bold border border-emerald-200">
                  INR (₹) Live
                </span>
              </div>
            </div>

            {/* Mode Switcher: Inline Edit Mode vs Preview Mode */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              {selectedCategoryKey === 'nail_studio' ? (
                <span className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>Template 05 edits apply live from Customize & AI Studio</span>
                </span>
              ) : (
              <button
                type="button"
                onClick={() => setIsEditMode(!isEditMode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isEditMode
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Click any text, price or heading to edit inline"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Inline Edit Mode</span>
                {isEditMode && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
              </button>
              )}

              <button
                type="button"
                onClick={() => {setIsEditMode(false);setIsCustomizerOpen(false);onEnterClientPreview?.();}}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  !isEditMode
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Interactive preview with working links & booking"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Client Preview</span>
              </button>
            </div>

            {/* Viewport Device Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setDeviceMode('desktop')}
                className={`p-1.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                  deviceMode === 'desktop' ? 'bg-white shadow-xs text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Desktop View (1240px)"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => setDeviceMode('tablet')}
                className={`p-1.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                  deviceMode === 'tablet' ? 'bg-white shadow-xs text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Tablet View (768px)"
              >
                <Tablet className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tablet</span>
              </button>
              <button
                type="button"
                onClick={() => setDeviceMode('mobile')}
                className={`p-1.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                  deviceMode === 'mobile' ? 'bg-white shadow-xs text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Mobile View (390px)"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mobile</span>
              </button>
            </div>

            {/* Right Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Customizer Side-Panel Toggle Button */}
              <button
                type="button"
                onClick={() => setIsCustomizerOpen(!isCustomizerOpen)}
                className={`text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 border shadow-xs transition-all cursor-pointer ${
                  isCustomizerOpen
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                }`}
                id="toggle-customizer-top-btn"
              >
                <Sliders className="w-4 h-4 text-amber-500" />
                <span>Side Customizer</span>
              </button>

              {/* Fast Test Booking Modal Button */}
              <button
                type="button"
                onClick={() => handleOpenBooking()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                id="test-booking-flow-btn"
              >
                <CalendarCheck className="w-4 h-4" />
                <span>Test Booking (₹)</span>
              </button>
            </div>

          </div>

          {/* AI Studio & Quick Prompts Bar */}
          <div className="pt-2 border-t border-slate-100 flex flex-col md:flex-row items-stretch md:items-center gap-2 justify-between">
            {/* AI Prompt Input */}
            <div className="flex-1 flex items-center gap-2 bg-gradient-to-r from-purple-50/70 to-pink-50/70 border border-purple-200/80 rounded-xl px-3 py-1.5">
              <Sparkles className="w-4 h-4 text-purple-600 shrink-0 animate-spin" style={{ animationDuration: '6s' }} />
              <input
                type="text"
                value={topAiPrompt}
                onChange={(e) => setTopAiPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && topAiPrompt.trim()) {
                    handleAIGeneratePrompt('custom', topAiPrompt);
                    setTopAiPrompt('');
                  }
                }}
                placeholder="Ask AI: e.g., 'Rewrite luxury copy for Indiranagar bridal studio' or 'Add festive discount packages'..."
                className="flex-1 bg-transparent text-xs text-slate-900 placeholder:text-slate-400 outline-none font-sans"
              />
              <button
                type="button"
                disabled={isAiLoading || !topAiPrompt.trim()}
                onClick={() => {
                  handleAIGeneratePrompt('custom', topAiPrompt);
                  setTopAiPrompt('');
                }}
                className="px-3 py-1 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Wand2 className="w-3 h-3" />
                <span>Generate</span>
              </button>
            </div>

            {/* Quick 1-Click AI Tone Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-thin text-xs shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
                AI Presets:
              </span>
              {aiPresetChips.map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  title={preset.hint}
                  onClick={() => handleAIGeneratePrompt(preset.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer border ${aiPresetChipClass[preset.id] || aiPresetChipClass.luxury}`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* 14 Category Template Switcher Ribbon */}
          <div className="pt-2 border-t border-slate-100 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">category</span>
              14 Category Templates:
            </span>
            {Object.values(CATEGORY_TEMPLATES).map((tmpl) => {
              const isSelected = tmpl.id === selectedCategoryKey;
              return (
                <button
                  key={tmpl.id}
                  onClick={() => handleCategorySwitch(tmpl.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer shrink-0 border ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs scale-105'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                  title={`${tmpl.title} - ${tmpl.paletteLabel}`}
                >
                  <span className="material-symbols-outlined text-sm">{tmpl.icon}</span>
                  <span>{tmpl.shortName}</span>
                </button>
              );
            })}
          </div>

        </div>
      </div>

      }

      {/* Side-Panel Customizer Drawer */}
      {!readOnly && <SidePanelCustomizer
        isOpen={isCustomizerOpen}
        onToggle={() => setIsCustomizerOpen(!isCustomizerOpen)}
        profile={activeProfile}
        setProfile={setProfile}
        selectedCategoryKey={selectedCategoryKey}
        selectedAccentKey={selectedAccentKey}
        setSelectedAccentKey={setSelectedAccentKey}
        primaryAccentColor={primaryAccentColor}
        isDarkCanvas={isDarkCanvas}
        setIsDarkCanvas={dark => {setIsDarkCanvas(dark);setProfile(prev=>({...prev,darkCanvas:dark}));}}
        sectionVisibility={sectionVisibility}
        setSectionVisibility={setSectionVisibility}
        onAIGeneratePrompt={handleAIGeneratePrompt}
        onResetDefaults={() => handleCategorySwitch(selectedCategoryKey)}
        services={activeServices}
        setServices={setServices}
        onSelectCategory={handleCategorySwitch}
      />}

      {/* Template 05: FAQ editor sits above the canvas because the nail canvas
          is the real customer website, not the legacy inline-edit canvas. */}
      {!readOnly && selectedCategoryKey === 'nail_studio' && (
        <div className="w-full max-w-[1240px] px-4">
          <PinkyNailsFaqEditor profile={activeProfile} setProfile={setProfile} readOnly={readOnly} />
        </div>
      )}

      {/* Edit Mode Notice Banner */}
      {isEditMode && selectedCategoryKey !== 'nail_studio' && (
        <div className="w-full max-w-[1240px] px-4 mt-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between gap-3 text-xs text-amber-900 shadow-xs">
            <div className="flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Inline Live Editing Active:</strong> Click directly on any text, INR (₹) price, specialist name, or section heading on the canvas below to edit in real time.
              </span>
            </div>
            <button
              onClick={() => {setIsEditMode(false);setIsCustomizerOpen(false);onEnterClientPreview?.();}}
              className="text-amber-800 hover:text-amber-950 font-bold underline shrink-0 cursor-pointer"
            >
              Switch to Client Preview
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. UNIFIED SALON WEBSITE PREVIEW CANVAS */}
      {/* ============================================================ */}
      <div 
        className={`mt-4 transition-all duration-300 ${deviceWidthClass} shadow-2xl rounded-2xl overflow-y-auto border border-slate-200 my-4 ${
          isDarkCanvas ? 'bg-[#0f0f13] text-neutral-100' : 'bg-white text-slate-900'
        }`}
        id="salon-website-canvas"
      >
        
        {/* Template Header Notice */}
        {!readOnly&&<div className={`py-2 px-6 text-xs flex flex-wrap items-center justify-between gap-2 ${
          isDarkCanvas ? 'bg-[#181820] border-b border-neutral-800 text-neutral-300' : 'bg-slate-50 border-b border-slate-200 text-slate-700'
        }`}>
          <div className="flex items-center gap-2 font-medium">
            <span className="material-symbols-outlined text-base">{activeTemplate.icon}</span>
            <span><strong>Template:</strong> {activeTemplate.title}</span>
            <span className="text-slate-400">•</span>
            <span className="font-mono text-[11px] font-bold" style={{ color: activeAccent.primaryHex }}>
              Accent: {activeAccent.name}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <MapPin className="w-3 h-3 text-slate-400" />
            <InlineEditable
              value={activeProfile.city}
              onSave={(val) => setProfile((p) => ({ ...p, city: String(val) }))}
              isEditingActive={isEditMode}
              label="Salon City"
            />
          </div>
        </div>}

        {/* ============================================================ */}
        {/* SECTION: SALON SITE NAV HEADER & STICKY BOOKING TRIGGER */}
        {/* ============================================================ */}
        {selectedCategoryKey === 'nail_studio' ? (
          <CustomerSalonWebsite
            profile={{ ...activeProfile, businessType: 'nail_studio' }}
            services={activeServices}
            stylists={activeStylists}
            gallery={gallery}
            policies={policies}
            branding={branding}
            loyaltyConfig={loyaltyConfig}
            onManageDashboard={onManageDashboard}
            onCustomerAccount={onCustomerAccount}
            customerSignedIn={customerSignedIn}
            onAddAppointment={onAddAppointment}
            readOnly
          />
        ) : selectedCategoryKey === 'beauty_parlour' && !isEditMode ? (
          <CustomerSalonWebsite
            profile={{ ...activeProfile, businessType: 'beauty_parlour' }}
            services={activeServices}
            stylists={activeStylists}
            gallery={gallery}
            policies={policies}
            branding={branding}
            loyaltyConfig={loyaltyConfig}
            onManageDashboard={onManageDashboard}
            onCustomerAccount={onCustomerAccount}
            customerSignedIn={customerSignedIn}
            onAddAppointment={onAddAppointment}
            readOnly
          />
        ) : (
        <>
        {sectionVisibility.header && (
          <header className={`px-6 md:px-10 py-4 flex flex-wrap gap-4 justify-between items-center border-b transition-colors ${
            isDarkCanvas ? 'bg-[#121216]/95 backdrop-blur-md border-neutral-800 text-white' : 'bg-white/95 backdrop-blur-md border-slate-100 text-slate-900'
          }`}>
            <div className="flex items-center gap-3">
              {activeProfile.logoUrl ? (
                <div className="relative group shrink-0">
                  <img 
                    src={activeProfile.logoUrl} 
                    alt={activeProfile.businessName} 
                    className="h-11 max-w-[170px] object-contain rounded-xl shadow-xs transition-transform group-hover:scale-105" 
                  />
                </div>
              ) : (
                <div 
                  className="w-11 h-11 rounded-xl flex items-center justify-center font-bold shadow-xs text-white shrink-0"
                  style={{ backgroundColor: activeAccent.primaryHex }}
                >
                  <span className="material-symbols-outlined text-2xl">{activeTemplate.icon}</span>
                </div>
              )}
              <div>
                <div className={`font-bold text-lg md:text-xl tracking-tight leading-snug ${isDarkCanvas ? 'text-white' : 'text-slate-900'}`}>
                  <InlineEditable
                    value={activeProfile.businessName}
                    onSave={(val) => setProfile((p) => ({ ...p, businessName: String(val) }))}
                    isEditingActive={isEditMode}
                    label="Salon Name"
                  />
                </div>
                <div className={`text-[11px] flex items-center gap-1 font-mono ${isDarkCanvas ? 'text-neutral-400' : 'text-slate-500'}`}>
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate max-w-[280px] sm:max-w-md">
                    <InlineEditable
                      value={activeProfile.address}
                      onSave={(val) => setProfile((p) => ({ ...p, address: String(val) }))}
                      isEditingActive={isEditMode}
                      label="Street Address"
                    />
                    {', '}
                    <InlineEditable
                      value={activeProfile.city}
                      onSave={(val) => setProfile((p) => ({ ...p, city: String(val) }))}
                      isEditingActive={isEditMode}
                      label="City"
                    />
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {readOnly&&<nav aria-label="Customer account" className="flex flex-wrap items-center gap-2 text-xs"><button className="border rounded-xl px-3 py-2 font-semibold" onClick={()=>onCustomerAccount?onCustomerAccount('signin'):location.assign(`/?customer=1&return=${encodeURIComponent(activeProfile.subdomain||'')}`)}>Customer Login</button><button className="border rounded-xl px-3 py-2 font-semibold" onClick={()=>onCustomerAccount?onCustomerAccount('signup'):location.assign(`/?customer=1&auth=signup&return=${encodeURIComponent(activeProfile.subdomain||'')}`)}>Sign up</button>{customerSignedIn&&<a className="underline" href={`/?customer=1&return=${encodeURIComponent(activeProfile.subdomain||'')}`}>My bookings</a>}</nav>}
              <div className="hidden lg:flex flex-col text-right">
                <span className="text-[11px] font-mono text-slate-400">Direct Appointments</span>
                <span className="text-xs font-bold font-mono">
                  <InlineEditable
                    value={activeProfile.phone}
                    onSave={(val) => setProfile((p) => ({ ...p, phone: String(val) }))}
                    isEditingActive={isEditMode}
                    label="Phone Number"
                  />
                </span>
              </div>

              {/* Header Sticky Booking Trigger */}
              <button
                type="button"
                onClick={() => handleOpenBooking()}
                className="font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer text-white hover:opacity-90"
                style={{ backgroundColor: activeAccent.primaryHex }}
              >
                <CalendarCheck className="w-4 h-4" />
                <span>Book Appointment</span>
              </button>
            </div>
            <nav aria-label="Salon website sections" className="w-full flex flex-wrap gap-x-5 gap-y-3 border-t border-current/10 pt-3 text-xs font-semibold">{[['promo','Offers'],['videos','Videos & reels'],['testimonials','Client experiences'],['social','Social media'],['bookings','Bookings & calendar'],['share','Share & referral'],['policies','Salon policies']].filter(([key])=>sectionVisibility[key]).map(([key,label])=><a key={key} className="hover:underline" href={`#salon-${key}`}>{label}</a>)}</nav>
          </header>
        )}

        {/* ============================================================ */}
        {/* 1. HERO SECTION WITH DYNAMIC AI IMAGE MOOD STYLING */}
        {/* ============================================================ */}
        {sectionVisibility.hero && (
          <section className="relative overflow-hidden transition-all bg-slate-950 text-white min-h-[480px] md:min-h-[540px] flex items-center">
            {/* Background Image & Gentle Ambient Mask (15-25% Overlay Max) */}
            <div className="absolute inset-0 z-0 overflow-hidden">
              <img
                src={activeProfile.coverImageUrl}
                alt={activeProfile.businessName}
                className={`w-full h-full object-cover object-center ${heroAIStyling.imageFilterClass} transition-all duration-700 hover:scale-105`}
              />
              {/* Dynamic Overlay Ambient Tint (Gentle ~15-25% mask max) */}
              <div 
                className={`absolute inset-0 ${heroAIStyling.overlayGradientClass} pointer-events-none transition-all duration-500`}
                style={{
                  backgroundColor: heroAIStyling.overlayAccentColor,
                  mixBlendMode: heroAIStyling.overlayBlendMode as any
                }}
              />
              {/* Bottom Vignette for Smooth Transition */}
              <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950/80 to-transparent pointer-events-none" />
            </div>

            {/* Hero Content Container with Dynamic Backdrop Glassmorphism */}
            <div className="relative z-10 px-4 sm:px-6 md:px-12 py-10 md:py-16 max-w-4xl w-full mx-auto my-auto">
              <div className={`${heroAIStyling.cardBackingClass} transition-all duration-500`}>
                {/* Category badge & highlight tags */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span 
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold tracking-wide uppercase shadow-xs transition-colors"
                    style={{ 
                      background: heroAIStyling.badgeBg,
                      color: heroAIStyling.badgeTextColor 
                    }}
                  >
                    <span className="material-symbols-outlined text-sm">{activeTemplate.icon}</span>
                    <span>{activeTemplate.shortName}</span>
                  </span>

                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono transition-colors ${heroAIStyling.verifiedBadgeClass}`}>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Verified Indian Salon</span>
                  </span>

                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono transition-colors ${heroAIStyling.cityBadgeClass}`}>
                    <MapPin className="w-3.5 h-3.5 text-amber-300" />
                    <span>{activeProfile.city}</span>
                  </span>

                  {/* AI Mood Indicator Tag */}
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-950/60 backdrop-blur-md text-amber-300 border border-amber-400/30 text-[10px] font-mono font-bold shadow-xs">
                    <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
                    <span>AI Mood: {heroAIStyling.moodName}</span>
                  </span>
                </div>

                {/* Tagline / Heading */}
                <h1 
                  className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight text-balance transition-colors duration-300"
                  style={{ 
                    color: heroAIStyling.headingColor,
                    textShadow: heroAIStyling.textShadow
                  }}
                >
                  <InlineEditable
                    value={activeProfile.tagline}
                    onSave={(val) => setProfile((p) => ({ ...p, tagline: String(val) }))}
                    isEditingActive={isEditMode}
                    label="Hero Tagline"
                    tag="span"
                  />
                </h1>

                {/* Description */}
                <p 
                  className="text-sm md:text-base mt-4 leading-relaxed max-w-2xl transition-colors duration-300"
                  style={{ 
                    color: heroAIStyling.subtitleColor,
                    textShadow: heroAIStyling.textShadow !== 'none' ? '0 1px 4px rgba(0,0,0,0.7)' : 'none'
                  }}
                >
                  <InlineEditable
                    value={activeProfile.about}
                    onSave={(val) => setProfile((p) => ({ ...p, about: String(val) }))}
                    isEditingActive={isEditMode}
                    type="textarea"
                    label="Hero Story"
                    tag="span"
                  />
                </p>

                {/* Quick Metrics Bar */}
                {sectionVisibility.metrics && (
                  <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t ${heroAIStyling.metricsBorderColor} text-xs transition-colors`}>
                    <div>
                      <div className={`${heroAIStyling.metricsLabelColor} font-mono text-[10px] uppercase`}>Services from</div>
                      <div className={`text-xl font-bold font-mono ${heroAIStyling.metricsValueColor}`}>
                        {activeServices.length ? `₹${Math.min(...activeServices.map(s=>s.price))}` : 'Menu coming soon'}
                      </div>
                    </div>
                    <div>
                      <div className={`${heroAIStyling.metricsLabelColor} font-mono text-[10px] uppercase`}>Lead Specialist</div>
                      <div className="text-sm font-bold truncate">
                        <InlineEditable
                          value={activeProfile.ownerName}
                          onSave={(val) => setProfile((p) => ({ ...p, ownerName: String(val) }))}
                          isEditingActive={isEditMode}
                          label="Lead Specialist Name"
                        />
                      </div>
                    </div>
                    <div>
                      <div className={`${heroAIStyling.metricsLabelColor} font-mono text-[10px] uppercase`}>Specialty</div>
                      <div className="text-sm font-bold truncate">{activeTemplate.subCategories[0] || 'Artistry'}</div>
                    </div>
                    <div>
                      <div className={`${heroAIStyling.metricsLabelColor} font-mono text-[10px] uppercase`}>Client Rating</div>
                      <div className="text-sm font-bold flex items-center gap-1 text-amber-400">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span>{activeReviews.length ? `${(activeReviews.reduce((sum,r)=>sum+r.rating,0)/activeReviews.length).toFixed(1)} (${activeReviews.length} experiences)` : 'No reviews yet'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Primary Action Buttons */}
                <div className="flex flex-wrap items-center gap-3.5 mt-8">
                  <button
                    type="button"
                    onClick={() => handleOpenBooking()}
                    className="font-bold text-sm px-6 py-3.5 rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
                    style={{ 
                      backgroundColor: heroAIStyling.primaryBtnBg,
                      color: heroAIStyling.primaryBtnText 
                    }}
                  >
                    <span>Book Now in INR (₹)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <a
                    href={`https://wa.me/${activeProfile.whatsapp.replace(/\D/g, '')}?text=Hello%20${encodeURIComponent(activeProfile.businessName)},%20I%20would%20like%20to%20inquire%20about%20booking%20an%20appointment.`}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-3.5 rounded-xl border border-emerald-400/30 flex items-center gap-2 transition-all cursor-pointer shadow-md"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>WhatsApp Us ({activeProfile.whatsapp})</span>
                  </a>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Location Banner Bar with Live Hours */}
        <div className={`px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs border-b ${
          isDarkCanvas ? 'bg-[#15151c] border-neutral-800 text-neutral-300' : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
              <MapPin className="w-3.5 h-3.5" />
            </span>
            <span>
              <strong>Salon Location:</strong> {activeProfile.address}, {activeProfile.city} - <span className="font-mono">{activeProfile.postalCode}</span>
            </span>
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Open Today {standardData.openHourText} – {standardData.closeHourText}</span>
            </span>
            <span className="hidden sm:inline text-slate-400">•</span>
            <span className="hidden sm:inline text-slate-500">Walk-ins & Advance Bookings</span>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 2. ABOUT SALON SECTION (STORY, HYGIENE CERTIFICATIONS) */}
        {/* ============================================================ */}
        {sectionVisibility.about && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`p-6 md:p-12 border-b ${
            isDarkCanvas ? 'bg-[#121216] border-neutral-800' : 'bg-white border-slate-200'
          }`}>
            <div className="max-w-4xl mx-auto">
              {/* Header */}
              <div className="text-center mb-8">
                <span 
                  className="text-xs font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full inline-block mb-2"
                  style={{ backgroundColor: `${activeAccent.primaryHex}18`, color: activeAccent.primaryHex }}
                >
                  About Our Sanctuary
                </span>
                <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                  Artistry, Certified Hygiene & Pure Craftsmanship
                </h2>
                <p className={`text-xs md:text-sm mt-2 max-w-2xl mx-auto leading-relaxed ${
                  isDarkCanvas ? 'text-neutral-400' : 'text-slate-600'
                }`}>
                  {standardData.foundingNarrative}
                </p>
              </div>

              {/* Specialties Badges */}
              <div className="flex flex-wrap justify-center gap-2 mb-10">
                {(standardData.specialties || []).map((spec, idx) => (
                  <span
                    key={idx}
                    className={`text-xs font-medium px-3.5 py-1.5 rounded-xl border flex items-center gap-1.5 ${
                      isDarkCanvas ? 'bg-neutral-900 border-neutral-800 text-neutral-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>{spec}</span>
                  </span>
                ))}
              </div>

              {/* Founder / Lead Stylist Quote Card */}
              <div className={`p-6 rounded-2xl border mb-10 flex flex-col sm:flex-row items-center gap-5 ${
                isDarkCanvas ? 'bg-neutral-900/70 border-neutral-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="relative shrink-0">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 shadow-sm" style={{ borderColor: activeAccent.primaryHex }}>
                    <img
                      src={activeProfile.ownerPhotoUrl || undefined}
                      alt={activeProfile.ownerName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="absolute -bottom-2 -right-2 bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-xs">
                    Lead
                  </span>
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <p className={`text-xs italic leading-relaxed ${isDarkCanvas ? 'text-neutral-300' : 'text-slate-700'}`}>
                    "Every client deserves an uncompromising standard of individual personalization, certified non-toxic products, and medical-grade sterilization in an atmosphere of warmth and calmness."
                  </p>
                  <div className="mt-2">
                    <span className="font-bold text-sm block">
                      <InlineEditable
                        value={activeProfile.ownerName}
                        onSave={(val) => setProfile((p) => ({ ...p, ownerName: String(val) }))}
                        isEditingActive={isEditMode}
                        label="Founder Name"
                      />
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      <InlineEditable
                        value={activeProfile.ownerRole}
                        onSave={(val) => setProfile((p) => ({ ...p, ownerRole: String(val) }))}
                        isEditingActive={isEditMode}
                        label="Founder Role"
                      />
                    </span>
                  </div>
                </div>
              </div>

              {/* 4 Hygiene & Quality Certification Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(standardData.certifications || []).map((cert, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border flex items-start gap-3.5 transition-all ${
                      isDarkCanvas ? 'bg-neutral-900/50 border-neutral-800 hover:border-neutral-700' : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    <div 
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-white"
                      style={{ backgroundColor: activeAccent.primaryHex }}
                    >
                      <span className="material-symbols-outlined text-lg">{cert.icon}</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-xs md:text-sm">{cert.title}</h3>
                      <p className={`text-xs mt-1 leading-relaxed ${isDarkCanvas ? 'text-neutral-400' : 'text-slate-500'}`}>
                        {cert.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </motion.section>
        )}

        {/* ============================================================ */}
        {/* 3. SERVICES & PRICING MENU SECTION (100% INLINE EDITABLE) */}
        {/* ============================================================ */}
        {sectionVisibility.services && (
          <section className={`p-6 md:p-12 border-b ${
            isDarkCanvas ? 'bg-[#0f0f13] border-neutral-800' : 'bg-white border-slate-200'
          }`} id="services-section">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span 
                    className="text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: `${activeAccent.primaryHex}18`, color: activeAccent.primaryHex }}
                  >
                    {activeTemplate.title} Menu
                  </span>
                  <span className="text-xs text-slate-400 font-mono">({filteredServices.length} Treatments)</span>
                </div>

                <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-1">
                  <InlineEditable
                    value={sectionHeadings.servicesTitle}
                    onSave={(val) => setSectionHeadings((prev) => ({ ...prev, servicesTitle: String(val) }))}
                    isEditingActive={isEditMode}
                    label="Services Section Heading"
                    tag="span"
                  />
                </h2>

                <p className={`text-xs md:text-sm mt-1 ${isDarkCanvas ? 'text-neutral-400' : 'text-slate-500'}`}>
                  <InlineEditable
                    value={sectionHeadings.servicesSubtitle}
                    onSave={(val) => setSectionHeadings((prev) => ({ ...prev, servicesSubtitle: String(val) }))}
                    isEditingActive={isEditMode}
                    label="Services Section Subtitle"
                    tag="span"
                  />
                </p>
              </div>
            </div>

            {/* Elegant Tabbed Navigation Bar for Categories */}
            <div className="mt-8 mb-8 border-b border-slate-100 dark:border-neutral-800 pb-2 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                {subCategoriesList.map((subCat) => {
                  const isActive = activeSubCategory === subCat;
                  return (
                    <button
                      key={subCat}
                      type="button"
                      onClick={() => setActiveSubCategory(subCat)}
                      className={`text-xs md:text-sm font-extrabold px-4 py-2.5 rounded-xl transition-all relative whitespace-nowrap cursor-pointer ${
                        isActive
                          ? 'text-slate-900 bg-slate-100 dark:bg-neutral-800 dark:text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-neutral-200'
                      }`}
                    >
                      <span>{subCat}</span>
                      {isActive && (
                        <motion.div
                          layoutId="activeServiceTab"
                          className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                          style={{ backgroundColor: activeAccent.primaryHex }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {isEditMode && (
                <button
                  type="button"
                  onClick={handleAddNewService}
                  className="text-xs font-bold px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors shrink-0"
                  title="Add new custom service to menu"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Service</span>
                </button>
              )}
            </div>

            {/* Services Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredServices.map((srv) => (
                <div
                  key={srv.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 group ${
                    isDarkCanvas
                      ? 'bg-neutral-900/80 border-neutral-800 hover:border-neutral-700'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  {srv.imageUrl&&<div className="service-editor-image"><img src={srv.imageUrl} alt={srv.name} width={600} height={400} loading="lazy"/></div>}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`font-extrabold text-base md:text-lg leading-snug ${
                          isDarkCanvas ? 'text-white' : 'text-slate-900'
                        }`}>
                          <InlineEditable
                            value={srv.name}
                            onSave={(val) => handleUpdateServiceName(srv.id, String(val))}
                            isEditingActive={isEditMode}
                            label="Service Name"
                          />
                        </h3>
                        {srv.popular && (
                          <span 
                            className="text-[10px] font-mono font-extrabold px-2.5 py-0.5 rounded-lg border border-white/20 shadow-2xs shrink-0 tracking-wider uppercase"
                            style={{ backgroundColor: activeAccent.primaryHex, color: 'var(--accent-text-color, #ffffff)' }}
                          >
                            POPULAR
                          </span>
                        )}
                      </div>

                      <p className={`text-xs mt-1.5 leading-relaxed font-medium ${
                        isDarkCanvas ? 'text-neutral-300' : 'text-slate-600'
                      }`}>
                        <InlineEditable
                          value={srv.description}
                          onSave={(val) => handleUpdateServiceDesc(srv.id, String(val))}
                          isEditingActive={isEditMode}
                          type="textarea"
                          label="Service Description"
                        />
                      </p>
                    </div>

                    {/* Price & Duration Elegant Badge System */}
                    <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                      <div className="flex items-center gap-2 justify-end flex-wrap">
                        <div className={`text-lg md:text-xl font-extrabold font-mono ${
                          isDarkCanvas ? 'text-emerald-400' : 'text-emerald-700'
                        }`}>
                          <InlineEditable
                            value={srv.price}
                            onSave={(val) => handleUpdateServicePrice(srv.id, Number(val))}
                            isEditingActive={isEditMode}
                            type="price"
                            prefix="₹"
                            label="Service Price (INR)"
                            className="font-mono font-extrabold"
                          />
                        </div>

                        {/* Duration Badge directly next to Price */}
                        {(srv.showDuration !== false || isEditMode) && (
                          <div className={`text-[11px] font-mono flex items-center gap-1 px-2.5 py-1 rounded-full border shrink-0 ${
                            srv.showDuration === false 
                              ? 'text-amber-800 bg-amber-50 border-amber-200' 
                              : isDarkCanvas
                              ? 'text-neutral-200 bg-neutral-800 border-neutral-700'
                              : 'text-slate-700 bg-slate-100 border-slate-200'
                          }`}>
                            <Clock className="w-3 h-3 text-slate-500 dark:text-neutral-400 shrink-0" />
                            <InlineEditable
                              value={srv.durationMinutes}
                              onSave={(val) => handleUpdateServiceDuration(srv.id, Number(val))}
                              isEditingActive={isEditMode}
                              type="number"
                              suffix=" mins"
                              label="Duration"
                              className="font-semibold"
                            />
                            {isEditMode && srv.showDuration === false && (
                              <span className="text-[9px] font-mono font-bold text-amber-700 ml-0.5">
                                (Hidden)
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar inside Card */}
                  <div className={`flex items-center justify-between pt-3 border-t text-xs ${
                    isDarkCanvas ? 'border-neutral-800' : 'border-slate-100'
                  }`}>
                    <span className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md border ${
                      isDarkCanvas
                        ? 'bg-neutral-800 border-neutral-700 text-neutral-300'
                        : 'bg-slate-100 border-slate-200 text-slate-700'
                    }`}>
                      Category: {srv.category}
                    </span>

                    <div className="flex items-center gap-2">
                      {isEditMode && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleToggleServiceShowDuration(srv.id)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1 ${
                              srv.showDuration === false
                                ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300'
                                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-neutral-800'
                            }`}
                            title={
                              srv.showDuration === false
                                ? 'Duration is currently hidden on public website. Click to show.'
                                : 'Duration is currently shown on public website. Click to hide.'
                            }
                          >
                            {srv.showDuration === false ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteService(srv.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Delete Service"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenBooking(srv)}
                        className="font-extrabold px-3.5 py-2 rounded-xl text-xs shadow-xs transition-transform active:scale-95 flex items-center gap-1.5 cursor-pointer hover:opacity-90"
                        style={{ backgroundColor: activeAccent.primaryHex, color: 'var(--accent-text-color, #ffffff)' }}
                      >
                        <CalendarCheck className="w-3.5 h-3.5 shrink-0" />
                        <span>Book (₹{srv.price})</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ============================================================ */}
        {/* 4. MASTER STYLISTS & SPECIALISTS SECTION (INLINE EDITABLE) */}
        {/* ============================================================ */}
        {sectionVisibility.stylists && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`p-6 md:p-12 border-b ${
            isDarkCanvas ? 'bg-[#121216] border-neutral-800' : 'bg-slate-50/50 border-slate-200'
          }`} id="team-section">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
              <div>
                <span 
                  className="text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: `${activeAccent.primaryHex}18`, color: activeAccent.primaryHex }}
                >
                  Our Specialist Team
                </span>

                <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-1">
                  <InlineEditable
                    value={sectionHeadings.stylistsTitle}
                    onSave={(val) => setSectionHeadings((prev) => ({ ...prev, stylistsTitle: String(val) }))}
                    isEditingActive={isEditMode}
                    label="Stylists Section Heading"
                    tag="span"
                  />
                </h2>

                <p className={`text-xs md:text-sm mt-1 ${isDarkCanvas ? 'text-neutral-400' : 'text-slate-500'}`}>
                  <InlineEditable
                    value={sectionHeadings.stylistsSubtitle}
                    onSave={(val) => setSectionHeadings((prev) => ({ ...prev, stylistsSubtitle: String(val) }))}
                    isEditingActive={isEditMode}
                    label="Stylists Section Subtitle"
                    tag="span"
                  />
                </p>
              </div>

              {isEditMode && (
                <button
                  type="button"
                  onClick={handleAddNewStylist}
                  className="text-xs font-bold px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Specialist</span>
                </button>
              )}
            </div>

            {/* Stylists Grid */}
            <motion.div 
              variants={{
                hidden: { opacity: 0 },
                show: {
                  opacity: 1,
                  transition: { staggerChildren: 0.1 }
                }
              }}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5"
            >
              {activeStylists.map((st) => (
                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 10 },
                    show: { opacity: 1, y: 0 }
                  }}
                  key={st.id}
                  className={`rounded-2xl border p-5 flex flex-col justify-between gap-4 transition-all shadow-xs ${
                    isDarkCanvas ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="relative shrink-0">
                      <img
                        src={st.avatarUrl || undefined}
                        alt={st.name}
                        className="w-16 h-16 rounded-2xl object-cover border border-slate-100 shadow-xs"
                      />
                      <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h3 className={`font-extrabold text-base truncate ${isDarkCanvas ? 'text-white' : 'text-slate-900'}`}>
                          <InlineEditable
                            value={st.name}
                            onSave={(val) => handleUpdateStylistName(st.id, String(val))}
                            isEditingActive={isEditMode}
                            label="Specialist Name"
                          />
                        </h3>
                        <div className={`flex items-center gap-1 border px-2 py-0.5 rounded-lg text-xs font-extrabold shrink-0 ${
                          isDarkCanvas
                            ? 'bg-amber-950/80 border-amber-500/60 text-amber-200'
                            : 'bg-amber-100/90 border-amber-300 text-amber-950 shadow-2xs'
                        }`}>
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-600 shrink-0" />
                          <InlineEditable
                            value={st.rating}
                            onSave={(val) => handleUpdateStylistRating(st.id, Number(val))}
                            isEditingActive={isEditMode}
                            type="number"
                            label="Rating"
                          />
                        </div>
                      </div>

                      <p className={`text-xs font-semibold truncate mt-1 ${isDarkCanvas ? 'text-neutral-300' : 'text-slate-600'}`}>
                        <InlineEditable
                          value={st.role}
                          onSave={(val) => handleUpdateStylistRole(st.id, String(val))}
                          isEditingActive={isEditMode}
                          label="Specialist Role"
                        />
                      </p>

                      <div className={`flex items-center gap-1.5 text-[11px] font-bold mt-1.5 ${isDarkCanvas ? 'text-emerald-400' : 'text-emerald-700'}`}>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                        <span>Accepting Online Bookings</span>
                      </div>
                    </div>
                  </div>

                  {/* Specialties tags */}
                  <div className={`pt-2.5 border-t flex flex-wrap gap-1.5 ${isDarkCanvas ? 'border-neutral-800' : 'border-slate-100'}`}>
                    {st.specialties && st.specialties.map((spec, i) => (
                      <span
                        key={i}
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border ${
                          isDarkCanvas
                            ? 'bg-neutral-800/80 border-neutral-700 text-neutral-200'
                            : 'bg-slate-100 border-slate-200/80 text-slate-800'
                        }`}
                      >
                        {spec}
                      </span>
                    ))}
                  </div>

                  {/* Book / Manage */}
                  <div className={`pt-2.5 border-t flex items-center justify-between gap-2 ${isDarkCanvas ? 'border-neutral-800' : 'border-slate-100'}`}>
                    {isEditMode && (
                      <button
                        type="button"
                        onClick={() => handleDeleteStylist(st.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors shrink-0 cursor-pointer"
                        title="Delete specialist"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStylist(st);
                        setIsBookingOpen(true);
                      }}
                      className="w-full text-xs font-extrabold px-4 py-2.5 rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all hover:opacity-90 active:scale-[0.98]"
                      style={{
                        backgroundColor: isDarkCanvas ? '#ffffff' : activeAccent.primaryHex,
                        color: isDarkCanvas ? '#0f172a' : 'var(--accent-text-color, #ffffff)',
                      }}
                    >
                      <span>Select for Service</span>
                      <ChevronRight className="w-4 h-4 shrink-0" />
                    </button>
                  </div>

                </motion.div>
              ))}
            </motion.div>
          </motion.section>
        )}

        {/* ============================================================ */}
        {/* 5. CLIENT REVIEWS & TESTIMONIALS SECTION */}
        {/* ============================================================ */}
        {sectionVisibility.testimonials && (
          <section id="salon-testimonials" className={`p-6 md:p-12 border-b ${
            isDarkCanvas ? 'bg-[#0f0f13] border-neutral-800' : 'bg-white border-slate-200'
          }`}>
            <div className="text-center max-w-3xl mx-auto mb-8">
              <span 
                className="text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                style={{ backgroundColor: `${activeAccent.primaryHex}18`, color: activeAccent.primaryHex }}
              >
                Client Trust & Testimonials
              </span>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-1">
                <InlineEditable
                  value={sectionHeadings.testimonialsTitle}
                  onSave={(val) => setSectionHeadings((prev) => ({ ...prev, testimonialsTitle: String(val) }))}
                  isEditingActive={isEditMode}
                  label="Reviews Section Heading"
                  tag="span"
                />
              </h2>
              <p className={`text-xs md:text-sm mt-1 ${isDarkCanvas ? 'text-neutral-400' : 'text-slate-500'}`}>
                Client experiences shared by the salon in {activeProfile.city}.
              </p>

              {!readOnly&&onManageDashboard&&<button className="underline text-sm mt-3" onClick={()=>onManageDashboard('website_sections')}>Edit featured client experiences</button>}
              {isEditMode && (
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={handleAddNewTestimonial}
                    className="px-4 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-all shadow-xs hover:shadow-md hover:scale-105 active:scale-95 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Featured Review</span>
                  </button>
                </div>
              )}
            </div>

            {!activeReviews.length&&<p className="text-center mb-6 text-sm">Client experiences will appear here after they are shared by the salon.</p>}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(activeReviews || []).length > 0 && (
                <div
                  className={`p-5 rounded-2xl border flex flex-col justify-between gap-3 transition-all ${
                    isDarkCanvas ? 'bg-neutral-900/60 border-neutral-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-0.5 text-amber-400">
                        {Array.from({ length: activeReviews[testimonialIndex % activeReviews.length].rating || 5 }).map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                        ))}
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">{activeReviews[testimonialIndex % activeReviews.length].date}</span>
                    </div>

                    <p className={`text-xs italic leading-relaxed ${isDarkCanvas ? 'text-neutral-300' : 'text-slate-700'}`}>
                      "{activeReviews[testimonialIndex % activeReviews.length].comment}"
                    </p>
                  </div>

                  <div>
                    <div className="pt-3 border-t border-slate-200/60 dark:border-neutral-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-slate-100 border border-slate-200/80">
                          {activeReviews[testimonialIndex % activeReviews.length].avatarUrl ? (
                            <img 
                              src={activeReviews[testimonialIndex % activeReviews.length].avatarUrl}
                              alt={activeReviews[testimonialIndex % activeReviews.length].name}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
                              {activeReviews[testimonialIndex % activeReviews.length].name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-xs">{activeReviews[testimonialIndex % activeReviews.length].name}</div>
                          <div className="text-[10px] text-slate-400">{activeReviews[testimonialIndex % activeReviews.length].location || activeProfile.city} • Verified</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 max-w-[120px] truncate">
                        {activeReviews[testimonialIndex % activeReviews.length].serviceName || 'Custom Service'}
                      </span>
                    </div>

                    {isEditMode && (
                      <div className="mt-3 pt-2.5 border-t border-slate-150 dark:border-neutral-800 flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleEditTestimonial(activeReviews[testimonialIndex % activeReviews.length])}
                          className="px-2 py-1 text-[10px] font-bold text-slate-600 hover:text-amber-700 hover:bg-amber-50 bg-white border border-slate-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTestimonial(activeReviews[testimonialIndex % activeReviews.length].id)}
                          className="px-2 py-1 text-[10px] font-bold text-rose-600 hover:bg-rose-50 hover:border-rose-200 bg-white border border-slate-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ============================================================ */}
        {/* 6. STUDIO GALLERY & LOOKBOOK PHOTOS */}
        {/* ============================================================ */}
        {sectionVisibility.gallery && (standardData.gallery.length>0 || !readOnly) && (
          <section className={`p-6 md:p-12 border-b ${
            isDarkCanvas ? 'bg-[#121216] border-neutral-800' : 'bg-slate-50/50 border-slate-200'
          }`}>
            <div className="flex items-end justify-between mb-6">
              <div>
                <span 
                  className="text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: `${activeAccent.primaryHex}18`, color: activeAccent.primaryHex }}
                >
                  Visual Lookbook
                </span>
                <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-1">
                  <InlineEditable
                    value={sectionHeadings.galleryTitle}
                    onSave={(val) => setSectionHeadings((prev) => ({ ...prev, galleryTitle: String(val) }))}
                    isEditingActive={isEditMode}
                    label="Gallery Section Heading"
                    tag="span"
                  />
                </h2>
              </div>
              <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                Follow @{activeProfile.instagramHandle?.replace('@', '')} on Instagram
              </span>
            </div>

            <div className="flex gap-2 overflow-x-auto mb-4" aria-label="Photo gallery categories">{(['All',...Array.from(new Set(categoryPhotos.map(p=>p.category)))] as const).map(cat=><button key={cat} type="button" className="secondary-action" aria-pressed={galleryCategory===cat} onClick={()=>setGalleryCategory(cat)}>{cat} ({categoryPhotos.filter(p=>cat==='All'||p.category===cat).length})</button>)}</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(standardData.gallery || []).filter(photo=>galleryCategory==='All'||photo.category===galleryCategory).map((photo, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedGalleryPhoto(photo.url)}
                  className="group relative rounded-xl overflow-hidden aspect-4/3 cursor-pointer shadow-md hover:shadow-xl border border-slate-100 dark:border-neutral-800 transition-all duration-300"
                >
                  <img
                    src={photo.url}
                    alt={photo.title || 'Salon Gallery Photo'}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-between p-3.5 text-white">
                    <div className="self-end bg-black/40 backdrop-blur-md p-1.5 rounded-full scale-75 group-hover:scale-100 transition-transform duration-300">
                      <ZoomIn className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <span className="text-[9px] font-mono uppercase tracking-wider text-neutral-300 bg-white/10 px-2 py-0.5 rounded-full backdrop-blur-xs">
                        {photo.tag || 'Transformation'}
                      </span>
                      <h4 className="text-xs font-extrabold mt-1.5 truncate text-white drop-shadow-md">
                        {photo.title || 'Salon View'}
                      </h4>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ============================================================ */}
        {/* 7. LOCATION, MAP & WORKING HOURS CARD */}
        {/* ============================================================ */}
        {sectionVisibility.location && (
          <section className="p-6 md:p-12 bg-slate-50 border-t border-slate-100">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Location details */}
              <div className="flex flex-col justify-between gap-4">
                <div>
                  <span 
                    className="text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: `${activeAccent.primaryHex}18`, color: activeAccent.primaryHex }}
                  >
                    Find Us
                  </span>
                  <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-1 text-slate-900">
                    <InlineEditable
                      value={sectionHeadings.locationTitle}
                      onSave={(val) => setSectionHeadings((prev) => ({ ...prev, locationTitle: String(val) }))}
                      isEditingActive={isEditMode}
                      label="Location Section Heading"
                      tag="span"
                    />
                  </h2>
                  <p className="text-xs md:text-sm mt-1 leading-relaxed text-slate-700">
                    Conveniently located in the heart of {activeProfile.city}. Free parking and valet available for salon clients.
                  </p>
                </div>

                <div className="flex flex-col gap-3 text-xs">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">Studio Address</div>
                      <div className="text-slate-700 font-medium text-xs mt-0.5">
                        {activeProfile.address}, {activeProfile.city} - {activeProfile.postalCode}
                      </div>
                      {standardData.landmark && (
                        <div className="text-[11px] text-amber-800 mt-1 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200/50 inline-block">
                          Landmark: {standardData.landmark}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">Operating Hours</div>
                      <div className="text-slate-700 font-mono text-[11.5px] mt-0.5 font-semibold">
                        Monday – Friday (except Tuesday): {activeProfile.workingHoursMonFri || `${standardData.openHourText} – ${standardData.closeHourText}`}
                      </div>
                      <div className="text-xs text-slate-600 mt-1">
                        Tuesday: {activeProfile.workingHoursTue || 'Contact studio for hours'}
                      </div>
                      <div className="text-slate-700 font-mono text-[11.5px] font-semibold mt-0.5">
                        Sunday: {activeProfile.workingHoursSun || '10:00 AM – 07:00 PM (By Advance Booking)'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">Phone & Instant WhatsApp</div>
                      {activeProfile.phone === activeProfile.whatsapp ? (
                        <div className="text-slate-700 font-mono font-semibold text-xs mt-0.5">
                          {activeProfile.phone}
                        </div>
                      ) : (
                        <div className="text-slate-700 font-mono font-semibold text-xs mt-0.5">
                          Phone: {activeProfile.phone} | WhatsApp: {activeProfile.whatsapp}
                        </div>
                      )}
                      
                      {/* Social Links in Contact Section */}
                      <div className="flex items-center gap-2 mt-3">
                        {activeProfile.instagramHandle && (
                          <a href={socialUrl(activeProfile.instagramHandle,'instagram')} target="_blank" rel="noreferrer" className="text-slate-600 hover:text-pink-600">
                            <Instagram className="w-5 h-5" />
                          </a>
                        )}
                        {activeProfile.facebookPage && (
                          <a href={socialUrl(activeProfile.facebookPage,'facebook')} target="_blank" rel="noreferrer" className="text-slate-600 hover:text-blue-600">
                            <Facebook className="w-5 h-5" />
                          </a>
                        )}
                        {activeProfile.youtubeChannel && (
                          <a href={socialUrl(activeProfile.youtubeChannel,'youtube')} target="_blank" rel="noreferrer" className="text-slate-600 hover:text-red-600">
                            <Youtube className="w-5 h-5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleOpenBooking()}
                    className="font-bold text-xs px-5 py-2.5 rounded-xl text-white shadow-xs cursor-pointer hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: activeAccent.primaryHex }}
                  >
                    Schedule Your Appointment
                  </button>

                  <a
                    href={`https://wa.me/${activeProfile.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer bg-white shadow-xs transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp Inquiry</span>
                  </a>
                </div>
              </div>

              {/* Map Preview Placeholder Card */}
              <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white p-2 min-h-[380px] shadow-xs">
                {readOnly ? <div className="p-4"><p className="font-bold mb-3">{activeProfile.address}</p>{Number.isFinite(activeProfile.latitude)&&Number.isFinite(activeProfile.longitude)?<iframe title="Salon location on OpenStreetMap" className="w-full h-80 border-0" loading="lazy" src={`https://www.openstreetmap.org/export/embed.html?bbox=${activeProfile.longitude!-0.01},${activeProfile.latitude!-0.01},${activeProfile.longitude!+0.01},${activeProfile.latitude!+0.01}&layer=mapnik&marker=${activeProfile.latitude},${activeProfile.longitude}`}/>:<a className="underline" href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(activeProfile.address||activeProfile.city)}`} target="_blank" rel="noreferrer">View location on OpenStreetMap</a>}</div>:<InteractiveMapSetup profile={activeProfile} setProfile={setProfile}/> }
              </div>
            </div>
          </section>
        )}

        <WebsiteSections onCustomerAccount={onCustomerAccount} profile={activeProfile} services={activeServices} onBook={handleOpenBooking} onManage={onManageDashboard} setProfile={setProfile} isEditingActive={isEditMode && !readOnly} readOnly={readOnly} policies={policies} loyaltyConfig={loyaltyConfig}/>
        {branding?.poweredBy&&<p className="text-center text-xs py-4">Powered by {branding.platformName||'StudioFlow'}</p>}
        <CustomerAppPromotion/>
        {/* 8. FOOTER WITH DYNAMIC SOCIAL LINKS */}
        <footer className={`py-8 px-6 md:px-12 border-t text-center ${
          isDarkCanvas ? 'bg-[#0b0b0e] border-neutral-900 text-neutral-400' : 'bg-slate-50 border-slate-200 text-slate-500'
        }`}>
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-left">
              <span className={`font-extrabold text-sm tracking-tight ${isDarkCanvas ? 'text-white' : 'text-slate-900'}`}>
                {activeProfile.businessName}
              </span>
              <p className={`text-[10px] mt-1 ${isDarkCanvas ? 'text-neutral-400' : 'text-slate-400'}`}>
                © {new Date().getFullYear()} {activeProfile.businessName}. All rights reserved.
              </p>
            </div>

            {/* Social Links Bar */}
            {sectionVisibility.social&&<div className="flex items-center gap-2 flex-wrap justify-center">
              {activeProfile.instagramHandle && (
                <a
                  href={socialUrl(activeProfile.instagramHandle,'instagram')}
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-full border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
                  title="Instagram Profile"
                >
                  <Instagram className="w-4 h-4 text-pink-600" />
                </a>
              )}

              {activeProfile.facebookPage && (
                <a
                  href={socialUrl(activeProfile.facebookPage,'facebook')}
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-full border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
                  title="Facebook Page"
                >
                  <Facebook className="w-4 h-4 text-blue-600" />
                </a>
              )}

              {activeProfile.youtubeChannel && (
                <a
                  href={socialUrl(activeProfile.youtubeChannel,'youtube')}
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-full border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
                  title="YouTube Channel"
                >
                  <Youtube className="w-4 h-4 text-red-600" />
                </a>
              )}

              {activeProfile.whatsapp && (
                <a
                  href={`https://wa.me/${activeProfile.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-full border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
                  title="WhatsApp Chat"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                </a>
              )}

              {activeProfile.googleBusinessUrl && (
                <a
                  href={activeProfile.googleBusinessUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-full border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
                  title="Google Business Listing"
                >
                  <svg className="w-3.5 h-3.5 text-blue-500 fill-current" viewBox="0 0 24 24">
                    <path d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.86 0-7-3.14-7-7s3.14-7 7-7c1.7 0 3.25.61 4.46 1.614l2.427-2.427C17.485 1.77 15.02 1 12.24 1 6.58 1 2 5.58 2 11.24s4.58 10.24 10.24 10.24c5.9 0 9.8-4.14 9.8-9.98 0-.6-.05-1.18-.15-1.72H12.24z" />
                  </svg>
                </a>
              )}
            </div>}
          </div>
        </footer>
        </>
        )}

      </div>

      {/* Floating Instant WhatsApp Button */}
      {sectionVisibility.whatsappFloat && (
        <a
          href={`https://wa.me/${activeProfile.whatsapp.replace(/\D/g, '')}?text=Hi%20${encodeURIComponent(activeProfile.businessName)},%20I%20would%20like%20to%20book%20an%20appointment.`}
          target="_blank"
          rel="noreferrer"
          className="fixed bottom-6 right-6 z-40 bg-emerald-500 hover:bg-emerald-600 text-white p-3.5 rounded-full shadow-2xl flex items-center gap-2 transition-all hover:scale-105 active:scale-95 group cursor-pointer"
          title="Chat on WhatsApp"
        >
          <MessageSquare className="w-5 h-5 fill-white" />
          <span className="text-xs font-bold max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap">
            WhatsApp Booking
          </span>
        </a>
      )}

      {/* Booking Modal Flow */}
      <BookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        profile={activeProfile}
        services={activeServices}
        stylists={activeStylists}
        initialService={selectedService}
        initialStylist={selectedStylist}
        onAddAppointment={onAddAppointment}
        themeAccentHex={activeAccent.primaryHex}
        onShowToast={(toastData) => {
          setToastMessage({
            id: toastData.id,
            title: toastData.title,
            clientName: toastData.clientName,
            serviceName: toastData.serviceName,
            stylistName: toastData.stylistName,
            dateTime: toastData.dateTime,
            refCode: toastData.refCode,
            price: toastData.price
          });
        }}
      />

      {/* Gallery Lightbox Modal */}
      {selectedGalleryPhoto && (() => {
        const galleryPhotos = standardData.gallery || [];
        const currentIndex = galleryPhotos.findIndex(photo => photo.url === selectedGalleryPhoto);
        const currentPhoto = galleryPhotos[currentIndex];

        const handlePrevPhoto = (e: React.MouseEvent) => {
          e.stopPropagation();
          if (galleryPhotos.length > 0 && currentIndex !== -1) {
            const prevIndex = (currentIndex - 1 + galleryPhotos.length) % galleryPhotos.length;
            setSelectedGalleryPhoto(galleryPhotos[prevIndex].url);
          }
        };

        const handleNextPhoto = (e: React.MouseEvent) => {
          e.stopPropagation();
          if (galleryPhotos.length > 0 && currentIndex !== -1) {
            const nextIndex = (currentIndex + 1) % galleryPhotos.length;
            setSelectedGalleryPhoto(galleryPhotos[nextIndex].url);
          }
        };

        return (
          <div 
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-between p-4 md:p-8"
            onClick={() => setSelectedGalleryPhoto(null)}
          >
            {/* Top Toolbar */}
            <div className="w-full max-w-5xl flex items-center justify-between text-white pb-4 border-b border-white/10 shrink-0">
              <div className="text-left">
                <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                  {currentPhoto?.tag || 'Gallery Photo'}
                </span>
                <h3 className="text-sm md:text-base font-extrabold tracking-tight">
                  {currentPhoto?.title || 'Studio Lookbook View'}
                </h3>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs font-mono text-neutral-400">
                  {currentIndex + 1} / {galleryPhotos.length}
                </span>
                <button
                  onClick={() => setSelectedGalleryPhoto(null)}
                  className="bg-white/10 text-white p-2.5 rounded-full hover:bg-white/20 transition-all cursor-pointer"
                  title="Close Lightbox"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Main Image Stage with Navigation Controls */}
            <div className="relative w-full max-w-5xl flex-1 flex items-center justify-center py-6 min-h-0">
              {/* Prev Button */}
              {galleryPhotos.length > 1 && (
                <button
                  onClick={handlePrevPhoto}
                  className="absolute left-2 md:left-4 z-10 bg-black/60 hover:bg-black text-white p-3 md:p-4 rounded-full border border-white/10 transition-all cursor-pointer shadow-lg hover:scale-105 active:scale-95 shrink-0 flex items-center justify-center"
                  title="Previous Photo"
                >
                  <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                </button>
              )}

              {/* Central Image Container */}
              <div 
                className="relative max-h-full max-w-[85vw] md:max-w-[70vw] rounded-2xl overflow-hidden shadow-2xl bg-black border border-white/5 flex items-center justify-center aspect-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <img 
                  src={selectedGalleryPhoto} 
                  alt={currentPhoto?.title || 'Gallery Zoom'} 
                  className="max-h-[60vh] md:max-h-[68vh] object-contain w-full rounded-2xl"
                />
              </div>

              {/* Next Button */}
              {galleryPhotos.length > 1 && (
                <button
                  onClick={handleNextPhoto}
                  className="absolute right-2 md:right-4 z-10 bg-black/60 hover:bg-black text-white p-3 md:p-4 rounded-full border border-white/10 transition-all cursor-pointer shadow-lg hover:scale-105 active:scale-95 shrink-0 flex items-center justify-center"
                  title="Next Photo"
                >
                  <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
                </button>
              )}
            </div>

            {/* Interactive Thumbnail Carousel */}
            {galleryPhotos.length > 1 && (
              <div 
                className="w-full max-w-2xl py-4 border-t border-white/10 shrink-0 flex items-center justify-center gap-2 overflow-x-auto no-scrollbar"
                onClick={(e) => e.stopPropagation()}
              >
                {galleryPhotos.map((photo, idx) => {
                  const isActive = idx === currentIndex;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedGalleryPhoto(photo.url)}
                      className={`relative w-12 h-12 md:w-16 md:h-16 rounded-xl overflow-hidden cursor-pointer border-2 transition-all flex-shrink-0 ${
                        isActive 
                          ? 'border-emerald-400 scale-110 shadow-lg' 
                          : 'border-transparent opacity-50 hover:opacity-100'
                      }`}
                    >
                      <img 
                        src={photo.url} 
                        alt="thumbnail" 
                        className="w-full h-full object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* Booking Confirmation Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 max-w-sm w-full bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 flex flex-col gap-2.5 animate-in slide-in-from-bottom">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4" />
              <span>{toastMessage.title}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white p-1">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="text-xs text-slate-300">
            <div><strong>Client:</strong> {toastMessage.clientName}</div>
            <div><strong>Service:</strong> {toastMessage.serviceName} (₹{toastMessage.price})</div>
            <div><strong>Specialist:</strong> {toastMessage.stylistName}</div>
            <div><strong>Slot:</strong> {toastMessage.dateTime}</div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] font-mono">
            <span>Ref: {toastMessage.refCode}</span>
            <button
              onClick={() => handleCopyRefCode(toastMessage.refCode)}
              className="text-emerald-400 hover:underline flex items-center gap-1"
            >
              {copiedRef ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              <span>{copiedRef ? 'Copied' : 'Copy Ref'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Testimonials Modal Editor */}
      <TestimonialModal
        isOpen={isTestimonialModalOpen}
        onClose={() => setIsTestimonialModalOpen(false)}
        onSave={handleSaveTestimonial}
        editingTestimonial={editingTestimonial}
        defaultCity={activeProfile.city}
        availableServices={activeServices.map((s) => s.name)}
      />

    </div>
  );
};
