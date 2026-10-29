import React, { useState } from 'react';
import type { PatientBenefitCard, SalonProfile } from '../../types';
import { DEFAULT_PATIENT_BENEFITS } from './PatientBenefits';
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  RotateCcw, 
  CheckCircle2, 
  ArrowUpRight, 
  Image as ImageIcon,
  Tag,
  FileText,
  GripVertical,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

interface PatientBenefitsManagerProps {
  profile: SalonProfile;
  setProfile: React.Dispatch<React.SetStateAction<SalonProfile>>;
}

const PRESET_IMAGES = [
  {
    label: 'Doctor Consultation',
    url: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Dermatology Treatment',
    url: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Clinic Staff & Patient',
    url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Laser & Aesthetic Room',
    url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80',
  },
];

export function PatientBenefitsManager({ profile, setProfile }: PatientBenefitsManagerProps) {
  const benefits = profile.patientBenefits || [];
  const publishedCount = benefits.filter(b => b.published !== false && b.title?.trim()).length;
  const draftCount = benefits.length - publishedCount;

  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [newHighlightInputs, setNewHighlightInputs] = useState<Record<string, string>>({});
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const moveCard = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= benefits.length) return;
    setProfile(prev => {
      const list = [...(prev.patientBenefits || [])];
      const [moved] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, moved);
      return {
        ...prev,
        patientBenefits: list,
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

  const updateBenefit = (id: string, patch: Partial<PatientBenefitCard>) => {
    setProfile(prev => ({
      ...prev,
      patientBenefits: (prev.patientBenefits || []).map(b => 
        b.id === id ? { ...b, ...patch } : b
      ),
    }));
  };

  const addBenefitCard = () => {
    const newCard: PatientBenefitCard = {
      id: `benefit-${Date.now()}`,
      title: 'New Patient Benefit',
      description: 'Describe the care package, consultation option, or patient benefit available at your clinic.',
      imageUrl: PRESET_IMAGES[0].url,
      imageAlt: 'Patient consultation at clinic',
      validity: 'Valid for new & returning patients',
      published: true,
      ctaLabel: 'Enquire Now',
      ctaAction: 'enquire',
      benefits: ['Clinic-approved care', 'Personalized guidance'],
    };

    setProfile(prev => ({
      ...prev,
      patientBenefits: [...(prev.patientBenefits || []), newCard],
    }));
  };

  const removeBenefitCard = (id: string) => {
    setProfile(prev => ({
      ...prev,
      patientBenefits: (prev.patientBenefits || []).filter(b => b.id !== id),
    }));
  };

  const togglePublishStatus = (id: string, currentStatus: boolean) => {
    updateBenefit(id, { published: !currentStatus });
  };

  const loadDefaults = () => {
    setProfile(prev => ({
      ...prev,
      patientBenefits: DEFAULT_PATIENT_BENEFITS,
    }));
  };

  const restoreSystemDefaults = () => {
    setProfile(prev => ({
      ...prev,
      patientBenefits: undefined,
    }));
  };

  const addHighlightPoint = (cardId: string) => {
    const text = (newHighlightInputs[cardId] || '').trim();
    if (!text) return;

    const card = benefits.find(b => b.id === cardId);
    if (!card) return;

    const existing = card.benefits || [];
    updateBenefit(cardId, { benefits: [...existing, text] });
    setNewHighlightInputs(prev => ({ ...prev, [cardId]: '' }));
  };

  const removeHighlightPoint = (cardId: string, pointIndex: number) => {
    const card = benefits.find(b => b.id === cardId);
    if (!card) return;

    const updated = (card.benefits || []).filter((_, idx) => idx !== pointIndex);
    updateBenefit(cardId, { benefits: updated });
  };

  const displayCards = benefits.length > 0 ? benefits : DEFAULT_PATIENT_BENEFITS;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs my-6" id="patient-benefits-manager">
      {/* SECTION HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </span>
            <h3 className="font-bold text-xl text-gray-900">Patient Benefits Manager</h3>
            <span className="bg-emerald-50 text-emerald-700 text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
              PUBLIC WEBSITE SECTION
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1 max-w-2xl">
            Configure care packages, consultation guidance, and patient benefits displayed on your website. 
            Toggle publication status to show or hide individual cards anytime.
          </p>
        </div>

        {/* TOP CONTROLS & STATS */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200">
            <span className="text-gray-500">Active Cards:</span>
            <span className="font-bold text-emerald-700">{publishedCount} published</span>
            {draftCount > 0 && (
              <span className="text-amber-600 font-medium">({draftCount} draft)</span>
            )}
          </div>

          <div className="flex items-center bg-gray-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('editor')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'editor' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Manage Cards
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
            onClick={addBenefitCard}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Benefit Card</span>
          </button>

          <button
            type="button"
            onClick={loadDefaults}
            className="px-3.5 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Load Default 3 Cards</span>
          </button>

          {profile.patientBenefits !== undefined && (
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
            Drag cards or use ↑ ↓ to reorder priority
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
          {benefits.length === 0 && (
            <div className="p-6 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
              <Sparkles className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <h4 className="font-bold text-gray-900 text-sm">No Custom Patient Benefit Cards Configured</h4>
              <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                Your clinic website is currently displaying standard clinic enquiry cards (Consultation & Follow-up, Skin Care Packages, and Patient Benefits).
              </p>
              <div className="flex justify-center gap-3 mt-4">
                <button
                  type="button"
                  onClick={loadDefaults}
                  className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-emerald-700 cursor-pointer"
                >
                  Load 3 Sample Cards to Customize
                </button>
                <button
                  type="button"
                  onClick={addBenefitCard}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50 cursor-pointer"
                >
                  Create Blank Card
                </button>
              </div>
            </div>
          )}

          {benefits.map((card, index) => (
            <div 
              key={card.id} 
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
                card.published !== false 
                  ? 'border-gray-200 bg-white shadow-xs' 
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

                  {/* QUICK REORDER UP/DOWN BUTTONS */}
                  <div className="flex items-center bg-gray-100 rounded-lg p-0.5 border border-gray-200">
                    <button
                      type="button"
                      onClick={() => moveCard(index, index - 1)}
                      disabled={index === 0}
                      className="p-1 text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:hover:text-gray-500 rounded hover:bg-white transition-colors cursor-pointer disabled:cursor-not-allowed"
                      title="Move card up"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveCard(index, index + 1)}
                      disabled={index === benefits.length - 1}
                      className="p-1 text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:hover:text-gray-500 rounded hover:bg-white transition-colors cursor-pointer disabled:cursor-not-allowed"
                      title="Move card down"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>

                  <h4 className="font-bold text-sm text-gray-900 ml-1">
                    {card.title || 'Untitled Benefit Card'}
                  </h4>
                  {card.published !== false ? (
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <Eye className="w-3 h-3" /> Published
                    </span>
                  ) : (
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                      <EyeOff className="w-3 h-3" /> Draft / Hidden
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {/* PUBLISH TOGGLE */}
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={card.published !== false}
                      onChange={() => togglePublishStatus(card.id, card.published !== false)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300 cursor-pointer"
                    />
                    <span>Published on website</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => removeBenefitCard(card.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                    title="Remove benefit card"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* CARD FORM GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* TITLE & VALIDITY */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Card Title *
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      value={card.title}
                      placeholder="e.g. Consultation & Follow-up"
                      onChange={e => updateBenefit(card.id, { title: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Offer Validity / Subtitle Badge
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      value={card.validity || ''}
                      placeholder="e.g. Available for all new patients"
                      onChange={e => updateBenefit(card.id, { validity: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Description *
                    </label>
                    <textarea
                      rows={3}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      value={card.description}
                      placeholder="Clear, simple description of the care package or benefit..."
                      onChange={e => updateBenefit(card.id, { description: e.target.value })}
                    />
                  </div>
                </div>

                {/* IMAGE & CTA SETTINGS */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center justify-between">
                      <span>Image URL</span>
                      <span className="text-[10px] text-gray-400 font-normal">Approved clinic photo</span>
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-mono"
                      value={card.imageUrl || ''}
                      placeholder="https://..."
                      onChange={e => updateBenefit(card.id, { imageUrl: e.target.value })}
                    />

                    {/* PRESET IMAGE SELECTOR */}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-bold text-gray-500">Quick preset:</span>
                      {PRESET_IMAGES.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => updateBenefit(card.id, { imageUrl: preset.url })}
                          className="text-[10px] px-2 py-0.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors cursor-pointer"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Image Alt Text
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      value={card.imageAlt || ''}
                      placeholder="e.g. Doctor discussing treatment plan"
                      onChange={e => updateBenefit(card.id, { imageAlt: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Button Label
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        value={card.ctaLabel || 'Ask Our Team'}
                        placeholder="e.g. Ask About Consultation"
                        onChange={e => updateBenefit(card.id, { ctaLabel: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Button Action
                      </label>
                      <select
                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
                        value={card.ctaAction || 'enquire'}
                        onChange={e => updateBenefit(card.id, { ctaAction: e.target.value as PatientBenefitCard['ctaAction'] })}
                      >
                        <option value="enquire">Open Enquiry Modal</option>
                        <option value="consultation">Ask About Consultation</option>
                        <option value="packages">Explore Treatments (Scroll)</option>
                        <option value="booking">Book Appointment</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* HIGHLIGHT POINTS / BULLET LIST */}
              <div className="mt-4 pt-3 border-t border-gray-100">
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  Key Highlights / Included Services (Optional)
                </label>

                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {(card.benefits || []).map((point, pIdx) => (
                    <span 
                      key={pIdx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium rounded-lg"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{point}</span>
                      <button
                        type="button"
                        onClick={() => removeHighlightPoint(card.id, pIdx)}
                        className="text-emerald-600 hover:text-red-600 ml-1 font-bold cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2 max-w-md">
                  <input
                    type="text"
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="e.g. Free skin assessment"
                    value={newHighlightInputs[card.id] || ''}
                    onChange={e => setNewHighlightInputs(prev => ({ ...prev, [card.id]: e.target.value }))}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addHighlightPoint(card.id);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => addHighlightPoint(card.id)}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    + Add Point
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PREVIEW TAB */}
      {activeTab === 'preview' && (
        <div className="mt-4 p-6 bg-gray-100 rounded-2xl border border-gray-200">
          <div className="text-center mb-6">
            <span className="text-xs font-bold tracking-widest text-emerald-700 uppercase">
              PATIENT BENEFITS PREVIEW
            </span>
            <h3 className="font-bold text-2xl text-gray-900 mt-1">
              More Care, <em className="not-italic text-emerald-600">More Benefits</em>
            </h3>
            <p className="text-xs text-gray-600 max-w-md mx-auto mt-1">
              Explore the care packages and benefits available at our clinic. Contact our team to know which options are currently available for you.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayCards
              .filter(card => card.published !== false && card.title?.trim())
              .map((card) => (
                <div 
                  key={card.id}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs flex flex-col"
                >
                  <div className="relative aspect-[16/10] bg-gray-200">
                    <img 
                      src={card.imageUrl || PRESET_IMAGES[0].url} 
                      alt={card.imageAlt || card.title}
                      className="w-full h-full object-cover"
                    />
                    {card.validity && (
                      <span className="absolute top-3 left-3 bg-black/80 text-white text-[10px] font-bold px-2.5 py-1 rounded">
                        {card.validity}
                      </span>
                    )}
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-lg text-gray-900">{card.title}</h4>
                      <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">{card.description}</p>

                      {card.benefits && card.benefits.length > 0 && (
                        <ul className="mt-3 space-y-1">
                          {card.benefits.map((item, idx) => (
                            <li key={idx} className="text-xs text-gray-700 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <button
                        type="button"
                        className="w-full py-2 px-3 bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs rounded-lg flex items-center justify-center gap-1 transition-colors"
                      >
                        <span>{card.ctaLabel || 'Ask Our Team'}</span>
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
