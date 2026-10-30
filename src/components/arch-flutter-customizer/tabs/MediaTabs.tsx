import React from 'react';
import { ChevronDown, Star } from 'lucide-react';

import { newId, sanitizeText } from '../../../lib/archFlutterCustomizer';
import type { ArchFlutterBeforeAfter, ArchFlutterPost, ArchFlutterReel, Stylist } from '../../../types';
import { PHOTO_CATEGORIES, defaultGalleryCategory, type PhotoCategory, type SalonGalleryPhoto } from '../../../lib/photoGallery';
import {
  AddButton,
  Card,
  DeleteButton,
  EmptyNote,
  Field,
  ImageField,
  MoveButtons,
  Notice,
  NumberField,
  SelectField,
  TextArea,
  TextField,
  Toggle,
} from '../CustomizerFields';
import { IssueList, PanelHead, issueFor, issuesForTab, type TabProps } from './shared';
import { moveInList } from './MenuTabs';

/* ------------------------------------------------------------------ *
 * 7 · Featured videos & reels
 * ------------------------------------------------------------------ */

export function ReelsTab({ config, update, issues }: TabProps) {
  const reels = config.reels || [];
  const posts = config.posts || [];
  const setReels = (next: ArchFlutterReel[]) => update((draft) => ({ ...draft, reels: next }));
  const setFeatured = (patch: Partial<ArchFlutterReel>) =>
    update((draft) => ({ ...draft, featuredVideo: { ...draft.featuredVideo, ...patch } }));
  const setPosts = (next: ArchFlutterPost[]) => update((draft) => ({ ...draft, posts: next }));

  return (
    <div className="afc-panel">
      <PanelHead title="Featured videos & reels">
        Add your own work videos. Paste a YouTube or Instagram link, or upload a short clip and a 9:16 poster — the
        website plays the clip muted inside the card and links out to the original.
      </PanelHead>
      <IssueList issues={issuesForTab(issues, 'reels')} />

      <Card title="Featured video">
        <div className="afc-grid">
          <TextField label="Title" value={config.featuredVideo.title} onChange={(title) => setFeatured({ title: sanitizeText(title, 90) })} error={issueFor(issues, 'reels', 'reels')} maxLength={90} />
          <TextField label="YouTube / Instagram link" value={config.featuredVideo.sourceUrl || ''} onChange={(sourceUrl) => setFeatured({ sourceUrl })} placeholder="https://www.youtube.com/watch?v=…" type="url" />
        </div>
        <TextArea label="Caption" value={config.featuredVideo.caption} onChange={(caption) => setFeatured({ caption })} rows={2} maxLength={220} wide />
        <ImageField label="Poster image" value={config.featuredVideo.posterUrl} onChange={(posterUrl) => setFeatured({ posterUrl })} sampleSlot="reels" shape="reel" />
        <TextField
          label="Uploaded video file (optional)"
          value={config.featuredVideo.previewVideoUrl || ''}
          onChange={(previewVideoUrl) => setFeatured({ previewVideoUrl })}
          hint="An mp4 or webm link. Leave blank to only link out."
          type="url"
          wide
        />
      </Card>

      <Card
        title={`Reels (${reels.length})`}
        actions={
          <AddButton
            label="Add reel"
            onClick={() =>
              setReels([...reels, { id: newId('af-reel'), title: 'New reel', caption: 'What is happening in this clip?', posterUrl: '', sourceUrl: '' }])
            }
          />
        }
      >
        {reels.length === 0 ? (
          <EmptyNote>No reels yet. Add your own, or leave it empty — the section hides itself.</EmptyNote>
        ) : (
          <div className="afc-list">
            {reels.map((reel, index) => {
              const patch = (changes: Partial<ArchFlutterReel>) => setReels(reels.map((entry, i) => (i === index ? { ...entry, ...changes } : entry)));
              return (
                <details className="afc-list-item" key={reel.id}>
                  <summary style={{ cursor: 'pointer', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <ChevronDown size={15} aria-hidden="true" />
                    <b>{reel.title || 'Untitled reel'}</b>
                    {reel.sourceUrl && <span className="afc-chip">Link added</span>}
                    {reel.previewVideoUrl && <span className="afc-chip" data-tone="gold">Plays on the card</span>}
                  </summary>
                  <div className="afc-grid">
                    <TextField label="Title" value={reel.title} onChange={(title) => patch({ title: sanitizeText(title, 90) })} maxLength={90} />
                    <TextField label="YouTube / Instagram link" value={reel.sourceUrl || ''} onChange={(sourceUrl) => patch({ sourceUrl })} type="url" placeholder="https://www.instagram.com/reel/…" />
                  </div>
                  <TextArea label="Caption" value={reel.caption} onChange={(caption) => patch({ caption })} rows={2} maxLength={220} wide />
                  <ImageField label="Poster image (9:16)" value={reel.posterUrl} onChange={(posterUrl) => patch({ posterUrl })} sampleSlot="reels" shape="reel" />
                  <TextField label="Uploaded video file (optional)" value={reel.previewVideoUrl || ''} onChange={(previewVideoUrl) => patch({ previewVideoUrl })} type="url" wide />
                  <div className="afc-row-actions">
                    <MoveButtons index={index} total={reels.length} label={reel.title} onMove={(to) => setReels(moveInList(reels, index, to))} />
                    <DeleteButton label={`reel ${reel.title}`} onDelete={() => setReels(reels.filter((_, i) => i !== index))} />
                  </div>
                </details>
              );
            })}
          </div>
        )}
        <Notice>Reels appear in the order shown here. The first five are used on the home page rail.</Notice>
      </Card>

      <Card
        title={`Journal posts (${posts.length})`}
        chips={<span className="afc-chip">Aftercare & guides</span>}
        actions={
          <AddButton
            label="Add post"
            onClick={() =>
              setPosts([...posts, { id: newId('af-post'), title: 'New journal post', excerpt: 'One line about this post.', body: 'Write the full note here.', imageUrl: '', tag: 'Aftercare', minutes: 3 }])
            }
          />
        }
      >
        {posts.length === 0 ? (
          <EmptyNote>No journal posts. These are the aftercare notes and guides on the website.</EmptyNote>
        ) : (
          <div className="afc-list">
            {posts.map((post, index) => {
              const patch = (changes: Partial<ArchFlutterPost>) => setPosts(posts.map((entry, i) => (i === index ? { ...entry, ...changes } : entry)));
              return (
                <details className="afc-list-item" key={post.id}>
                  <summary style={{ cursor: 'pointer', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <ChevronDown size={15} aria-hidden="true" />
                    <b>{post.title}</b>
                    <span className="afc-chip">{post.tag}</span>
                    <span className="afc-chip">{post.minutes} min read</span>
                  </summary>
                  <div className="afc-grid">
                    <TextField label="Post title" value={post.title} onChange={(title) => patch({ title: sanitizeText(title, 90) })} maxLength={90} />
                    <TextField label="Tag" value={post.tag} onChange={(tag) => patch({ tag: sanitizeText(tag, 24) })} hint="Example: Aftercare, Bridal, Guide" maxLength={24} />
                    <NumberField label="Reading time (minutes)" value={post.minutes} onChange={(minutes) => patch({ minutes })} min={1} max={60} />
                  </div>
                  <TextArea label="Excerpt" value={post.excerpt} onChange={(excerpt) => patch({ excerpt })} rows={2} maxLength={220} wide />
                  <TextArea label="Full text" value={post.body} onChange={(body) => patch({ body })} rows={5} maxLength={4000} wide />
                  <ImageField label="Post image" value={post.imageUrl} onChange={(imageUrl) => patch({ imageUrl })} sampleSlot="gallery" shape="wide" />
                  <div className="afc-row-actions">
                    <MoveButtons index={index} total={posts.length} label={post.title} onMove={(to) => setPosts(moveInList(posts, index, to))} />
                    <DeleteButton label={`post ${post.title}`} onDelete={() => setPosts(posts.filter((_, i) => i !== index))} />
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * 8 · Gallery & before/after
 * ------------------------------------------------------------------ */

export function GalleryTab({ config, update, issues }: TabProps) {
  const gallery = config.gallery || [];
  const pairs = config.beforeAfter || [];
  const categoryOptions = PHOTO_CATEGORIES.map((category) => ({ value: category as PhotoCategory, label: category }));
  const setGallery = (next: SalonGalleryPhoto[]) => update((draft) => ({ ...draft, gallery: next }));
  const setPairs = (next: ArchFlutterBeforeAfter[]) => update((draft) => ({ ...draft, beforeAfter: next }));

  return (
    <div className="afc-panel">
      <PanelHead title="Gallery & before/after">
        Your work photos. Add a description to each one — it is read aloud by screen readers and used by Google image
        search.
      </PanelHead>
      <IssueList issues={issuesForTab(issues, 'gallery')} />

      <Card
        title={`Gallery photos (${gallery.length})`}
        actions={
          <AddButton
            label="Add photo"
            onClick={() => setGallery([...gallery, { id: newId('af-photo'), category: defaultGalleryCategory('lash_brow'), url: '', title: '', isDemo: false }])}
          />
        }
      >
        {gallery.length === 0 ? (
          <EmptyNote>No photos yet. Upload your own work, or use “Replace with sample image” on a new photo.</EmptyNote>
        ) : (
          <div className="afc-list">
            {gallery.map((photo, index) => {
              const patch = (changes: Partial<SalonGalleryPhoto>) => setGallery(gallery.map((entry, i) => (i === index ? { ...entry, ...changes } : entry)));
              return (
                <div className="afc-list-item" key={photo.id}>
                  <div className="afc-card-head">
                    {photo.url && <img className="afc-thumb" src={photo.url} alt="" loading="lazy" decoding="async" />}
                    <strong className="afc-card-title">{photo.title || `Photo ${index + 1}`}</strong>
                    {photo.isDemo && <span className="afc-chip">Sample photo</span>}
                    <span className="afc-spacer" />
                    <span className="afc-row-actions">
                      <MoveButtons index={index} total={gallery.length} label={`photo ${index + 1}`} onMove={(to) => setGallery(moveInList(gallery, index, to))} />
                      <DeleteButton label={`photo ${index + 1}`} onDelete={() => setGallery(gallery.filter((_, i) => i !== index))} />
                    </span>
                  </div>
                  <ImageField
                    label="Photo"
                    value={photo.url}
                    onChange={(url) => patch({ url, isDemo: false })}
                    sampleSlot="gallery"
                    shape="square"
                    allowEmpty={false}
                  />
                  <div className="afc-grid">
                    <TextField
                      label="Description (alt text)"
                      value={photo.title}
                      onChange={(title) => patch({ title: sanitizeText(title, 160) })}
                      error={issueFor(issues, 'gallery', 'gallery')}
                      hint="Example: Hybrid lash set on a client from Vaishali Nagar"
                      maxLength={160}
                    />
                    <SelectField
                      label="Group"
                      value={photo.category}
                      options={categoryOptions}
                      onChange={(category) => patch({ category })}
                      hint="Shown as the tag on the photo. “Skin” suits lash & brow work."
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card
        title={`Before & after (${pairs.length})`}
        actions={
          <AddButton
            label="Add pair"
            onClick={() => setPairs([...pairs, { id: newId('af-ba'), title: 'New transformation', alt: 'Describe the change', before: '', after: '' }])}
          />
        }
      >
        {pairs.length === 0 ? (
          <EmptyNote>No before/after pairs yet. Clients love seeing the change — add at least one.</EmptyNote>
        ) : (
          <div className="afc-list">
            {pairs.map((pair, index) => {
              const patch = (changes: Partial<ArchFlutterBeforeAfter>) => setPairs(pairs.map((entry, i) => (i === index ? { ...entry, ...changes } : entry)));
              return (
                <div className="afc-list-item" key={pair.id}>
                  <div className="afc-grid">
                    <TextField label="Title" value={pair.title} onChange={(title) => patch({ title: sanitizeText(title, 60) })} error={issueFor(issues, 'gallery', 'beforeAfter')} maxLength={60} />
                    <TextField label="Description for screen readers" value={pair.alt} onChange={(alt) => patch({ alt: sanitizeText(alt, 160) })} maxLength={160} />
                  </div>
                  <div className="afc-grid">
                    <ImageField label="Before photo" value={pair.before} onChange={(before) => patch({ before })} sampleSlot="gallery" shape="arch" allowEmpty={false} />
                    <ImageField label="After photo" value={pair.after} onChange={(after) => patch({ after })} sampleSlot="gallery" shape="arch" allowEmpty={false} />
                  </div>
                  <div className="afc-row-actions">
                    <MoveButtons index={index} total={pairs.length} label={pair.title} onMove={(to) => setPairs(moveInList(pairs, index, to))} />
                    <DeleteButton label={`before/after ${pair.title}`} onDelete={() => setPairs(pairs.filter((_, i) => i !== index))} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <Notice>Both photos are needed — a pair with only one photo is hidden on the website.</Notice>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * 9 · Team
 * ------------------------------------------------------------------ */

export function TeamTab({ config, update, issues }: TabProps) {
  const team = config.team || [];
  const setTeam = (next: Stylist[]) => update((draft) => ({ ...draft, team: next }));

  return (
    <div className="afc-panel">
      <PanelHead title="Team">
        The artists behind the work. Photos are masked into arches, so a clear face shot works best.
      </PanelHead>
      <IssueList issues={issuesForTab(issues, 'team')} />

      <Card
        title={`Artists (${team.length})`}
        actions={
          <AddButton
            label="Add artist"
            onClick={() =>
              setTeam([
                ...team,
                {
                  id: newId('af-st'),
                  name: 'New artist',
                  role: 'Lash & brow artist',
                  avatarUrl: '',
                  specialties: [],
                  rating: 5,
                  bio: '',
                  experienceYears: 3,
                },
              ])
            }
          />
        }
      >
        {team.length === 0 ? (
          <EmptyNote>No artists yet. Add yourself first — clients book people, not menus.</EmptyNote>
        ) : (
          <div className="afc-list">
            {team.map((member, index) => {
              const patch = (changes: Partial<Stylist>) => setTeam(team.map((entry, i) => (i === index ? { ...entry, ...changes } : entry)));
              return (
                <details className="afc-list-item" key={member.id} open={index === 0}>
                  <summary style={{ cursor: 'pointer', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <ChevronDown size={15} aria-hidden="true" />
                    <b>{member.name}</b>
                    <span className="afc-chip">{member.role}</span>
                    <span className="afc-chip" data-tone="gold">
                      <Star size={11} aria-hidden="true" /> {member.rating}
                    </span>
                  </summary>
                  <div className="afc-grid">
                    <TextField label="Name" value={member.name} onChange={(name) => patch({ name: sanitizeText(name, 60) })} error={issueFor(issues, 'team', 'team')} maxLength={60} />
                    <TextField label="Role" value={member.role} onChange={(role) => patch({ role: sanitizeText(role, 60) })} hint="Example: Founder & brow artist" maxLength={60} />
                    <NumberField label="Rating (out of 5)" value={member.rating} onChange={(rating) => patch({ rating })} min={0} max={5} step={0.1} />
                    <NumberField label="Experience (years)" value={member.experienceYears ?? 0} onChange={(experienceYears) => patch({ experienceYears })} min={0} max={60} />
                  </div>
                  <Field label="Specialities (one per line)" hint="Example: Brow lamination, Hybrid lashes, Microblading">
                    <textarea
                      className="afc-textarea"
                      rows={3}
                      value={(member.specialties || []).join('\n')}
                      onChange={(event) => patch({ specialties: event.target.value.split('\n').map((line) => sanitizeText(line, 40)).filter(Boolean) })}
                    />
                  </Field>
                  <TextArea label="Bio" value={member.bio || ''} onChange={(bio) => patch({ bio })} rows={3} maxLength={600} wide />
                  <ImageField label="Artist photo" value={member.avatarUrl} onChange={(avatarUrl) => patch({ avatarUrl })} sampleSlot="team" shape="arch" />
                  <div className="afc-row-actions">
                    <MoveButtons index={index} total={team.length} label={member.name} onMove={(to) => setTeam(moveInList(team, index, to))} />
                    <DeleteButton label={`artist ${member.name}`} onDelete={() => setTeam(team.filter((_, i) => i !== index))} />
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
