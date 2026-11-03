import React from 'react';
import { Check, Eye, Wand2 } from 'lucide-react';
import type { CategoryTemplateConfig } from '../../types';
import { nexoraTemplateMeta, sortTemplatesByPriority } from '../../lib/nexoraTemplateCatalogue';
import { NexoraLogo, NexoraBrandMark, CategoryIconTile } from './NexoraBrand';

/**
 * Read-only NEXORA template gallery for the owner dashboard:
 * the salon's current template is marked, and every other template links to
 * its own preview or its own editor. Nothing is applied until the owner acts.
 */
export const NexoraTemplateGallery: React.FC<{
  templates: CategoryTemplateConfig[];
  activeTemplateId?: string;
  onPreview?: (id: CategoryTemplateConfig['id']) => void;
  onCustomize?: (id: CategoryTemplateConfig['id']) => void;
}> = ({ templates, activeTemplateId, onPreview, onCustomize }) => {
  const ordered = sortTemplatesByPriority(templates);
  const activeMeta = activeTemplateId ? nexoraTemplateMeta(activeTemplateId) : undefined;

  return (
    <section className="bg-white border border-[#E4DCCB] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col gap-5" aria-labelledby="nexora-dashboard-gallery">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2">
          <NexoraLogo size="sm" />
          <h2 id="nexora-dashboard-gallery" className="font-display font-extrabold text-xl text-[#1B1630]">
            NEXORA Template Library
          </h2>
          <p className="text-xs text-[#5B5470] max-w-xl">
            All 16 templates in priority order. Your current template is marked “In use”. Choosing another template only applies it when you click Customize.
          </p>
        </div>
        {activeMeta && (
          <div className="rounded-xl border border-[#E4DCCB] bg-[#FBF8F2] px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8A7F98]">Your template</p>
            <p className="mt-1 flex items-center gap-2 font-display text-sm font-extrabold text-[#1B1630]">
              <NexoraBrandMark size="xs" /> {activeMeta.displayName}
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-[#6B5E7A]">
              Category: {activeMeta.categoryName} · Template {activeMeta.templateNumber}
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {ordered.map((template) => {
          const meta = nexoraTemplateMeta(template.id);
          if (!meta) return null;
          const isActive = template.id === activeTemplateId;
          return (
            <article
              key={template.id}
              data-dashboard-template-id={template.id}
              className={`flex flex-col overflow-hidden rounded-xl border ${isActive ? 'border-[#7A4E8F] ring-2 ring-[#7A4E8F]/20' : 'border-[#EDE6D8]'}`}
            >
              <div className="relative h-24 overflow-hidden bg-[#221B34]">
                <img src={template.coverImageUrl} alt={`${meta.displayName} preview`} loading="lazy" className="h-full w-full object-cover object-top" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#14101F]/85 to-transparent" />
                <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/92 px-1.5 py-0.5">
                  <NexoraBrandMark size="xs" />
                  <span className="text-[8px] font-black uppercase tracking-[0.12em] text-[#2A1E4A]">NEXORA</span>
                </span>
                <span className="absolute right-2 top-2 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white tabular-nums">{meta.templateNumber}</span>
                {isActive && (
                  <span className="absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                    <Check size={9} aria-hidden="true" /> In use
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-3">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#7A4E8F]">
                  <CategoryIconTile icon={meta.icon} color="#7A4E8F" tint="#F3EEE4" size="sm" className="!h-5 !w-5 !rounded-md" />
                  {meta.categoryName}
                </p>
                <h3 className="font-display text-xs font-extrabold leading-snug text-[#1B1630]">{meta.displayName}</h3>
                <p className="text-[11px] leading-relaxed text-[#6B5E7A] line-clamp-2">{meta.shortDescription}</p>
                <div className="mt-auto flex gap-2 pt-1">
                  {onPreview && (
                    <button
                      type="button"
                      onClick={() => onPreview(template.id)}
                      aria-label={`View full preview of ${meta.displayName}`}
                      className="inline-flex min-h-[34px] flex-1 items-center justify-center gap-1 rounded-lg border border-[#D9CFBC] bg-white px-2 text-[10px] font-bold text-[#2A1E4A] hover:border-[#7A4E8F]"
                    >
                      <Eye size={12} aria-hidden="true" /> Preview
                    </button>
                  )}
                  {onCustomize && (
                    <button
                      type="button"
                      onClick={() => onCustomize(template.id)}
                      aria-label={`Customize ${meta.displayName}`}
                      className="inline-flex min-h-[34px] flex-1 items-center justify-center gap-1 rounded-lg bg-[#2A1E4A] px-2 text-[10px] font-bold text-white hover:bg-[#3E2A63]"
                    >
                      <Wand2 size={12} aria-hidden="true" /> Customize
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default NexoraTemplateGallery;
