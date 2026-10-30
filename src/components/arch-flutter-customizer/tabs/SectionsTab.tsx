import React, { useState } from 'react';
import { Eye, EyeOff, Lock, RotateCcw } from 'lucide-react';

import {
  ARCH_FLUTTER_SECTIONS,
  archFlutterSectionSpec,
  defaultArchFlutterSections,
  reorderSections,
  sanitizeText,
} from '../../../lib/archFlutterCustomizer';
import type { ArchFlutterSectionState } from '../../../types';
import { Card, Grip, Notice } from '../CustomizerFields';
import { PanelHead, type TabProps } from './shared';

/**
 * 4 · Sections — show/hide, drag-to-reorder and rename every home-page block.
 * Order is stored on the salon's own record, so no other template is affected.
 */
export function SectionsTab({ config, update }: TabProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const sections = config.sections;
  const visibleCount = sections.filter((section) => section.visible).length;

  const setSections = (next: ArchFlutterSectionState[]) => update((draft) => ({ ...draft, sections: next }));

  const patchSection = (id: string, patch: Partial<ArchFlutterSectionState>) =>
    setSections(sections.map((section) => (section.id === id ? { ...section, ...patch } : section)));

  const move = (from: number, to: number) => {
    if (to < 0 || to >= sections.length || from === to) return;
    setSections(reorderSections(sections, from, to));
  };

  return (
    <div className="afc-panel">
      <PanelHead title="Sections">
        Choose which blocks appear on this salon's home page, in which order, and what each one is called. Drag a row or
        use the arrow buttons — both work with a keyboard.
      </PanelHead>

      <Notice>
        <b>{visibleCount}</b> of <b>{sections.length}</b> sections are visible. Locked sections (hero, trust band,
        before/after, packages and the closing band) always stay — they hold the template's design together. Hiding a
        section only affects the home page; its full page stays in the menu.
      </Notice>

      <Card
        title="Home page order"
        chips={<span className="afc-chip" data-tone="gold">{ARCH_FLUTTER_SECTIONS.length} available</span>}
        actions={
          <button type="button" className="afc-btn afc-btn-sm afc-btn-ghost" onClick={() => setSections(defaultArchFlutterSections())}>
            <RotateCcw size={13} aria-hidden="true" /> Reset order & names
          </button>
        }
      >
        <div className="afc-section-list" role="list" aria-label="Home page sections">
          {sections.map((section, index) => {
            const spec = archFlutterSectionSpec(section.id);
            const label = section.label || spec.defaultLabel;
            const renamed = Boolean(section.label && section.label !== spec.defaultLabel);
            return (
              <div
                key={section.id}
                role="listitem"
                className="afc-section-row"
                draggable={!section.locked}
                aria-disabled={section.locked || undefined}
                data-dragging={dragIndex === index || undefined}
                data-drop-target={dropIndex === index || undefined}
                onDragStart={(event) => {
                  setDragIndex(index);
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData('text/plain', section.id);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                  if (dropIndex !== index) setDropIndex(index);
                }}
                onDragLeave={() => setDropIndex((current) => (current === index ? null : current))}
                onDrop={(event) => {
                  event.preventDefault();
                  if (dragIndex !== null) move(dragIndex, index);
                  setDragIndex(null);
                  setDropIndex(null);
                }}
                onDragEnd={() => {
                  setDragIndex(null);
                  setDropIndex(null);
                }}
              >
                {section.locked ? (
                  <span className="afc-section-grip" aria-hidden="true" title="Locked section">
                    <Lock size={15} />
                  </span>
                ) : (
                  <Grip label={label} />
                )}
                <span className="afc-section-name">
                  <b>{spec.panelLabel || label}</b>
                  <input
                    className="afc-input"
                    value={section.label}
                    placeholder={spec.defaultLabel}
                    maxLength={60}
                    aria-label={`Heading for the ${spec.panelLabel || spec.defaultLabel} section`}
                    onChange={(event) => patchSection(section.id, { label: sanitizeText(event.target.value, 60) })}
                  />
                  <span className="afc-hint">
                    {index + 1}. {renamed ? `Showing “${label}”` : `Showing the default heading “${spec.defaultLabel}”`}
                    {section.locked ? ' · locked' : ''}
                  </span>
                </span>
                <span className="afc-section-controls">
                  <button
                    type="button"
                    className="afc-btn afc-btn-sm afc-btn-ghost afc-icon-btn"
                    disabled={index === 0}
                    onClick={() => move(index, index - 1)}
                    aria-label={`Move ${label} up`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="afc-btn afc-btn-sm afc-btn-ghost afc-icon-btn"
                    disabled={index === sections.length - 1}
                    onClick={() => move(index, index + 1)}
                    aria-label={`Move ${label} down`}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="afc-btn afc-btn-sm"
                    aria-pressed={section.visible}
                    disabled={section.locked}
                    title={section.locked ? 'This section is part of the template design and always shows.' : undefined}
                    onClick={() => patchSection(section.id, { visible: !section.visible })}
                  >
                    {section.visible ? <Eye size={13} aria-hidden="true" /> : <EyeOff size={13} aria-hidden="true" />}
                    {section.visible ? 'Visible' : 'Hidden'}
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="How renaming works">
        <p className="afc-hint" style={{ margin: 0 }}>
          Typing a heading here changes only that section's heading on your website. Leave a box empty to keep the
          template's wording. Names are saved with your site record (site id: <b>{config.siteId || 'not saved yet'}</b>)
          and never touch other templates.
        </p>
      </Card>
    </div>
  );
}
