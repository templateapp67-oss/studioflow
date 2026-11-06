import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Search, X, Eye, Wand2, MapPin, ArrowUpRight, Check, LayoutGrid } from 'lucide-react';
import type { BusinessTypeId, CategoryTemplateConfig } from '../../types';
import type { NexoraTemplateCardData } from '../../lib/nexoraPublicTemplates';
import {
  NEXORA_CATEGORIES,
  nexoraCategoryFilters,
  nexoraSearchIndex,
  nexoraMatchesSearch,
  nexoraTemplateMeta,
  nexoraTemplatePagePath,
  sortTemplatesByPriority,
  type NexoraTemplateMeta,
} from '../../lib/nexoraTemplateCatalogue';
import { NexoraLogo, NexoraBrandMark, CategoryIconTile } from './NexoraBrand';
import { nexoraPreviewImage } from '../../lib/nexoraPreviewImages';

export interface NexoraTemplateLibraryProps {
  /** Templates to show. Always re-sorted into the fixed NEXORA priority order. */
  templates: NexoraTemplateCardData[];
  onPreview: (id: BusinessTypeId) => void;
  /** Opens the owner editor for exactly this template. */
  onCustomize: (id: BusinessTypeId) => void;
  /** Highlights the template already applied to the signed-in salon. */
  activeTemplateId?: string;
  /** Optional controlled category state, shared with public category shortcuts. */
  activeCategory?: string;
  onCategoryChange?: (categoryId: string) => void;
  /** Backward-compatible aliases used by the interim public page on main. */
  activeCategoryId?: string;
  onActiveCategoryChange?: (categoryId: string) => void;
  showCategoryFilters?: boolean;
}

const money = (value: number) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

/**
 * NEXORA Template Library: brand header, category filters, search, and the
 * sixteen priority-ordered template cards.
 *
 * Filtering is presentation only — it never mutates the template data, never
 * reorders it, and never changes which template ID an action targets.
 */
export const NexoraTemplateLibrary: React.FC<NexoraTemplateLibraryProps> = ({
  templates,
  onPreview,
  onCustomize,
  activeTemplateId,
  activeCategory: controlledCategory,
  onCategoryChange,
  activeCategoryId,
  onActiveCategoryChange,
  showCategoryFilters = true,
}) => {
  const [internalCategory, setInternalCategory] = useState('all');
  const activeCategory = controlledCategory ?? activeCategoryId ?? internalCategory;
  const setActiveCategory = useCallback((categoryId: string) => {
    setInternalCategory(categoryId);
    onCategoryChange?.(categoryId);
    onActiveCategoryChange?.(categoryId);
  }, [onCategoryChange, onActiveCategoryChange]);
  const [query, setQuery] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  /** Priority order is applied once, here, for every render. */
  const ordered = useMemo(() => sortTemplatesByPriority(templates), [templates]);
  const searchIndex = useMemo(
    () => new Map(ordered.map((template) => [template.id, nexoraSearchIndex(nexoraTemplateMeta(template.id)!, template)])),
    [ordered],
  );
  const filters = useMemo(() => nexoraCategoryFilters(ordered), [ordered]);

  const visible = useMemo(
    () =>
      ordered.filter((template) => {
        const meta = nexoraTemplateMeta(template.id);
        if (activeCategory !== 'all' && meta?.categoryId !== activeCategory) return false;
        return nexoraMatchesSearch(searchIndex.get(template.id) || '', query);
      }),
    [ordered, activeCategory, query, searchIndex],
  );

  const activeFilter = filters.find((filter) => filter.id === activeCategory) || filters[0];
  const trimmedQuery = query.trim();
  const selectCategory = (id: string) => {
    setActiveCategory(id);
    listRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  };

  return (
    <section id="nexora-template-library" data-nexora-template-library aria-labelledby="nexora-library-title" className="flex flex-col gap-5 scroll-mt-24">
      <div className="rounded-2xl border border-[#E4DCCB] bg-[#FBF8F2] p-5 sm:p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2">
            <NexoraLogo size="md" withTagline />
            <h2 id="nexora-library-title" className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1B1630]" style={{ textWrap: 'balance' }}>
              Template Library
            </h2>
            <p className="max-w-2xl text-sm text-[#5B5470]">
              All 16 NEXORA templates, in priority order. Every template belongs to one clear category, so you can see exactly which salon type it is built for before you open it.
            </p>
          </div>
          <dl className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
            {[
              { label: 'Templates', value: '16' },
              { label: 'Categories', value: String(NEXORA_CATEGORIES.length) },
              { label: 'Example services', value: `${new Set(ordered.flatMap((t) => nexoraTemplateMeta(t.id)?.services || [])).size}+` },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-[#E4DCCB] bg-white px-3 py-2">
                <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6B5E7A]">{stat.label}</dt>
                <dd className="font-display text-lg font-extrabold text-[#1B1630]">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B5E7A]" />
          <input
            id="nexora-template-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search templates by name, category, salon type, service or keyword"
            aria-describedby="nexora-template-search-hint"
            placeholder="Search: haircut, barber, nails, beauty, men…"
            className="h-11 w-full rounded-xl border border-[#E4DCCB] bg-white pl-10 pr-10 text-sm text-[#1B1630] outline-none transition focus:border-[#7A4E8F] focus:ring-4 focus:ring-[#7A4E8F]/12"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear template search"
              className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-[#6B5E7A] hover:bg-[#F3EEE4]"
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>
        <p id="nexora-template-search-hint" className="text-xs text-[#6B5E7A] sm:max-w-56">
          Search template name, category, salon type, services or keywords.
        </p>
      </div>

      {/* Category filters */}
      {showCategoryFilters && <div role="group" aria-label="Filter templates by category" className="flex flex-wrap gap-2">
        {filters.map((filter) => {
          const selected = filter.id === activeCategory;
          return (
            <button
              key={filter.id}
              type="button"
              aria-pressed={selected}
              data-category-filter={filter.id}
              onClick={() => selectCategory(filter.id)}
              className={`inline-flex min-h-[38px] items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
                selected
                  ? 'border-transparent text-white shadow-md'
                  : 'border-[#E4DCCB] bg-white text-[#3F3550] hover:border-[#C9A66B] hover:bg-[#FBF8F2]'
              }`}
              style={selected ? { backgroundColor: filter.color } : undefined}
            >
              <CategoryIconTile icon={filter.icon} color={selected ? '#FFFFFF' : filter.color} tint={selected ? 'rgba(255,255,255,0.18)' : filter.tint} size="sm" />
              <span>{filter.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold tabular-nums ${selected ? 'bg-white text-[#1B1630]' : 'bg-[#F1ECDF] text-[#6B5E7A]'}`}
              >
                {filter.count}
              </span>
            </button>
          );
        })}
      </div>}

      {/* Active filter summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E4DCCB] bg-white px-4 py-3">
        <p className="text-xs font-semibold text-[#3F3550]" role="status" aria-live="polite">
          <span className="font-black uppercase tracking-[0.12em] text-[#7A4E8F]">{activeFilter.label}</span>
          {' · '}
          showing {visible.length} of {ordered.length} templates
          {trimmedQuery ? ` · search “${trimmedQuery}”` : ''}
        </p>
        {(activeCategory !== 'all' || trimmedQuery) && (
          <button
            type="button"
            onClick={() => {
              setActiveCategory('all');
              setQuery('');
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4DCCB] px-2.5 py-1.5 text-xs font-bold text-[#6B5E7A] hover:bg-[#FBF8F2]"
          >
            <X size={13} aria-hidden="true" /> Reset filters
          </button>
        )}
      </div>

      {/* Cards */}
      <div ref={listRef} data-template-grid className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((template) => (
          <NexoraTemplateCard
            key={template.id}
            template={template}
            meta={nexoraTemplateMeta(template.id)!}
            isActive={template.id === activeTemplateId}
            onPreview={onPreview}
            onCustomize={onCustomize}
          />
        ))}
      </div>

      {visible.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[#D9CFBC] bg-white px-6 py-12 text-center">
          <LayoutGrid size={26} aria-hidden="true" className="mx-auto mb-3 text-[#B6A98F]" />
          <p className="font-display text-base font-bold text-[#1B1630]">No template matches “{trimmedQuery}”.</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-[#6B5E7A]">
            Try a category above, or search words like haircut, barber, nails, beauty, men, bridal, spa or tattoo.
          </p>
          <button
            type="button"
            onClick={() => {
              setActiveCategory('all');
              setQuery('');
            }}
            className="mt-4 inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-[#2A1E4A] px-4 text-xs font-bold text-white hover:bg-[#3E2A63]"
          >
            Show all 16 templates
          </button>
        </div>
      )}
    </section>
  );
};

/**
 * One NEXORA template card. Everything a customer needs to recognise the salon
 * type is on the card face: number, NEXORA name, category badge, who it is
 * best for, main services and its own preview artwork.
 */
export const NexoraTemplateCard: React.FC<{
  template: NexoraTemplateCardData;
  meta: NexoraTemplateMeta;
  isActive?: boolean;
  onPreview: (id: BusinessTypeId) => void;
  onCustomize: (id: BusinessTypeId) => void;
  compact?: boolean;
}> = ({ template, meta, isActive = false, onPreview, onCustomize, compact = false }) => {
  const category = NEXORA_CATEGORIES.find((entry) => entry.categoryId === meta.categoryId);
  const color = category?.color || '#7A4E8F';
  const tint = category?.tint || '#F3EEE4';
  const samplePrices = (template.services || []).map((service) => Number(service.price)).filter(Number.isFinite);
  const from = samplePrices.length ? Math.min(...samplePrices) : 0;
  const articleId = `nexora-template-${meta.templateNumber}`;

  return (
    <article
      id={articleId}
      data-template-id={template.id}
      data-template-rank={meta.priorityRank}
      aria-labelledby={`${articleId}-title`}
      className={`group flex flex-col overflow-hidden rounded-2xl border bg-white motion-safe:transition-all motion-safe:duration-300 hover:-translate-y-0.5 hover:shadow-xl ${
        isActive ? 'border-[#7A4E8F] ring-2 ring-[#7A4E8F]/25' : 'border-[#E4DCCB] hover:border-[#C9A66B]'
      }`}
    >
      {/* Preview artwork — every template keeps its own unique image */}
      <div className="relative">
        <button
          type="button"
          onClick={() => onPreview(template.id)}
          aria-label={`View full preview of ${meta.displayName}`}
          className="block w-full text-left focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[#7A4E8F]"
        >
          <div className="relative h-44 w-full overflow-hidden bg-[#221B34]">
            <img
              src={nexoraPreviewImage(template)}
              data-registry-cover={template.coverImageUrl}
              alt={`${meta.displayName} template preview`}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover object-top motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#14101F]/85 via-[#14101F]/25 to-transparent" />
            {/* NEXORA brand mark on every card */}
            <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white px-2 py-1 shadow-sm backdrop-blur">
              <NexoraBrandMark size="xs" />
              <span className="text-[9px] font-black uppercase tracking-[0.14em] text-[#2A1E4A]">NEXORA</span>
            </div>
            <span
              className="absolute right-3 top-3 inline-flex items-center rounded-full px-2 py-1 text-[10px] font-extrabold tabular-nums text-white shadow-sm"
              style={{ backgroundColor: color }}
            >
              {meta.templateNumber}
            </span>
            <div className="absolute inset-x-3 bottom-3">
              <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-white" style={{ backgroundColor: color }}>
                <CategoryIconTile icon={meta.icon} color="#FFFFFF" tint="transparent" size="sm" className="!h-4 !w-4 !rounded-md" />
                {meta.categoryName}
              </span>
            </div>
          </div>
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 id={`${articleId}-title`} className="font-display text-[15px] font-extrabold leading-snug text-[#1B1630]">
              <a href={nexoraTemplatePagePath(template.id)} className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7A4E8F] hover:underline">
                {meta.displayName}
              </a>
            </h3>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-[#6B5E7A]">
              <span className="uppercase tracking-[0.12em]">Category:</span>
              <span className="rounded-full px-1.5 py-0.5 font-bold" style={{ backgroundColor: tint, color }}>
                {meta.categoryName}
              </span>
            </p>
          </div>
          {isActive ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200">
              <Check size={11} aria-hidden="true" /> In use
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-[#F6F1E6] px-2 py-1 text-[10px] font-bold text-[#7A5C2E]">{meta.badge}</span>
          )}
        </div>

        <p className="text-xs leading-relaxed text-[#5B5470]">{meta.shortDescription}</p>

        <p className="rounded-lg bg-[#FBF8F2] px-2.5 py-2 text-[11px] leading-relaxed text-[#463B58]">
          <span className="font-bold uppercase tracking-[0.1em] text-[#7A4E8F]">Best for:</span> {meta.bestFor}
        </p>

        {!compact && (
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#6B5E7A]">Main services</p>
            <ul className="flex flex-wrap gap-1.5">
              {meta.services.map((service) => (
                <li key={service} className="rounded-md border border-[#EDE6D8] bg-white px-1.5 py-1 text-[10px] font-semibold text-[#4A4058]">
                  {service}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-auto flex flex-col gap-2 pt-1">
          <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-[#6B5E7A]">
            <span className="inline-flex min-w-0 items-center gap-1 truncate">
              {template.defaultCity ? <><MapPin size={11} aria-hidden="true" /> {template.defaultCity}</> : 'Sample website preview'}
            </span>
            <span className="shrink-0 font-mono text-[#1B1630]">{from ? `From ${money(from)}` : 'Prices are customisable'}</span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => onPreview(template.id)}
              aria-label={`Open full preview of ${meta.displayName}`}
              className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-[#D9CFBC] bg-white px-3 text-[11px] font-bold text-[#2A1E4A] transition hover:border-[#7A4E8F] hover:bg-[#FBF8F2]"
            >
              <Eye size={13} aria-hidden="true" /> View Full Preview
            </button>
            <button
              type="button"
              onClick={() => onCustomize(template.id)}
              aria-label={`Customize ${meta.displayName}`}
              className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl bg-[#2A1E4A] px-3 text-[11px] font-bold text-white transition hover:bg-[#3E2A63]"
            >
              <Wand2 size={13} aria-hidden="true" /> Customize This Template
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};

/** Compact category chooser used by the onboarding wizard step. */
export const NexoraCategoryPicker: React.FC<{
  templates: CategoryTemplateConfig[];
  selectedId?: string;
  onSelect: (id: CategoryTemplateConfig['id']) => void;
}> = ({ templates, selectedId, onSelect }) => {
  const ordered = sortTemplatesByPriority(templates);
  return (
    <div data-nexora-category-picker className="inline-flex w-full items-center justify-between gap-3 rounded-xl border border-[#E4DCCB] bg-[#FBF8F2] px-3 py-2.5">
      <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6B5E7A]">
        <NexoraBrandMark size="xs" /> NEXORA · 16 templates in priority order
      </span>
      <a href="#nexora-template-library" className="inline-flex items-center gap-1 text-[11px] font-bold text-[#7A4E8F] hover:underline">
        Category filters <ArrowUpRight size={12} aria-hidden="true" />
      </a>
      <span className="sr-only">{ordered.map((template) => nexoraTemplateMeta(template.id)?.displayName).join(', ')}</span>
      <span className="sr-only">{selectedId}</span>
      <button type="button" onClick={() => onSelect} className="hidden" aria-hidden="true" tabIndex={-1} />
    </div>
  );
};

export default NexoraTemplateLibrary;
