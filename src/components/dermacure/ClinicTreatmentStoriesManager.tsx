import React, { useState } from 'react';
import type { TreatmentStory, SalonProfile } from '../../types';
import { DEFAULT_TREATMENT_STORIES } from './ClinicTreatmentStories';
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  RotateCcw, 
  CheckCircle2, 
  Tag, 
  Video, 
  Play, 
  ArrowUp, 
  ArrowDown, 
  HelpCircle, 
  Stethoscope,
  Image as ImageIcon
} from 'lucide-react';

interface ClinicTreatmentStoriesManagerProps {
  profile: SalonProfile;
  setProfile: React.Dispatch<React.SetStateAction<SalonProfile>>;
}

const CATEGORIES = [
  'Skin Care',
  'Pigmentation',
  'Laser Care',
  'Skin Peels',
  'Hair Care',
  'Consultation Guidance',
  'Aesthetic Care'
];

const PRESET_IMAGES = [
  { label: 'Dermatology Consultation', url: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80' },
  { label: 'Pigmentation Assessment', url: 'https://images.unsplash.com/photo-1512290900673-700201121d5c?auto=format&fit=crop&w=800&q=80' },
  { label: 'Laser Treatment Room', url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80' },
  { label: 'Chemical Peel Room', url: 'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?auto=format&fit=crop&w=800&q=80' },
  { label: 'Hair & Scalp Consultation', url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80' },
  { label: 'Doctor Patient Discussion', url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80' },
];

export function ClinicTreatmentStoriesManager({ profile, setProfile }: ClinicTreatmentStoriesManagerProps) {
  const rawStories = profile.treatmentStories || [];
  const displayStories = rawStories.length > 0 ? rawStories : DEFAULT_TREATMENT_STORIES;

  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [editingStoryId, setEditingStoryId] = useState<string | null>(null);

  const publishedCount = displayStories.filter(s => s.published !== false && s.title?.trim()).length;
  const draftCount = displayStories.length - publishedCount;

  const updateStory = (id: string, patch: Partial<TreatmentStory>) => {
    setProfile(prev => {
      const current = prev.treatmentStories && prev.treatmentStories.length > 0
        ? prev.treatmentStories
        : DEFAULT_TREATMENT_STORIES;

      return {
        ...prev,
        treatmentStories: current.map(s => s.id === id ? { ...s, ...patch } : s)
      };
    });
  };

  const addStory = () => {
    const newId = `story-${Date.now()}`;
    const newStory: TreatmentStory = {
      id: newId,
      title: 'New Treatment Story',
      category: 'Skin Care',
      description: 'Short informative description explaining how this treatment works...',
      imageUrl: PRESET_IMAGES[0].url,
      videoUrl: '',
      published: true,
      order: displayStories.length + 1,
      fullContent: 'Detailed explanation of how this treatment works in a clinical setting...',
      whatToExpect: [
        'Initial skin evaluation with clinic specialist',
        'Discussion of treatment suitability and goals',
        'Post-treatment care guidelines'
      ],
      doctorQuestions: [
        'What results can I reasonably expect?',
        'How many sessions are recommended?'
      ]
    };

    setProfile(prev => ({
      ...prev,
      treatmentStories: [...(prev.treatmentStories || DEFAULT_TREATMENT_STORIES), newStory]
    }));
    setEditingStoryId(newId);
  };

  const removeStory = (id: string) => {
    setProfile(prev => ({
      ...prev,
      treatmentStories: (prev.treatmentStories || DEFAULT_TREATMENT_STORIES).filter(s => s.id !== id)
    }));
  };

  const togglePublish = (id: string, currentStatus: boolean) => {
    updateStory(id, { published: !currentStatus });
  };

  const moveStory = (index: number, direction: 'up' | 'down') => {
    const current = [...displayStories];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= current.length) return;

    const temp = current[index];
    current[index] = current[targetIndex];
    current[targetIndex] = temp;

    // Update order indices
    const updated = current.map((item, idx) => ({ ...item, order: idx + 1 }));
    setProfile(prev => ({
      ...prev,
      treatmentStories: updated
    }));
  };

  const loadDefaults = () => {
    setProfile(prev => ({
      ...prev,
      treatmentStories: DEFAULT_TREATMENT_STORIES
    }));
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs my-6" id="treatment-stories-manager">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </span>
            <h3 className="font-bold text-xl text-gray-900">Treatment Stories Manager</h3>
            <span className="bg-emerald-50 text-emerald-700 text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
              TEMPLATE 07 SECTION
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1 max-w-2xl">
            Manage image-led treatment story cards explaining clinic procedures, consultation expectations, and doctor discussion topics.
          </p>
        </div>

        {/* STATS & TABS */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200">
            <span className="text-gray-500">Stories:</span>
            <span className="font-bold text-emerald-700">{publishedCount} published</span>
            {draftCount > 0 && <span className="text-amber-600 font-medium">({draftCount} draft)</span>}
          </div>

          <div className="flex items-center bg-gray-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('editor')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'editor' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Manage Stories
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

      {/* ACTION BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 my-4 bg-gray-50/80 p-3 rounded-xl border border-gray-200">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={addStory}
            className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Treatment Story</span>
          </button>

          <button
            type="button"
            onClick={loadDefaults}
            className="px-3.5 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Load 6 Standard Treatment Stories</span>
          </button>
        </div>

        <span className="text-[11px] text-gray-500 flex items-center gap-1">
          <Tag className="w-3.5 h-3.5 text-emerald-600" />
          <span>Play buttons appear ONLY if a video URL is configured</span>
        </span>
      </div>

      {/* EDITOR LIST */}
      {activeTab === 'editor' && (
        <div className="space-y-4 mt-4">
          {displayStories.map((story, index) => {
            const isEditing = editingStoryId === story.id || displayStories.length === 1;

            return (
              <div
                key={story.id}
                className={`border rounded-2xl p-5 transition-all ${
                  story.published !== false ? 'border-gray-200 bg-white' : 'border-amber-200 bg-amber-50/20'
                }`}
              >
                {/* STORY HEADER */}
                <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3 mb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <h4 className="font-bold text-sm text-gray-900">{story.title || 'Untitled Story'}</h4>
                    <span className="bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-gray-200">
                      {story.category}
                    </span>
                    {story.videoUrl && story.videoUrl.trim().length > 5 && (
                      <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Video className="w-3 h-3" /> Video Included
                      </span>
                    )}
                    {story.published !== false ? (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Eye className="w-3 h-3" /> Published
                      </span>
                    ) : (
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <EyeOff className="w-3 h-3" /> Draft
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* REORDER BUTTONS */}
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveStory(index, 'up')}
                      className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 cursor-pointer"
                      title="Move up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={index === displayStories.length - 1}
                      onClick={() => moveStory(index, 'down')}
                      className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 cursor-pointer"
                      title="Move down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditingStoryId(isEditing ? null : story.id)}
                      className="px-2.5 py-1 text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg cursor-pointer"
                    >
                      {isEditing ? 'Collapse' : 'Edit Details'}
                    </button>

                    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={story.published !== false}
                        onChange={() => togglePublish(story.id, story.published !== false)}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Publish</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => removeStory(story.id)}
                      className="p-1 text-gray-400 hover:text-red-600 cursor-pointer"
                      title="Delete story"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* EXPANDED EDIT FORM */}
                {isEditing && (
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-700 mb-1">Story Title *</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                          value={story.title}
                          onChange={e => updateStory(story.id, { title: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Category *</label>
                        <select
                          className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                          value={story.category}
                          onChange={e => updateStory(story.id, { category: e.target.value })}
                        >
                          {CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Card Description * (Short informative overview displayed on the card)
                      </label>
                      <textarea
                        rows={2}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={story.description}
                        onChange={e => updateStory(story.id, { description: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Featured Image URL *</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                          value={story.imageUrl || ''}
                          onChange={e => updateStory(story.id, { imageUrl: e.target.value })}
                        />
                        <div className="mt-2 flex flex-wrap gap-1">
                          <span className="text-[10px] text-gray-500 font-bold">Presets:</span>
                          {PRESET_IMAGES.map((preset, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => updateStory(story.id, { imageUrl: preset.url })}
                              className="text-[10px] px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer"
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Optional Real Video URL (Leave blank if no real video is available)
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                          value={story.videoUrl || ''}
                          placeholder="https://www.youtube.com/watch?v=... or MP4 link"
                          onChange={e => updateStory(story.id, { videoUrl: e.target.value })}
                        />
                        <p className="text-[10px] text-gray-500 mt-1">
                          A play button will automatically appear on the card ONLY when a valid video URL is entered here.
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Full Treatment Narrative (Displayed in Read More modal)
                      </label>
                      <textarea
                        rows={4}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none leading-relaxed"
                        value={story.fullContent || ''}
                        onChange={e => updateStory(story.id, { fullContent: e.target.value })}
                      />
                    </div>

                    {/* WHAT TO EXPECT LIST */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        What to Expect During Consultation (One item per line)
                      </label>
                      <textarea
                        rows={3}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={(story.whatToExpect || []).join('\n')}
                        onChange={e => updateStory(story.id, { whatToExpect: e.target.value.split('\n').filter(Boolean) })}
                      />
                    </div>

                    {/* DOCTOR QUESTIONS LIST */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Questions to Discuss With Your Doctor (One question per line)
                      </label>
                      <textarea
                        rows={3}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={(story.doctorQuestions || []).join('\n')}
                        onChange={e => updateStory(story.id, { doctorQuestions: e.target.value.split('\n').filter(Boolean) })}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* LIVE PREVIEW */}
      {activeTab === 'preview' && (
        <div className="mt-4 p-6 bg-slate-50 rounded-2xl border border-gray-200">
          <div className="text-center mb-6">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-800">TREATMENT STORIES</span>
            <h3 className="font-bold text-2xl text-gray-900 mt-1">
              Get to Know <em className="not-italic text-emerald-800">Our Treatments</em>
            </h3>
            <p className="text-xs text-gray-600 max-w-md mx-auto mt-1">
              Explore how different skin and hair treatments work, what to expect during a consultation and what you should discuss with your doctor before choosing a service.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayStories
              .filter(s => s.published !== false && s.title?.trim())
              .map(story => (
                <div key={story.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs flex flex-col justify-between">
                  <div className="relative aspect-[16/10] bg-gray-100">
                    <img src={story.imageUrl} alt={story.title} className="w-full h-full object-cover" />
                    <span className="absolute top-2.5 left-2.5 bg-black/80 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                      {story.category}
                    </span>
                    {story.videoUrl && story.videoUrl.trim().length > 5 && (
                      <span className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <span className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md">
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-base text-gray-900">{story.title}</h4>
                      <p className="text-xs text-gray-600 mt-1.5 leading-relaxed line-clamp-3">{story.description}</p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-emerald-800">
                      <span>Read More</span>
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
