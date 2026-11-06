/**
 * Step 06 — Add Social Video modal.
 *
 * Covers the three things the modal promises:
 *  1. Facebook Reels / Watch / page videos / fb.watch links are accepted (and
 *     broken or look-alike links rejected) alongside YouTube Shorts and
 *     Instagram Reels.
 *  2. The cover image can be pasted as a URL or uploaded as a file, with an
 *     instant preview and a Supabase upload on save.
 *  3. The required URL, preview URL, title and SHORT/REEL/FACEBOOK format are
 *     captured in form state and persisted on the saved video.
 */
import React, { useState } from 'react';
import { act, create } from 'react-test-renderer';
import assert from 'node:assert/strict';
import { INITIAL_SALON_PROFILE } from '../src/mockData';
import {
  FACEBOOK_VIDEO_PATTERNS,
  parseFacebookVideoUrl,
  reelSource,
  shortVideoSource,
  socialVideoEmbedUrl,
  socialVideoSource,
} from '../src/lib/socialVideoSource';
import { parseSocialVideo } from '../src/lib/socialVideoEmbeds';
import { SocialConnectivityStep, VIDEO_URL_PLACEHOLDER } from '../src/components/SocialConnectivityStep';
import { FeaturedReels } from '../src/components/FeaturedReels';
import { supabase } from '../src/lib/supabase';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as any).location = { origin: 'https://studioflow.test', search: '', hash: '' };
(globalThis as any).window ??= { addEventListener() {}, removeEventListener() {}, open() {} };
(globalThis as any).document ??= { hidden: false, addEventListener() {}, removeEventListener() {} };

// --- 1. URL parsing -------------------------------------------------------
assert.ok(FACEBOOK_VIDEO_PATTERNS.reel.test('https://www.facebook.com/reel/1234567890'), 'reel regex');
assert.ok(FACEBOOK_VIDEO_PATTERNS.watch.test('https://www.facebook.com/watch/?ref=share&v=1234567890'), 'watch regex');
assert.ok(FACEBOOK_VIDEO_PATTERNS.shortLink.test('https://fb.watch/AbCdEf123/'), 'fb.watch regex');
assert.ok(FACEBOOK_VIDEO_PATTERNS.share.test('https://www.facebook.com/share/r/AbCdEf123/'), 'share regex');
assert.equal(FACEBOOK_VIDEO_PATTERNS.reel.test('https://www.facebook.com/reel/abc'), false, 'reel regex rejects non-numeric ids');
assert.equal(FACEBOOK_VIDEO_PATTERNS.shortLink.test('https://evil.test/AbCdEf123/'), false, 'fb.watch regex rejects other hosts');

const accepted = [
  ['https://www.facebook.com/reel/1234567890', 'https://www.facebook.com/reel/1234567890'],
  ['https://m.facebook.com/reel/1234567890/', 'https://www.facebook.com/reel/1234567890'],
  ['https://web.facebook.com/reel/1234567890/?ref=share', 'https://www.facebook.com/reel/1234567890'],
  ['https://www.facebook.com/watch/?v=1234567890', 'https://www.facebook.com/watch/?v=1234567890'],
  ['https://facebook.com/watch?v=1234567890&ref=share', 'https://www.facebook.com/watch/?v=1234567890'],
  ['https://www.facebook.com/MySalon/videos/1234567890/', 'https://www.facebook.com/videos/1234567890'],
  ['https://www.facebook.com/videos/1234567890/', 'https://www.facebook.com/videos/1234567890'],
  ['https://www.facebook.com/share/r/AbCdEf123/', 'https://www.facebook.com/share/r/AbCdEf123/'],
  ['https://www.facebook.com/share/v/AbCdEf123/', 'https://www.facebook.com/share/v/AbCdEf123/'],
  ['https://fb.watch/AbCdEf123/', 'https://fb.watch/AbCdEf123/'],
] as const;

for (const [raw, canonical] of accepted) {
  const parsed = parseFacebookVideoUrl(raw);
  assert.ok(parsed, `Facebook link rejected: ${raw}`);
  assert.equal(parsed!.url, canonical, `canonical URL for ${raw}`);
  const source = socialVideoSource(raw);
  assert.equal(source?.platform, 'Facebook', `platform for ${raw}`);
  const short = shortVideoSource(raw);
  assert.ok(short, `reel feed rejected: ${raw}`);
  assert.equal(short!.url, canonical, `feed canonical URL for ${raw}`);
  assert.ok(reelSource({ id: 'v', isDemo: false, youtubeUrl: raw, videoId: parsed!.id, title: 't', thumbnailUrl: '', categoryTag: 'SHORT', isOwnerVideo: true }), `reelSource for ${raw}`);
  // The Iron & Ink parser must agree on every accepted Facebook shape.
  assert.equal(parseSocialVideo(raw)?.platform, 'facebook', `socialVideoEmbeds disagrees: ${raw}`);
}

const rejected = [
  'http://www.facebook.com/reel/1234567890',
  'https://facebook.com.evil.test/reel/1234567890',
  'https://www.facebook.com.evil.test/reel/1234567890',
  'https://www.facebook.com/reel/notanid',
  'https://www.facebook.com/reel/',
  'https://www.facebook.com/watch/?v=',
  'https://www.facebook.com/watch',
  'https://www.facebook.com/MySalon/posts/1234567890',
  'https://www.facebook.com/profile.php?id=1234567890',
  'https://www.facebook.com/login/',
  'https://user:pass@www.facebook.com/reel/1234567890',
  'https://www.facebook.com:8443/reel/1234567890',
  'javascript:alert(1)',
  '',
];

for (const raw of rejected) {
  assert.equal(parseFacebookVideoUrl(raw), null, `Facebook link should be rejected: ${raw}`);
  assert.equal(socialVideoSource(raw), null, `source should be rejected: ${raw}`);
  assert.equal(shortVideoSource(raw), null, `feed should be rejected: ${raw}`);
  assert.equal(parseSocialVideo(raw)?.platform, undefined, `Iron & Ink should reject: ${raw}`);
}

// Non-Facebook links keep working and never claim the Facebook platform.
assert.equal(socialVideoSource('https://www.youtube.com/shorts/abcdefghijk')?.platform, 'YouTube');
assert.equal(socialVideoSource('https://www.instagram.com/reel/MyReel_123/')?.platform, 'Instagram');
assert.equal(socialVideoSource('https://www.youtube.com/watch?v=abcdefghijk')?.platform, 'YouTube');
assert.equal(reelSource({ id: 'v', isDemo: false, youtubeUrl: 'https://www.facebook.com/reel/1234567890', videoId: '1234567890', title: 't', thumbnailUrl: '', categoryTag: 'LONG', isOwnerVideo: true }), null, 'LONG stays out of the reel feed');

// Player URLs stay platform-correct.
const facebookEmbed = socialVideoEmbedUrl(socialVideoSource('https://www.facebook.com/reel/1234567890'), { autoplay: true });
assert.ok(facebookEmbed.startsWith('https://www.facebook.com/plugins/video.php?'), 'Facebook uses the official video plugin');
assert.ok(decodeURIComponent(facebookEmbed).includes('https://www.facebook.com/reel/1234567890'), 'Facebook embed href');
assert.ok(socialVideoEmbedUrl(socialVideoSource('https://www.youtube.com/shorts/abcdefghijk'))?.startsWith('https://www.youtube-nocookie.com/embed/abcdefghijk?'), 'YouTube uses the nocookie embed');
assert.ok(socialVideoEmbedUrl(socialVideoSource('https://www.instagram.com/reel/MyReel_123/'))?.startsWith('https://www.instagram.com/reel/MyReel_123/embed/'), 'Instagram embed');
assert.equal(socialVideoEmbedUrl(null), '');
console.log('PASS: Facebook reel/watch/videos/share/fb.watch links parse to canonical URLs, unsafe variants are rejected, and both parsers agree.');

// --- 2. Modal behaviour ---------------------------------------------------
// Offline stand-ins for the Supabase session + storage bucket.
let uploadedFiles: File[] = [];
(supabase.auth as any).getUser = async () => ({ data: { user: { id: 'owner-1' } }, error: null });
(supabase.storage as any).from = () => ({
  upload: async (path: string, file: File) => {
    uploadedFiles.push(file);
    return { data: { path }, error: null };
  },
  getPublicUrl: () => ({ data: { publicUrl: 'https://cdn.studioflow.test/cover-facebook.png' } }),
});
(URL as any).createObjectURL = () => 'blob:cover-preview';
(URL as any).revokeObjectURL = () => {};

let profile: any;
function Harness() {
  const [state, setState] = useState<any>({
    ...INITIAL_SALON_PROFILE,
    businessType: 'hair_salon',
    socialVideos: [],
    demoVideosInitialized: true,
    instagramHandle: '',
    facebookPage: '',
    youtubeChannel: '',
    tiktokProfile: '',
  });
  profile = state;
  return <SocialConnectivityStep profile={state} setProfile={setState} />;
}

let tree: any;
await act(async () => { tree = create(<Harness />); });
const root = tree.root;
const text = (node: any): string =>
  typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join(' ') : (node?.children || []).map(text).join(' ');
const button = (label: string) =>
  root.findAll((node: any) => node.type === 'button' && text(node).includes(label))[0];
const byLabel = (label: string) => root.findAll((node: any) => node.props?.['aria-label'] === label)[0];
const submitForm = () => root.findAll((node: any) => node.type === 'form' && node.props.onSubmit)[0].props.onSubmit({ preventDefault() {} });
const change = (node: any, value: string) => node.props.onChange({ target: { value } });

await act(async () => button('+ Add Social Video').props.onClick());
assert.ok(root.findAll((node: any) => node.props?.role === 'dialog').length > 0, 'dialog opened');
assert.ok(text(root.findAll((node: any) => node.props?.id === 'social-video-url-help')[0]).includes('Supports YouTube Shorts, Instagram Reels, or Facebook Video/Reel links.'), 'helper copy');
assert.equal(root.findAll((node: any) => node.props?.placeholder === VIDEO_URL_PLACEHOLDER).length, 1, 'URL placeholder');
assert.ok(VIDEO_URL_PLACEHOLDER.includes('facebook.com/reel'), 'placeholder mentions Facebook');

const formatButtons = root.findAll((node: any) => node.type === 'button' && ['SHORT', 'REEL', 'FACEBOOK'].includes(text(node).trim()) && node.props['aria-pressed'] !== undefined);
assert.deepEqual(formatButtons.map((node: any) => text(node).trim()).sort(), ['FACEBOOK', 'REEL', 'SHORT'], 'three format buttons');
assert.equal(formatButtons.filter((node: any) => node.props['aria-pressed'] === true).length, 1, 'one format is selected');

const coverToggle = root.findAll((node: any) => node.props?.['aria-label'] === 'Cover image source')[0];
assert.ok(coverToggle, 'cover mode toggle');
assert.deepEqual(coverToggle.children.filter((child: any) => typeof child !== 'string').map((child: any) => text(child).replace(/link|upload/g, '').trim()).sort(), ['Paste URL', 'Upload File'], 'dual-mode cover input');
assert.ok(byLabel('Cover image URL'), 'URL cover input present by default');
assert.ok(!byLabel('Choose cover image file'), 'file input hidden until the upload tab is picked');

// Paste a Facebook watch link + cover URL + preview + title, then save.
await act(async () => change(byLabel('Cover image URL'), 'https://your-site.com/reel-cover.jpg'));
await act(async () => change(root.findAll((node: any) => node.props?.placeholder === 'https://your-site.com/reel-preview.mp4')[0], 'https://your-site.com/reel-preview.mp4'));
await act(async () => change(root.findAll((node: any) => node.props?.placeholder === 'e.g. Keratin Smooth Transformation Reel')[0], 'Facebook Watch transformation'));
await act(async () => change(root.findAll((node: any) => node.props?.id === 'social-video-url')[0], 'https://m.facebook.com/watch/?v=1234567890'));
const facebookFormat = root.findAll((node: any) => node.type === 'button' && text(node).trim() === 'FACEBOOK' && node.props['aria-pressed'] !== undefined)[0];
assert.equal(facebookFormat.props['aria-pressed'], true, 'Facebook links auto-select the FACEBOOK format');
await act(async () => submitForm());

assert.equal(profile.socialVideos.length, 1, 'video saved');
const saved = profile.socialVideos[0];
assert.equal(saved.youtubeUrl, 'https://www.facebook.com/watch/?v=1234567890');
assert.equal(saved.facebookUrl, 'https://www.facebook.com/watch/?v=1234567890');
assert.equal(saved.videoFormat, 'FACEBOOK');
assert.equal(saved.videoId, '1234567890');
assert.equal(saved.title, 'Facebook Watch transformation');
assert.equal(saved.previewVideoUrl, 'https://your-site.com/reel-preview.mp4');
assert.equal(saved.thumbnailUrl, 'https://your-site.com/reel-cover.jpg');
assert.equal(saved.categoryTag, 'SHORT');
assert.equal(saved.isOwnerVideo, true);
assert.ok(reelSource(saved), 'saved Facebook video renders in the reel feed');
assert.equal(root.findAll((node: any) => node.props?.role === 'dialog').length, 0, 'dialog closed after save');

// The storefront reel card links to Facebook and never frames a YouTube player.
let reels: any;
await act(async () => {
  reels = create(<FeaturedReels videos={[saved]} salonName="Nexora Salon" fallbackImage="https://example.com/fallback.jpg" />);
});
assert.equal(reels.root.findAllByType('iframe').length, 0, 'no YouTube iframe for a Facebook reel');
const reelLinks = reels.root.findAll((node: any) => node.type === 'a' && node.props.className === 'sf-reel-media');
assert.equal(reelLinks[0].props.href, 'https://www.facebook.com/watch/?v=1234567890');
assert.ok(reels.root.findAllByType('img').length > 0, 'poster still rendered');
assert.ok(text(reels.root.findAll((node: any) => node.props?.className === 'sf-reel-platform')[0]).includes('Facebook'), 'card is labelled Facebook');
await act(async () => reels.unmount());
console.log('PASS: the modal captures a Facebook link with cover URL, preview and title; the saved reel renders on the storefront as a Facebook card.');

// Cover upload: local file validation, instant preview, then Supabase upload on save.
await act(async () => button('+ Add Social Video').props.onClick());
await act(async () => change(root.findAll((node: any) => node.props?.id === 'social-video-url')[0], 'https://www.facebook.com/reel/2222222222'));
await act(async () => button('Upload File').props.onClick());
assert.ok(byLabel('Choose cover image file'), 'file picker shown in upload mode');
assert.equal(byLabel('Cover image URL'), undefined, 'URL input hidden in upload mode');

const fileInput = byLabel('Choose cover image file');
await act(async () => fileInput.props.onChange({ target: { value: '', files: [new File(['note'], 'cover.txt', { type: 'text/plain' })] } }));
assert.ok(text(root.findAll((node: any) => node.props?.role === 'alert')[0]).includes('JPG, PNG or WebP'), 'non-image files are rejected with a clear message');
assert.equal(root.findAll((node: any) => node.props?.alt === 'Cover image preview').length, 0, 'no preview for a rejected file');

const pngFile = new File([new Uint8Array(2048)], 'cover.png', { type: 'image/png' });
await act(async () => byLabel('Choose cover image file').props.onChange({ target: { value: '', files: [pngFile] } }));
const preview = root.findAll((node: any) => node.props?.alt === 'Cover image preview');
assert.equal(preview.length, 1, 'instant thumbnail preview for an uploaded file');
assert.equal(preview[0].props.src, 'blob:cover-preview');

await act(async () => submitForm());
await act(async () => { await Promise.resolve(); });
assert.equal(uploadedFiles.length, 1, 'cover file uploaded to the media bucket');
assert.equal(uploadedFiles[0], pngFile);
assert.equal(profile.socialVideos.length, 2, 'second video saved');
const uploaded = profile.socialVideos[0];
assert.equal(uploaded.thumbnailUrl, 'https://cdn.studioflow.test/cover-facebook.png', 'uploaded cover stored on the video');
assert.equal(uploaded.facebookUrl, 'https://www.facebook.com/reel/2222222222');
assert.equal(uploaded.videoFormat, 'FACEBOOK');
console.log('PASS: cover images upload from a local file with validation, instant preview and cloud storage URL on save.');

// Broken / unsupported links are refused and never enter the feed.
await act(async () => button('+ Add Social Video').props.onClick());
await act(async () => change(root.findAll((node: any) => node.props?.id === 'social-video-url')[0], 'https://www.facebook.com/watch'));
const beforeCount = profile.socialVideos.length;
await act(async () => submitForm());
assert.equal(profile.socialVideos.length, beforeCount, 'invalid Facebook link is not saved');
assert.ok(text(root.findAll((node: any) => node.props?.role === 'alert')[0]).includes('Facebook Video/Reel'), 'error explains the accepted Facebook formats');
await act(async () => button('Cancel').props.onClick());
assert.equal(root.findAll((node: any) => node.props?.role === 'dialog').length, 0, 'Cancel closes the dialog');

// Editing an existing Facebook video keeps its format and cover.
await act(async () => button('MANAGE / REPLACE').props.onClick());
await act(async () => button('Replace video / Edit URL & title').props.onClick());
assert.equal(root.findAll((node: any) => node.props?.id === 'social-video-url')[0].props.value, 'https://www.facebook.com/reel/2222222222');
assert.equal(root.findAll((node: any) => node.props?.['aria-label'] === 'Cover image URL')[0].props.value, 'https://cdn.studioflow.test/cover-facebook.png');
assert.equal(root.findAll((node: any) => node.type === 'button' && text(node).trim() === 'FACEBOOK' && node.props['aria-pressed'] === true).length, 1, 'saved format is preselected');
await act(async () => button('Cancel').props.onClick());

await act(async () => tree.unmount());
console.log('PASS: invalid links are refused, Cancel closes the dialog, and editing restores the saved Facebook format and cover.');
