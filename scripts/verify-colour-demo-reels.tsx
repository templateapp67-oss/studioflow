import React from 'react';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderToStaticMarkup} from 'react-dom/server';
import {CATEGORY_TEMPLATES} from '../src/categoryTemplates';
import {INITIAL_SALON_PROFILE} from '../src/mockData';
import {createDemoVideos, showcaseVideos} from '../src/lib/showcaseVideos';
import {normalizeWorkspace} from '../src/lib/normalizeWorkspace';
import {reelSource} from '../src/lib/socialVideoSource';
import {WebsiteSections} from '../src/components/WebsiteSections';
import type {SalonProfile, SocialVideo} from '../src/types';

const GENERIC_SHORTS = ['KqLCuvMVB-k', 'nehZDeIHwJ8', 'pQ5h3rrJuDM', 'hzMSId-sxtY', 'QAC81ZkryrY'];
const COLOUR_SHORTS = ['64CRWOKFxag', '2EAPuAQ2EHo', 'rTkTQfiSRwI', 'yYBSrj1eyII', 'U9moKdpniks'];
const colourStudio = (overrides: Partial<SalonProfile> = {}): SalonProfile => ({
  ...INITIAL_SALON_PROFILE,
  businessType: 'hair_coloring',
  businessName: 'Prism & Chroma Hair Color Atelier',
  subdomain: 'prism-chroma',
  socialVideos: [],
  demoVideosInitialized: undefined,
  ...overrides,
});

/* 1 — Template 10 opens with a colour-only Shorts list: five real creators,
   colour topics, Shorts URLs and the shared hqdefault poster pattern. */
const colour = createDemoVideos('hair_coloring');
assert.equal(colour.length, 5, 'hair_coloring ships five demo reels');
assert.deepEqual(colour.map((video) => video.videoId), COLOUR_SHORTS);
assert.equal(new Set(colour.map((video) => video.videoId)).size, 5, 'five distinct posters');
for (const video of colour) {
  assert.ok(video.isDemo && !video.isOwnerVideo, `${video.title} is a demo reference`);
  assert.equal(video.categoryTag, 'SHORT');
  assert.equal(video.youtubeUrl, `https://www.youtube.com/shorts/${video.videoId}`);
  assert.equal(video.thumbnailUrl, `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`);
  assert.equal(reelSource(video)?.platform, 'YouTube');
  assert.ok(video.title.trim().length > 5 && !!video.channelTitle, `${video.videoId} keeps a title and channel`);
  assert.equal(video.id, `demo-hair_coloring-${colour.indexOf(video) + 1}`);
}
const colourCopy = colour.map((video) => `${video.title} ${video.channelTitle}`.toLowerCase()).join(' ');
for (const topic of ['balayage', 'pastel', 'money piece', 'correction', 'keratin', 'gloss'])
  assert.ok(colourCopy.includes(topic), `colour demo list covers ${topic}`);
assert.ok(!/beard|manicure|facial|massage/.test(colourCopy), 'no generic beard / nail / facial clips in Template 10');
console.log('PASS: Template 10 defaults to five colour Shorts (balayage, fashion/pastel, money piece, correction, keratin + gloss) with real channels and hqdefault posters.');

/* 2 — The other 13 templates keep the generic list untouched. */
for (const template of Object.values(CATEGORY_TEMPLATES)) {
  const videos = createDemoVideos(template.id);
  assert.equal(videos.length, 5, `${template.id} keeps five demo reels`);
  if (template.id === 'hair_coloring') assert.deepEqual(videos.map((video) => video.videoId), COLOUR_SHORTS);
  else assert.deepEqual(videos.map((video) => video.videoId), GENERIC_SHORTS, `${template.id} keeps the generic references`);
}
console.log('PASS: only hair_coloring branches; the other 13 templates still seed the identical generic Shorts list.');

/* 3 — A fresh colour studio is seeded with the colour list, never the generic one. */
const seeded = normalizeWorkspace({profile: colourStudio()});
assert.equal(seeded.profile.socialVideos.length, 5);
assert.deepEqual(seeded.profile.socialVideos.map((video) => video.videoId), COLOUR_SHORTS);
assert.ok(seeded.profile.socialVideos.every((video) => video.isDemo && !video.isOwnerVideo));
assert.equal(seeded.profile.demoVideosInitialized, true);
console.log('PASS: normalizeWorkspace seeds the colour reels for a new hair_coloring workspace.');

/* 4 — Already-published colour studios with the old generic demos are upgraded
   in place: same positions and ids, owner reels and deletions untouched. */
const ownerVideo: SocialVideo = {
  id: 'owner-reel-1',
  youtubeUrl: 'https://www.youtube.com/shorts/ownReel0001',
  videoId: 'ownReel0001',
  title: 'Aarushi balayage — real client',
  thumbnailUrl: '',
  categoryTag: 'SHORT',
  isOwnerVideo: true,
  isDemo: false,
};
const legacyDemo = (index: number, patch: Partial<SocialVideo> = {}): SocialVideo => ({
  id: `demo-hair_coloring-${index + 1}`,
  youtubeUrl: `https://www.youtube.com/shorts/${GENERIC_SHORTS[index]}`,
  videoId: GENERIC_SHORTS[index],
  title: ['Beard trim — step by step', 'Beard trim transformation', 'Gentle natural nail manicure', 'Facial massage short', 'Lifting facial massage short'][index],
  channelTitle: 'Generic reference',
  thumbnailUrl: `https://img.youtube.com/vi/${GENERIC_SHORTS[index]}/hqdefault.jpg`,
  categoryTag: 'SHORT',
  isOwnerVideo: false,
  isDemo: true,
  ...patch,
});
const published = colourStudio({socialVideos: [legacyDemo(0), ownerVideo, legacyDemo(2)], demoVideosInitialized: true});
const upgraded = showcaseVideos(published);
assert.equal(upgraded.length, 3, 'owner reels are not duplicated or dropped');
assert.equal(upgraded[0].id, 'demo-hair_coloring-1');
assert.equal(upgraded[0].videoId, COLOUR_SHORTS[0], 'position 1 now shows a colour reference');
assert.equal(upgraded[0].title, colour[0].title, 'unedited demo titles follow the colour list');
assert.equal(upgraded[1], ownerVideo, 'owner video is returned untouched');
assert.equal(upgraded[2].id, 'demo-hair_coloring-3');
assert.equal(upgraded[2].videoId, COLOUR_SHORTS[2], 'the demo at position 3 keeps its slot');
const editedDemo = showcaseVideos(colourStudio({socialVideos: [legacyDemo(1, {title: 'My saved demo title'})], demoVideosInitialized: true}));
assert.equal(editedDemo[0].videoId, COLOUR_SHORTS[1]);
assert.equal(editedDemo[0].title, 'My saved demo title', 'an owner-edited demo title survives the upgrade');
console.log('PASS: published colour studios upgrade generic demos in place; owner reels and hand-edited demo titles survive.');

/* 5 — Owner replace / delete / persist flow still works around the colour list. */
const replaced: SalonProfile = {
  ...seeded.profile,
  socialVideos: seeded.profile.socialVideos.map((video, index) =>
    index === 0
      ? {...video, youtubeUrl: 'https://www.youtube.com/shorts/ownReel0001', videoId: 'ownReel0001', title: 'Our own colour reel', isDemo: false, isOwnerVideo: true}
      : video,
  ),
};
const saved = normalizeWorkspace(JSON.parse(JSON.stringify({profile: replaced}))).profile;
assert.equal(saved.socialVideos.length, 5);
assert.equal(saved.socialVideos[0].videoId, 'ownReel0001', 'owner replacement keeps the same slot');
assert.equal(saved.socialVideos[0].title, 'Our own colour reel');
assert.equal(saved.socialVideos[0].isDemo, false);
assert.deepEqual(saved.socialVideos.slice(1).map((video) => video.videoId), COLOUR_SHORTS.slice(1), 'remaining demos stay colour references');
const deleted = normalizeWorkspace({
  profile: {...seeded.profile, socialVideos: seeded.profile.socialVideos.filter((video) => video.id !== 'demo-hair_coloring-2')},
}).profile;
assert.equal(deleted.socialVideos.length, 4);
assert.ok(!deleted.socialVideos.some((video) => video.videoId === COLOUR_SHORTS[1]), 'a deleted demo never comes back');
console.log('PASS: owner replacement keeps position and persists; deleted colour demos stay deleted after reload.');

/* 6 — The videos section renders the colour reels inside Template 10's dark
   holographic block: posters only (no iframe until hover), demo attribution,
   colour-themed eyebrow/subtitle, and unchanged copy for everyone else. */
const siteProps = {services: [], onBook: () => {}, readOnly: true};
const colourHtml = renderToStaticMarkup(<WebsiteSections {...siteProps} profile={seeded.profile} />);
assert.equal((colourHtml.match(/class="sf-reel-media"/g) || []).length, 5, 'five poster cards');
assert.equal((colourHtml.match(/<iframe/g) || []).length, 0, 'no embed loads before hover');
for (const video of colour) assert.ok(colourHtml.includes(`https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`), `poster loads for ${video.videoId}`);
assert.ok(colourHtml.includes('DEMO / REFERENCE'));
assert.ok(colourHtml.includes('pc-eyebrow'));
assert.ok(colourHtml.includes('Colour in Motion'));
assert.ok(colourHtml.includes('Balayage, pastel, gloss and colour correction'));
assert.ok(!colourHtml.includes('Beard trim') && !colourHtml.includes('Facial massage'), 'no generic demo copy on Template 10');
const genericProfile = normalizeWorkspace({
  profile: {...INITIAL_SALON_PROFILE, businessType: 'hair_salon', socialVideos: [], demoVideosInitialized: undefined},
}).profile;
const genericHtml = renderToStaticMarkup(<WebsiteSections {...siteProps} profile={genericProfile} />);
assert.ok(!genericHtml.includes('pc-eyebrow'), 'no colour eyebrow on other templates');
assert.ok(genericHtml.includes('Explore our work, transformations and studio stories.'), 'other templates keep the generic subtitle');
assert.equal((genericHtml.match(/class="sf-reel-media"/g) || []).length, 5);
const prismCss = readFileSync('src/components/prismChroma.css', 'utf8');
for (const selector of ['.pc-site .video-card', '.pc-site .sf-reel-source', '.pc-site .sf-reel-attribution', '.pc-site .sf-reel-platform'])
  assert.ok(prismCss.includes(selector), `Template 10 themes the reel block: ${selector}`);
assert.ok(!/^\s*\.video-card\s*\{/m.test(prismCss), 'Template 10 reel styles stay scoped to .pc-site');
console.log("PASS: colour reels render as posters inside .pc-site with colour-themed copy; other templates keep their generic block.");

console.log('\nAll colour demo reel checks passed.');
