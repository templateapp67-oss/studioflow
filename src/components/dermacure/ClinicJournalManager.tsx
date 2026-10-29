import React, { useState } from 'react';
import type { ClinicArticle, SalonProfile } from '../../types';
import { DEFAULT_CLINIC_ARTICLES } from './ClinicJournal';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  RotateCcw, 
  Sparkles, 
  CheckCircle2, 
  FileText, 
  Tag, 
  Image as ImageIcon,
  Clock,
  ArrowUpRight
} from 'lucide-react';

interface ClinicJournalManagerProps {
  profile: SalonProfile;
  setProfile: React.Dispatch<React.SetStateAction<SalonProfile>>;
}

const PRESET_JOURNAL_IMAGES = [
  {
    label: 'Dermatology & Skin',
    url: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Pigmentation Care',
    url: 'https://images.unsplash.com/photo-1512290900673-700201121d5c?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Sun Protection',
    url: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Hair Care & Scalp',
    url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Clinic Aesthetic Room',
    url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80',
  },
];

const JOURNAL_CATEGORIES = [
  'Skin Care',
  'Sun Protection',
  'Hair Care',
  'Hair & Scalp',
  'Cosmetology & Lasers',
  'General Wellness',
];

export function ClinicJournalManager({ profile, setProfile }: ClinicJournalManagerProps) {
  const articles = profile.clinicArticles || [];
  const publishedCount = articles.filter(a => a.published !== false && a.title?.trim()).length;
  const draftCount = articles.length - publishedCount;

  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);

  const updateArticle = (id: string, patch: Partial<ClinicArticle>) => {
    setProfile(prev => ({
      ...prev,
      clinicArticles: (prev.clinicArticles || []).map(a => 
        a.id === id ? { ...a, ...patch } : a
      ),
    }));
  };

  const addArticle = () => {
    const newId = `article-${Date.now()}`;
    const newArticle: ClinicArticle = {
      id: newId,
      title: 'New Educational Article',
      category: 'Skin Care',
      excerpt: 'Short summary explaining the key skin or hair care topic for readers...',
      body: `Write your educational article content here.

### Overview
Explain the skin or hair concern in simple, everyday Indian English.

### Care Tips
1. Use gentle, clinic-approved care products.
2. Protect your skin from sun exposure daily.

### When to Seek Professional Guidance
Consult a dermatologist for persistent skin or hair concerns.`,
      imageUrl: PRESET_JOURNAL_IMAGES[0].url,
      publishedAt: new Date().toISOString().split('T')[0],
      published: true,
    };

    setProfile(prev => ({
      ...prev,
      clinicArticles: [...(prev.clinicArticles || []), newArticle],
    }));
    setEditingArticleId(newId);
  };

  const removeArticle = (id: string) => {
    setProfile(prev => ({
      ...prev,
      clinicArticles: (prev.clinicArticles || []).filter(a => a.id !== id),
    }));
  };

  const togglePublishStatus = (id: string, currentStatus: boolean) => {
    updateArticle(id, { published: !currentStatus });
  };

  const loadDefaultArticles = () => {
    setProfile(prev => ({
      ...prev,
      clinicArticles: DEFAULT_CLINIC_ARTICLES,
    }));
  };

  const restoreSystemDefaults = () => {
    setProfile(prev => ({
      ...prev,
      clinicArticles: undefined,
    }));
  };

  const displayArticles = articles.length > 0 ? articles : DEFAULT_CLINIC_ARTICLES;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs my-6" id="journal-articles-manager">
      {/* SECTION HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <BookOpen className="w-4 h-4" />
            </span>
            <h3 className="font-bold text-xl text-gray-900">Skin &amp; Hair Journal Manager</h3>
            <span className="bg-emerald-50 text-emerald-700 text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
              PUBLIC WEBSITE SECTION
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1 max-w-2xl">
            Publish educational articles about common skin concerns, hair care tips, and treatment guidance. 
            Published articles appear in the Skin &amp; Hair Journal on your website.
          </p>
        </div>

        {/* TOP CONTROLS & STATS */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200">
            <span className="text-gray-500">Articles:</span>
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
              Manage Articles
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'preview' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Live Journal Preview
            </button>
          </div>
        </div>
      </div>

      {/* ACTION TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 my-4 bg-gray-50/70 p-3 rounded-xl border border-gray-200">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={addArticle}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Article</span>
          </button>

          <button
            type="button"
            onClick={loadDefaultArticles}
            className="px-3.5 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Load Standard 6 Skin &amp; Hair Articles</span>
          </button>

          {profile.clinicArticles !== undefined && (
            <button
              type="button"
              onClick={restoreSystemDefaults}
              className="px-3 py-2 text-xs font-medium text-gray-500 hover:text-gray-800 underline cursor-pointer"
            >
              Reset to System Guidance
            </button>
          )}
        </div>

        <div className="text-xs text-gray-500 flex items-center gap-1">
          <Tag className="w-3.5 h-3.5 text-gray-400" />
          <span>Article edits auto-save with your website content</span>
        </div>
      </div>

      {/* EDITOR TAB */}
      {activeTab === 'editor' && (
        <div className="space-y-4 mt-4">
          {articles.length === 0 && (
            <div className="p-6 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
              <Sparkles className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <h4 className="font-bold text-gray-900 text-sm">No Custom Journal Articles Configured</h4>
              <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                Your clinic website is currently displaying the 6 standard educational articles (Acne, Dark Spots, Sunscreen, Hair Fall, Dandruff, and Laser Hair Reduction).
              </p>
              <div className="flex justify-center gap-3 mt-4">
                <button
                  type="button"
                  onClick={loadDefaultArticles}
                  className="px-4 py-2 bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-emerald-800 cursor-pointer"
                >
                  Load 6 Standard Articles to Edit
                </button>
                <button
                  type="button"
                  onClick={addArticle}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50 cursor-pointer"
                >
                  Create Custom Blank Article
                </button>
              </div>
            </div>
          )}

          {articles.map((article, index) => {
            const isEditing = editingArticleId === article.id || articles.length === 1;

            return (
              <div 
                key={article.id} 
                className={`border rounded-2xl p-5 transition-all ${
                  article.published !== false 
                    ? 'border-gray-200 bg-white shadow-xs' 
                    : 'border-amber-200 bg-amber-50/30'
                }`}
              >
                {/* ARTICLE ITEM HEADER */}
                <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <h4 className="font-bold text-sm text-gray-900">
                      {article.title || 'Untitled Article'}
                    </h4>
                    <span className="bg-gray-100 text-gray-600 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-gray-200">
                      {article.category || 'General Care'}
                    </span>
                    {article.published !== false ? (
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
                    <button
                      type="button"
                      onClick={() => setEditingArticleId(isEditing ? null : article.id)}
                      className="px-2.5 py-1 text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors cursor-pointer"
                    >
                      {isEditing ? 'Collapse' : 'Edit Details'}
                    </button>

                    {/* PUBLISH TOGGLE */}
                    <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={article.published !== false}
                        onChange={() => togglePublishStatus(article.id, article.published !== false)}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300 cursor-pointer"
                      />
                      <span>Published</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => removeArticle(article.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                      title="Remove article"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* EXPANDED EDIT FORM */}
                {isEditing && (
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* TITLE */}
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Article Title *
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                          value={article.title}
                          placeholder="e.g. Understanding Acne and Pimples"
                          onChange={e => updateArticle(article.id, { title: e.target.value })}
                        />
                      </div>

                      {/* CATEGORY */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Category *
                        </label>
                        <select
                          className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
                          value={article.category}
                          onChange={e => updateArticle(article.id, { category: e.target.value })}
                        >
                          {JOURNAL_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* EXCERPT */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Short Introduction / Excerpt * (Displayed on the card)
                      </label>
                      <textarea
                        rows={2}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        value={article.excerpt}
                        placeholder="Brief summary explaining what readers will learn..."
                        onChange={e => updateArticle(article.id, { excerpt: e.target.value })}
                      />
                    </div>

                    {/* IMAGE URL & PRESETS */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center justify-between">
                        <span>Featured Image URL *</span>
                        <span className="text-[10px] text-gray-400 font-normal">High resolution clinic photo</span>
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-mono"
                        value={article.imageUrl || ''}
                        placeholder="https://..."
                        onChange={e => updateArticle(article.id, { imageUrl: e.target.value })}
                      />

                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold text-gray-500">Quick presets:</span>
                        {PRESET_JOURNAL_IMAGES.map((preset, pIdx) => (
                          <button
                            key={pIdx}
                            type="button"
                            onClick={() => updateArticle(article.id, { imageUrl: preset.url })}
                            className="text-[10px] px-2 py-0.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors cursor-pointer"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* FULL ARTICLE BODY */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center justify-between">
                        <span>Full Article Body Content *</span>
                        <span className="text-[10px] text-gray-400 font-normal">Supports markdown (### headings, - bullet lists, **bold**)</span>
                      </label>
                      <textarea
                        rows={8}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-mono leading-relaxed"
                        value={article.body}
                        placeholder="Write detailed, educational paragraphs with section headings..."
                        onChange={e => updateArticle(article.id, { body: e.target.value })}
                      />
                    </div>
                  </div>
                )}
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
              SKIN &amp; HAIR JOURNAL PREVIEW
            </span>
            <h3 className="font-bold text-2xl text-gray-900 mt-1">
              Simple Tips for <em className="not-italic text-emerald-700">Healthy Skin &amp; Hair</em>
            </h3>
            <p className="text-xs text-gray-600 max-w-md mx-auto mt-1">
              Read easy-to-understand articles about common skin concerns, hair care, available treatments and when to consult a dermatologist.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayArticles
              .filter(a => a.published !== false && a.title?.trim())
              .map((article) => (
                <div 
                  key={article.id}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs flex flex-col"
                >
                  <div className="relative aspect-[16/10] bg-gray-200">
                    <img 
                      src={article.imageUrl || PRESET_JOURNAL_IMAGES[0].url} 
                      alt={article.title}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-2.5 left-2.5 bg-black/80 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                      {article.category || 'General Care'}
                    </span>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-base text-gray-900 leading-snug">{article.title}</h4>
                      <p className="text-xs text-gray-600 mt-1.5 leading-relaxed line-clamp-3">{article.excerpt}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <span className="text-xs font-bold text-emerald-800 flex items-center justify-between">
                        <span>Read Full Article</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </span>
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
