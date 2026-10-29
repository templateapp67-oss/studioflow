import React, { useState } from 'react';
import type { ClinicOfferCard, SalonProfile, SalonService } from '../../types';
import { DEFAULT_CLINIC_OFFERS, isOfferActive } from './ClinicOffers';
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  RotateCcw, 
  Tag, 
  GripVertical, 
  ArrowUp, 
  ArrowDown, 
  Calendar, 
  Info, 
  ArrowUpRight,
  Clock,
  AlertCircle
} from 'lucide-react';

interface ClinicOffersManagerProps {
  profile: SalonProfile;
  setProfile: React.Dispatch<React.SetStateAction<SalonProfile>>;
  services?: SalonService[];
}

const PRESET_OFFER_IMAGES = [
  {
    label: 'Doctor Consultation',
    url: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Scalp & Hair Examination',
    url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Aesthetic Treatment Room',
    url: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Laser & Rejuvenation Room',
    url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80',
  },
];

export function ClinicOffersManager({ profile, setProfile, services = [] }: ClinicOffersManagerProps) {
  const offers = profile.clinicOffers || [];
  const publishedCount = offers.filter(isOfferActive).length;
  const totalCount = offers.length;

  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const moveCard = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= offers.length) return;
    setProfile((prev) => {
      const list = [...(prev.clinicOffers || [])];
      const [moved] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, moved);
      return {
        ...prev,
        clinicOffers: list,
      };
    });
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;
    if (draggedIndex !== targetIndex) {
      moveCard(draggedIndex, targetIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const updateOffer = (id: string, patch: Partial<ClinicOfferCard>) => {
    setProfile((prev) => ({
      ...prev,
      clinicOffers: (prev.clinicOffers || []).map((o) =>
        o.id === id ? { ...o, ...patch } : o
      ),
    }));
  };

  const addOfferCard = () => {
    const newOffer: ClinicOfferCard = {
      id: `offer-${Date.now()}`,
      title: 'New Clinic Offer',
      image: PRESET_OFFER_IMAGES[0].url,
      description: 'Describe the clinic offer, treatment care package, or special service guidance.',
      relatedService: services[0]?.name || 'Skincare Service',
      startDate: '',
      expiryDate: '',
      terms: 'Applicable terms and suitability will be discussed during initial consultation.',
      isPublished: true,
      ctaText: 'Enquire Now',
    };

    setProfile((prev) => ({
      ...prev,
      clinicOffers: [...(prev.clinicOffers || []), newOffer],
    }));
  };

  const removeOfferCard = (id: string) => {
    setProfile((prev) => ({
      ...prev,
      clinicOffers: (prev.clinicOffers || []).filter((o) => o.id !== id),
    }));
  };

  const togglePublishStatus = (id: string, currentStatus: boolean) => {
    updateOffer(id, { isPublished: !currentStatus });
  };

  const loadDefaults = () => {
    setProfile((prev) => ({
      ...prev,
      clinicOffers: DEFAULT_CLINIC_OFFERS,
    }));
  };

  const restoreSystemDefaults = () => {
    setProfile((prev) => ({
      ...prev,
      clinicOffers: undefined,
    }));
  };

  const displayOffers = offers.length > 0 ? offers : DEFAULT_CLINIC_OFFERS;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs my-6" id="current-offers-manager">
      {/* SECTION HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </span>
            <h3 className="font-bold text-xl text-gray-900">Current Offers Manager</h3>
            <span className="bg-emerald-50 text-emerald-700 text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
              PUBLIC WEBSITE SECTION
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1 max-w-2xl">
            Configure promotional offer cards for your clinic website. Add titles, images, related services, start/expiry dates, terms, and CTA labels. Expired or unpublished offers are automatically hidden on your website.
          </p>
        </div>

        {/* TOP CONTROLS & STATS */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200">
            <span className="text-gray-500">Offers:</span>
            <span className="font-bold text-emerald-700">{publishedCount} active</span>
            <span className="text-gray-400">({totalCount} total)</span>
          </div>

          <div className="flex items-center bg-gray-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('editor')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'editor' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Manage Offers
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'preview' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Live Preview
            </button>
          </div>
        </div>
      </div>

      {/* ACTION TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 my-4 bg-gray-50/70 p-3 rounded-xl border border-gray-200">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={addOfferCard}
            className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Offer Card</span>
          </button>

          <button
            type="button"
            onClick={loadDefaults}
            className="px-3.5 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Load Default 3 Offers</span>
          </button>

          {profile.clinicOffers !== undefined && (
            <button
              type="button"
              onClick={restoreSystemDefaults}
              className="px-3 py-2 text-xs font-medium text-gray-500 hover:text-gray-800 underline cursor-pointer"
            >
              Reset to System Guidance
            </button>
          )}
        </div>

        <div className="text-xs text-gray-500 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 font-medium bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-200">
            <GripVertical className="w-3.5 h-3.5 text-emerald-600" />
            Drag cards or use ↑ ↓ to reorder
          </span>
          <span className="flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-gray-400" />
            <span>Auto-saves with website content</span>
          </span>
        </div>
      </div>

      {/* EDITOR TAB */}
      {activeTab === 'editor' && (
        <div className="space-y-4 mt-4">
          {offers.length === 0 && (
            <div className="p-6 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
              <Sparkles className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <h4 className="font-bold text-gray-900 text-sm">No Custom Current Offers Configured</h4>
              <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                Your clinic website is currently displaying standard demonstration entries (Skin Care Consultation, Hair &amp; Scalp Care, and Aesthetic Treatment Packages).
              </p>
              <div className="flex justify-center gap-3 mt-4">
                <button
                  type="button"
                  onClick={loadDefaults}
                  className="px-4 py-2 bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-emerald-900 cursor-pointer"
                >
                  Load 3 Demonstration Offers to Customize
                </button>
                <button
                  type="button"
                  onClick={addOfferCard}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50 cursor-pointer"
                >
                  Create Blank Offer Card
                </button>
              </div>
            </div>
          )}

          {offers.map((offer, index) => {
            const active = isOfferActive(offer);
            const isExpired = offer.expiryDate && offer.expiryDate.trim() && !active && offer.isPublished !== false;

            return (
              <div
                key={offer.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`border rounded-2xl p-5 transition-all ${
                  draggedIndex === index
                    ? 'opacity-40 border-dashed border-emerald-500 bg-emerald-50/50 scale-[0.99]'
                    : ''
                } ${
                  dragOverIndex === index && draggedIndex !== index
                    ? 'border-2 border-emerald-600 ring-2 ring-emerald-200 bg-emerald-50/20'
                    : ''
                } ${
                  active
                    ? 'border-gray-200 bg-white shadow-xs'
                    : isExpired
                    ? 'border-red-200 bg-red-50/20'
                    : 'border-amber-200 bg-amber-50/30'
                }`}
              >
                {/* CARD ITEM HEADER */}
                <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="p-1 text-gray-400 hover:text-emerald-700 cursor-grab active:cursor-grabbing rounded hover:bg-gray-100 transition-colors flex items-center justify-center"
                      title="Drag to reorder card position"
                    >
                      <GripVertical className="w-4 h-4" />
                    </div>

                    <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center">
                      {index + 1}
                    </span>

                    {/* REORDER UP/DOWN */}
                    <div className="flex items-center bg-gray-100 rounded-lg p-0.5 border border-gray-200">
                      <button
                        type="button"
                        onClick={() => moveCard(index, index - 1)}
                        disabled={index === 0}
                        className="p-1 text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:hover:text-gray-500 rounded hover:bg-white transition-colors cursor-pointer disabled:cursor-not-allowed"
                        title="Move offer up"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveCard(index, index + 1)}
                        disabled={index === offers.length - 1}
                        className="p-1 text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:hover:text-gray-500 rounded hover:bg-white transition-colors cursor-pointer disabled:cursor-not-allowed"
                        title="Move offer down"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>

                    <h4 className="font-bold text-sm text-gray-900 ml-1">
                      {offer.title || 'Untitled Offer Card'}
                    </h4>

                    {/* STATUS BADGES */}
                    {active ? (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                        <Eye className="w-3 h-3" /> Active &amp; Published
                      </span>
                    ) : isExpired ? (
                      <span className="bg-red-100 text-red-800 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border border-red-200 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Expired (Hidden)
                      </span>
                    ) : (
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                        <EyeOff className="w-3 h-3" /> Draft / Unpublished
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {/* PUBLISH TOGGLE */}
                    <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={offer.isPublished !== false}
                        onChange={() => togglePublishStatus(offer.id, offer.isPublished !== false)}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300 cursor-pointer"
                      />
                      <span>Published</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => removeOfferCard(offer.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                      title="Remove offer card"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* FORM GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* TITLE, RELATED SERVICE, DESCRIPTION */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Offer Title *
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        value={offer.title}
                        placeholder="e.g. Skin Care Consultation"
                        onChange={(e) => updateOffer(offer.id, { title: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Related Service / Category Tag
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        value={offer.relatedService || ''}
                        placeholder="e.g. Skin Care Consultation, Hair & Scalp Care"
                        onChange={(e) => updateOffer(offer.id, { relatedService: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Description *
                      </label>
                      <textarea
                        rows={3}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        value={offer.description}
                        placeholder="Describe what is offered and what the patient should expect..."
                        onChange={(e) => updateOffer(offer.id, { description: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* IMAGE, DATES, CTA & TERMS */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center justify-between">
                        <span>Image URL *</span>
                        <span className="text-[10px] text-gray-400 font-normal">High resolution clinic photograph</span>
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-mono"
                        value={offer.image || ''}
                        placeholder="https://..."
                        onChange={(e) => updateOffer(offer.id, { image: e.target.value })}
                      />

                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold text-gray-500">Quick presets:</span>
                        {PRESET_OFFER_IMAGES.map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => updateOffer(offer.id, { image: preset.url })}
                            className="text-[10px] px-2 py-0.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors cursor-pointer"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Start Date (Optional)
                        </label>
                        <input
                          type="date"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none bg-white font-mono"
                          value={offer.startDate || ''}
                          onChange={(e) => updateOffer(offer.id, { startDate: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Expiry Date (Optional)
                        </label>
                        <input
                          type="date"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none bg-white font-mono"
                          value={offer.expiryDate || ''}
                          onChange={(e) => updateOffer(offer.id, { expiryDate: e.target.value })}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Button Label / CTA Text
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        value={offer.ctaText || 'Enquire Now'}
                        placeholder="e.g. Enquire Now, Explore Treatments, View Package Details"
                        onChange={(e) => updateOffer(offer.id, { ctaText: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* TERMS & CONDITIONS */}
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Terms &amp; Conditions / Eligibility Information
                  </label>
                  <textarea
                    rows={2}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    value={offer.terms || ''}
                    placeholder="Provide clear terms, eligibility guidelines or visit details..."
                    onChange={(e) => updateOffer(offer.id, { terms: e.target.value })}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PREVIEW TAB */}
      {activeTab === 'preview' && (
        <div className="mt-4 p-6 bg-gray-100 rounded-2xl border border-gray-200">
          <div className="text-center mb-6">
            <span className="text-xs font-bold tracking-widest text-emerald-700 uppercase">
              CURRENT OFFERS PREVIEW
            </span>
            <h3 className="font-bold text-2xl text-gray-900 mt-1">
              Explore Our <em className="not-italic text-emerald-700">Current Offers</em>
            </h3>
            <p className="text-xs text-gray-600 max-w-md mx-auto mt-1">
              Check the treatments and packages currently available at our clinic. Contact our team for details, eligibility and applicable terms.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayOffers.filter(isOfferActive).map((offer) => (
              <div
                key={offer.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-[16/10] bg-gray-200">
                    <img
                      src={offer.image || PRESET_OFFER_IMAGES[0].url}
                      alt={offer.title}
                      className="w-full h-full object-cover"
                    />
                    {offer.relatedService && (
                      <span className="absolute top-3 left-3 bg-black/80 text-white text-[10px] font-bold px-2.5 py-1 rounded">
                        {offer.relatedService}
                      </span>
                    )}
                  </div>

                  <div className="p-4">
                    <h4 className="font-bold text-base text-gray-900">{offer.title}</h4>
                    <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">{offer.description}</p>
                    {offer.terms && (
                      <p className="text-[11px] text-gray-400 mt-2 font-mono line-clamp-2">{offer.terms}</p>
                    )}
                  </div>
                </div>

                <div className="p-4 pt-0 border-t border-gray-100 mt-2">
                  <button
                    type="button"
                    className="w-full py-2 px-3 bg-emerald-800 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1"
                  >
                    <span>{offer.ctaText || 'Enquire Now'}</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
