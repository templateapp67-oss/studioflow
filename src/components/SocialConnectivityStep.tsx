import {shortVideoSource,socialVideoSource,secureMediaUrl,videoSource} from '../lib/socialVideoSource';
import {createDemoVideos,showcaseVideos} from '../lib/showcaseVideos';
import { socialUrl } from '../lib/websiteContent';
import { uploadSalonImage } from '../lib/supabase';
import { SocialVideoCoverField, type SocialVideoCoverMode } from './SocialVideoCoverField';
import React, { useEffect, useState } from 'react';
import { SalonProfile, SocialVideo, SocialVideoFormat, VideoCategoryTag } from '../types';

export const DEFAULT_SHOWCASE_VIDEOS = createDemoVideos('nail_studio');

/** Placeholder for the required video link field (YouTube · Instagram · Facebook). */
export const VIDEO_URL_PLACEHOLDER = 'https://youtube.com/shorts/... or https://instagram.com/reel/... or https://facebook.com/reel/...';

/** Formats offered by the Add Social Video modal. All three stay in the reel feed. */
export const SOCIAL_VIDEO_FORMATS: ReadonlyArray<{ id: SocialVideoFormat; hint: string }> = [
  { id: 'SHORT', hint: 'YouTube Shorts — vertical clip shown in your reels rail.' },
  { id: 'REEL', hint: 'Instagram Reel — vertical clip shown in your reels rail.' },
  { id: 'FACEBOOK', hint: 'Facebook Reel, Watch or page video — vertical clip shown in your reels rail.' },
];

/** Format implied by the pasted link's platform. */
export function detectedVideoFormat(raw: string): SocialVideoFormat | null {
  const source = socialVideoSource(raw);
  if (!source) return null;
  return source.platform === 'Facebook' ? 'FACEBOOK' : source.platform === 'Instagram' ? 'REEL' : 'SHORT';
}

export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  return match ? match[1] : null;
}

interface SocialConnectivityStepProps {
  profile: SalonProfile;
  setProfile: React.Dispatch<React.SetStateAction<SalonProfile>>;
  onBack?: () => void;
  onContinue?: () => void;
}

export const SocialConnectivityStep: React.FC<SocialConnectivityStepProps> = ({
  profile,
  setProfile,
  onBack,
  onContinue,
}) => {
  const instagram=profile.instagramHandle||'', facebook=profile.facebookPage||'', youtube=profile.youtubeChannel||'', tiktok=profile.tiktokProfile||'';
  const isInstaConnected=!!instagram.trim(), isFbConnected=!!facebook.trim(), isYtConnected=!!youtube.trim(), isTtConnected=!!tiktok.trim();
  const videos=showcaseVideos(profile);
  const [editingVideo,setEditingVideo]=useState<SocialVideo|null>(null);
  const replaceVideo=(video:SocialVideo)=>{setEditingVideo(video);setVideoUrlInput(video.youtubeUrl);setPreviewUrlInput(video.previewVideoUrl||'');setCoverImageUrl(video.thumbnailUrl?.startsWith('https://img.youtube.com/vi/')?'':video.thumbnailUrl||'');setCoverMode('url');setCoverImageFile(null);setCoverError(null);setVideoTitleInput(video.title);setVideoFormatInput(video.videoFormat||detectedVideoFormat(video.youtubeUrl)||'SHORT');setManagingVideo(null);setIsAddModalOpen(true);setUrlError(null);};
  // Modal / Form state for Add Social Video
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [videoUrlInput, setVideoUrlInput] = useState<string>('');
  const [previewUrlInput,setPreviewUrlInput]=useState('');
  const [coverMode,setCoverMode]=useState<SocialVideoCoverMode>('url');
  const [coverImageUrl,setCoverImageUrl]=useState('');
  const [coverImageFile,setCoverImageFile]=useState<File|null>(null);
  const [coverError,setCoverError]=useState<string|null>(null);
  const [videoTitleInput, setVideoTitleInput] = useState<string>('');
  const [videoFormatInput, setVideoFormatInput] = useState<SocialVideoFormat>('SHORT');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [isSavingVideo, setIsSavingVideo] = useState<boolean>(false);
  const [addSuccessMessage, setAddSuccessMessage] = useState<string | null>(null);

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setUrlError(null);
    setCoverError(null);
  };

  // Escape closes the Add Social Video dialog (kept DOM-safe for SSR/tests).
  useEffect(() => {
    if (!isAddModalOpen || typeof window === 'undefined') return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeAddModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isAddModalOpen]);

  // Manage Video modal state
  const [managingVideo, setManagingVideo] = useState<SocialVideo | null>(null);
  const [activeTabFilter, setActiveTabFilter] = useState<'ALL' | 'YOURS' | 'SHOWCASE'>('ALL');

  // Preview video player state
  const [previewActiveVideo, setPreviewActiveVideo] = useState<SocialVideo | null>(null);

  // Synchronize state back to profile
  const syncToProfile = (
    updatedInsta: string,
    updatedFb: string,
    updatedYt: string,
    updatedTt: string,
    updatedVids: SocialVideo[]
  ) => {
    setProfile((prev) => ({
      ...prev,
      instagramHandle: updatedInsta,
      facebookPage: updatedFb,
      youtubeChannel: updatedYt,
      tiktokProfile: updatedTt,
      socialVideos: updatedVids,
      demoVideosInitialized:true,
    }));
  };

  const handleConnectPlatform = (platform: 'instagram'|'facebook'|'youtube'|'tiktok') => {
    const values={instagram,facebook,youtube,tiktok};const url=socialUrl(values[platform],platform);
    if(!url){setUrlError('Enter your actual social profile URL or handle first.');return;}
    setUrlError(null);window.open(url,'_blank','noopener,noreferrer');
  };
  const handleAddVideoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingVideo) return;
    setUrlError(null);
    setCoverError(null);

    const source = shortVideoSource(videoUrlInput);
    if (!source) {
      setUrlError('Paste a YouTube Shorts, Instagram Reel or Facebook Video/Reel link — e.g. youtube.com/shorts/…, instagram.com/reel/…, facebook.com/reel/…, facebook.com/watch/?v=… or fb.watch/…. Full-length videos are not supported here.');
      return;
    }

    if (previewUrlInput.trim() && !secureMediaUrl(previewUrlInput)) {
      setUrlError('The short preview URL must start with https://.');
      return;
    }
    if (coverMode === 'url' && coverImageUrl.trim() && !secureMediaUrl(coverImageUrl)) {
      setCoverError('The cover image URL must start with https://.');
      return;
    }
    if (coverMode === 'upload' && !coverImageFile) {
      setCoverError('Choose a cover image file, or switch back to “Paste URL”.');
      return;
    }

    // Uploaded covers go to the Supabase media bucket on save; URL covers are
    // normalised through secureMediaUrl so only https images reach the site.
    let coverUrl = coverMode === 'url' ? secureMediaUrl(coverImageUrl) : '';
    if (coverMode === 'upload' && coverImageFile) {
      setIsSavingVideo(true);
      try {
        coverUrl = await uploadSalonImage(coverImageFile);
      } catch (error) {
        setCoverError(error instanceof Error ? error.message : 'Could not upload the cover image. Try again or paste an image URL.');
        setIsSavingVideo(false);
        return;
      }
      setIsSavingVideo(false);
    }

    const title = videoTitleInput.trim() || `Client Transformation Reel #${videos.length + 1}`;
    const newVideo: SocialVideo = {
      id: editingVideo?.id || `vid-owner-${Date.now()}`,
      isDemo:false,
      youtubeUrl: source.url,
      facebookUrl: source.platform === 'Facebook' ? source.url : '',
      videoFormat: videoFormatInput,
      videoId: source.id,
      previewVideoUrl:secureMediaUrl(previewUrlInput),
      title,
      channelTitle: profile?.businessName || 'Your Salon Channel',
      thumbnailUrl: coverUrl
        || (source.platform === 'YouTube' ? `https://img.youtube.com/vi/${source.id}/hqdefault.jpg` : '')
        || (editingVideo && !editingVideo.thumbnailUrl?.startsWith('https://img.youtube.com/vi/') ? editingVideo.thumbnailUrl : '')
        || profile.coverImageUrl
        || '',
      categoryTag: 'SHORT',
      isOwnerVideo: true, // "yours"
      views: '',
      transformationTag: 'Client Transformation'
    };

    const updated = editingVideo ? videos.map(video=>video.id===editingVideo.id?newVideo:video) : [newVideo, ...videos];
    syncToProfile(instagram, facebook, youtube, tiktok, updated);

    setVideoUrlInput('');setPreviewUrlInput('');setCoverImageUrl('');
    setCoverMode('url');setCoverImageFile(null);setCoverError(null);
    setVideoTitleInput('');setVideoFormatInput('SHORT');
    setIsAddModalOpen(false);
    setAddSuccessMessage(editingVideo?'Video replaced successfully on your website.':'New social video added successfully to your website feed!');setEditingVideo(null);
    setTimeout(() => setAddSuccessMessage(null), 4000);
  };

  const handleDeleteVideo = (id: string) => {
    const updated = videos.filter((v) => v.id !== id);
    syncToProfile(instagram, facebook, youtube, tiktok, updated);
    if (managingVideo?.id === id) setManagingVideo(null);
  };

  const handleUpdateCategoryTag = (id: string, tag: VideoCategoryTag) => {
    const updated = videos.map((v) => (v.id === id ? { ...v, categoryTag: tag } : v));
    syncToProfile(instagram, facebook, youtube, tiktok, updated);
    if (managingVideo?.id === id) {
      setManagingVideo((prev) => (prev ? { ...prev, categoryTag: tag } : null));
    }
  };

  const handleToggleOwnerStatus = (id: string) => {
    const updated = videos.map((v) => (v.id === id ? { ...v, isOwnerVideo: !v.isOwnerVideo } : v));
    syncToProfile(instagram, facebook, youtube, tiktok, updated);
    if (managingVideo?.id === id) {
      setManagingVideo((prev) => (prev ? { ...prev, isOwnerVideo: !prev.isOwnerVideo } : null));
    }
  };

  // Dynamically compute count breakdown
  const ownerCount = videos.filter((v) => v.isOwnerVideo).length;
  const showcaseCount = videos.filter((v) => !v.isOwnerVideo).length;

  // Filter list
  const filteredVideos = videos.filter((v) => {
    if (activeTabFilter === 'YOURS') return v.isOwnerVideo;
    if (activeTabFilter === 'SHOWCASE') return !v.isOwnerVideo;
    return true;
  });

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
      {/* HEADER CONTROLS: BRANDING, STEP PROGRESS, STATUS & SECTION DROPDOWN */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#b0004a] to-[#d81b60] text-white flex items-center justify-center font-display font-black text-xl shadow-md shrink-0">
            N
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold text-lg text-gray-900 tracking-tight">NEXORA</span>
              <span className="text-[10px] font-mono font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md border border-gray-200">BUILDER v2.4</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <select 
                value="06"
                onChange={() => {}}
                className="text-xs font-bold font-mono text-[#b0004a] bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer"
              >
                <option value="06">OWNER SETUP 06 — Socials & Reels</option>
                <option value="01">OWNER SETUP 01 — Salon Basics</option>
                <option value="02">OWNER SETUP 02 — Category Templates</option>
                <option value="03">OWNER SETUP 03 — AI Bio & Story</option>
                <option value="04">OWNER SETUP 04 — Service Menu</option>
                <option value="05">OWNER SETUP 05 — Photo Gallery</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-center">
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-xl">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Saved ✓</span>
          </div>
          <div className="bg-gray-900 text-white text-xs font-mono font-bold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-xs">
            <span className="text-rose-400">Step 6</span>
            <span className="text-gray-500">of</span>
            <span>14</span>
          </div>
        </div>
      </div>

      {/* STEP TITLE HEADER */}
      <div className="flex flex-col gap-1 bg-gradient-to-r from-rose-50/50 via-white to-purple-50/30 p-5 rounded-2xl border border-gray-200/80">
        <span className="font-mono-caps text-xs font-bold text-[#b0004a] tracking-widest uppercase flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#b0004a] animate-pulse" />
          <span>STEP 06 • SOCIAL CONNECTIVITY</span>
        </span>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
          Connect your social media
        </h1>
        <p className="text-gray-600 text-xs sm:text-sm max-w-3xl leading-relaxed">
          Add your profiles and short videos. They'll appear directly on your website to build social proof and showcase real client transformations.
        </p>
      </div>

      {addSuccessMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-2xl flex items-center gap-3 text-xs font-bold shadow-xs animate-fade-in">
          <span className="material-symbols-outlined text-emerald-600 text-lg">check_circle</span>
          <span>{addSuccessMessage}</span>
        </div>
      )}

      {/* TWO-COLUMN INTERACTIVE SETUP GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ============================================================ */}
        {/* LEFT PANEL: SOCIAL SETUP CONTROLS */}
        {/* ============================================================ */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* SUB-SECTION 1: SOCIAL PROFILES */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-xl">share</span>
                </div>
                <div>
                  <h2 className="font-display font-bold text-base text-gray-900">
                    Social Profiles
                  </h2>
                  <p className="text-xs text-gray-500">
                    Enter your official social media profile URLs
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-mono font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                4 Platforms
              </span>
            </div>

            <div className="flex flex-col gap-4">
              {/* 1. Instagram Profile Input */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-gray-50/80 border border-gray-200">
                <div className="flex items-center gap-2.5 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center text-xs font-bold shadow-xs shrink-0">
                    IG
                  </div>
                  <div className="flex-1">
                    <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block">
                      Instagram Profile
                    </label>
                    <input
                      type="text"
                      value={instagram}
                      onChange={(e) => {
                        syncToProfile(e.target.value, facebook, youtube, tiktok, videos);
                      }}
                      placeholder="https://instagram.com/pinkynails.studio"
                      className="w-full text-xs font-mono bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {isInstaConnected ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg">
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      Link saved
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-gray-500 bg-gray-200 px-2.5 py-1 rounded-lg">
                      No profile link
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleConnectPlatform('instagram')}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-black text-white transition-colors cursor-pointer shadow-xs"
                  >
                    {isInstaConnected ? 'Update' : 'Connect'}
                  </button>
                </div>
              </div>

              {/* 2. Facebook Page/Profile Input */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-gray-50/80 border border-gray-200">
                <div className="flex items-center gap-2.5 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-xs shrink-0">
                    FB
                  </div>
                  <div className="flex-1">
                    <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block">
                      Facebook Page/Profile
                    </label>
                    <input
                      type="text"
                      value={facebook}
                      onChange={(e) => {
                        syncToProfile(instagram, e.target.value, youtube, tiktok, videos);
                      }}
                      placeholder="https://facebook.com/pinkynailsstudio"
                      className="w-full text-xs font-mono bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {isFbConnected ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg">
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      Link saved
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-gray-500 bg-gray-200 px-2.5 py-1 rounded-lg">
                      No profile link
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleConnectPlatform('facebook')}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-black text-white transition-colors cursor-pointer shadow-xs"
                  >
                    {isFbConnected ? 'Update' : 'Connect'}
                  </button>
                </div>
              </div>

              {/* 3. YouTube Channel Input */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-gray-50/80 border border-gray-200">
                <div className="flex items-center gap-2.5 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center text-xs font-bold shadow-xs shrink-0">
                    YT
                  </div>
                  <div className="flex-1">
                    <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block">
                      YouTube Channel
                    </label>
                    <input
                      type="text"
                      value={youtube}
                      onChange={(e) => {
                        syncToProfile(instagram, facebook, e.target.value, tiktok, videos);
                      }}
                      placeholder="https://youtube.com/@pinkynails"
                      className="w-full text-xs font-mono bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {isYtConnected ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg">
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      Link saved
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-gray-500 bg-gray-200 px-2.5 py-1 rounded-lg">
                      No profile link
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleConnectPlatform('youtube')}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-black text-white transition-colors cursor-pointer shadow-xs"
                  >
                    {isYtConnected ? 'Update' : 'Connect'}
                  </button>
                </div>
              </div>

              {/* 4. TikTok Profile Input */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-gray-50/80 border border-gray-200">
                <div className="flex items-center gap-2.5 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center text-xs font-bold shadow-xs shrink-0 border border-gray-800">
                    TT
                  </div>
                  <div className="flex-1">
                    <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block">
                      TikTok Profile
                    </label>
                    <input
                      type="text"
                      value={tiktok}
                      onChange={(e) => {
                        syncToProfile(instagram, facebook, youtube, e.target.value, videos);
                      }}
                      placeholder="https://tiktok.com/@pinkynails"
                      className="w-full text-xs font-mono bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-900 text-gray-900"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {isTtConnected ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg">
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      Link saved
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-gray-500 bg-gray-200 px-2.5 py-1 rounded-lg">
                      No profile link
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleConnectPlatform('tiktok')}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-black text-white transition-colors cursor-pointer shadow-xs"
                  >
                    {isTtConnected ? 'Update' : 'Connect'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SUB-SECTION 2: SHOW YOUR WORK */}
          <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white border border-purple-800/40 rounded-2xl p-5 sm:p-6 shadow-md flex flex-col gap-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <span className="material-symbols-outlined text-9xl text-white">movie</span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400 text-xl">auto_videocam</span>
                <h3 className="font-display font-bold text-lg text-white">
                  Show Your Work
                </h3>
              </div>
              <p className="text-xs text-purple-200 mt-1 leading-relaxed">
                Add a YouTube Short, Instagram Reel or Facebook Reel/Watch link. Full-length videos stay out of this feed.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {setEditingVideo(null);setVideoUrlInput('');setPreviewUrlInput('');setCoverImageUrl('');setCoverMode('url');setCoverImageFile(null);setCoverError(null);setVideoTitleInput('');setVideoFormatInput('SHORT');setUrlError(null);setIsAddModalOpen(true);}}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-[#b0004a] to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-base">add_circle</span>
                <span>+ Add Social Video</span>
              </button>
            </div>
          </div>

          {/* SUB-SECTION 3: VIDEO MANAGEMENT (OWNER VIEW) */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-display font-bold text-base text-gray-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-red-600 text-lg">play_circle</span>
                  <span>Video Management (Owner View)</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Manage your website video gallery & showcase transformations
                </p>
              </div>

              {/* Dynamic Counters Breakdown (e.g., 0 yours · 10 showcase) */}
              <div className="inline-flex items-center gap-2 bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-xl font-mono text-xs font-bold text-gray-800 shrink-0">
                <span className="text-[#b0004a]">{ownerCount} yours</span>
                <span className="text-gray-300">·</span>
                <span className="text-purple-700">{showcaseCount} showcase</span>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
              <button
                type="button"
                onClick={() => setActiveTabFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  activeTabFilter === 'ALL'
                    ? 'bg-slate-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All Videos ({videos.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTabFilter('YOURS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  activeTabFilter === 'YOURS'
                    ? 'bg-[#b0004a] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Yours ({ownerCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTabFilter('SHOWCASE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  activeTabFilter === 'SHOWCASE'
                    ? 'bg-purple-700 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Showcase ({showcaseCount})
              </button>
            </div>

            {/* Managed Video List */}
            <div className="flex flex-col gap-3 max-h-[420px] overflow-y-auto pr-1">
              {filteredVideos.length === 0 ? (
                <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-xs">
                  No videos found in this view. Click <strong>+ Add Social Video</strong> above to paste a YouTube link!
                </div>
              ) : (
                filteredVideos.map((vid) => (
                  <div
                    key={vid.id}
                    className="p-3 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-white hover:border-gray-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Thumbnail */}
                      <div className="w-20 h-14 rounded-lg bg-gray-900 relative overflow-hidden shrink-0 border border-gray-200">
                        <img
                          src={vid.thumbnailUrl}
                          alt={vid.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <span className="material-symbols-outlined text-white text-lg drop-shadow-xs">play_arrow</span>
                        </div>
                        {vid.isOwnerVideo && (
                          <span className="absolute top-1 left-1 bg-[#b0004a] text-white text-[9px] font-mono font-bold px-1 rounded">
                            YOURS
                          </span>
                        )}
                      </div>

                      {/* Video Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          {/* Tag Category Badge */}
                          <span
                            className={`text-[9px] font-mono font-extrabold uppercase px-2 py-0.5 rounded text-white ${
                              vid.categoryTag === 'SHORT'
                                ? 'bg-rose-600'
                                : vid.categoryTag === 'SHOWCASE'
                                ? 'bg-sky-600'
                                : 'bg-purple-600'
                            }`}
                          >
                            {vid.categoryTag}
                          </span>
                          <span className="text-[10px] text-gray-500 font-mono">
                            {vid.channelTitle || 'YouTube'}
                          </span>
                        </div>
                        <h4 className="font-bold text-xs text-gray-900 truncate">
                          {vid.title}
                        </h4>
                        <p className="text-[10px] text-gray-500 truncate mt-0.5">
                          {vid.isDemo?'Demo / Reference · Replace with your own video':vid.transformationTag || 'Owner video'}{vid.views?` · ${vid.views}`:''}
                        </p>
                      </div>
                    </div>

                    {/* Manage Button */}
                    <div className="shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => setManagingVideo(vid)}
                        className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 text-gray-800 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                      >
                        <span className="material-symbols-outlined text-sm">settings</span>
                        <span>MANAGE / REPLACE</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* RIGHT PANEL: INTERACTIVE LIVE WEBSITE PREVIEW */}
        {/* ============================================================ */}
        <div className="lg:col-span-5 flex flex-col gap-4 sticky top-20">
          <div className="bg-slate-950 text-white border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col relative">
            
            {/* Mock Device Title & URL Bar */}
            <div className="bg-slate-900/95 px-4 py-2.5 border-b border-slate-800 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 font-bold ml-2">
                    LIVE WEBSITE PREVIEW
                  </span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Sync
                </span>
              </div>

              {/* Simulated Client-Facing URL Bar */}
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] font-mono text-slate-400">
                <span className="material-symbols-outlined text-xs text-emerald-400">lock</span>
                <span className="truncate text-slate-300">
                  final-new-app-templete.vercel.app/{profile.slug || 'pinky-nails-studio'}
                </span>
                <span className="material-symbols-outlined text-xs text-slate-500 ml-auto">refresh</span>
              </div>
            </div>

            {/* Simulated Live Website Container */}
            <div className="p-4 sm:p-5 flex flex-col gap-5 bg-slate-950 min-h-[580px] max-h-[720px] overflow-y-auto relative text-slate-100">
              
              {/* 1. TOP ANNOUNCEMENT & STATUS BAR */}
              <div className="bg-gradient-to-r from-rose-950/80 via-purple-950/80 to-slate-900 border border-rose-500/20 p-2.5 rounded-xl flex items-center justify-between text-[10px] font-mono">
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    OPEN NOW
                  </span>
                  <span className="text-slate-300 truncate hidden sm:inline">
                    Elevate Your Beauty • Premium Hair & Nail Art Sanctuary
                  </span>
                </div>

                {/* Language Switcher */}
                <div className="flex items-center gap-1 text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800 shrink-0">
                  <span className="text-white font-bold">EN</span>
                  <span>|</span>
                  <span className="hover:text-white cursor-pointer">HI</span>
                  <span>|</span>
                  <span className="hover:text-white cursor-pointer">FR</span>
                </div>
              </div>

              {/* 2. CLIENT WEBSITE HEADER BAR */}
              <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl flex flex-col gap-2.5 shadow-md">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#b0004a] to-[#d81b60] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                      {profile?.businessName ? profile.businessName.charAt(0) : 'P'}
                    </div>
                    <span className="font-display font-extrabold text-sm text-white tracking-tight truncate">
                      {profile?.businessName || 'Pinky Nails Studio'}
                    </span>
                  </div>

                  {/* Primary [BOOK APPOINTMENT] CTA Button */}
                  <button
                    type="button"
                    onClick={() => alert('Simulated client appointment booking modal triggered!')}
                    className="bg-[#b0004a] hover:bg-[#d81b60] text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1 shrink-0 cursor-pointer transition-all"
                  >
                    <span>BOOK APPOINTMENT</span>
                    <span className="material-symbols-outlined text-xs">arrow_forward</span>
                  </button>
                </div>

                {/* Client Website Navigation Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto text-[10px] font-bold font-mono text-slate-400 border-t border-slate-800/80 pt-2 no-scrollbar">
                  <span className="text-rose-400 bg-rose-950/60 border border-rose-500/30 px-2 py-0.5 rounded">HOME</span>
                  <span className="hover:text-white cursor-pointer transition-colors px-1.5 py-0.5">SERVICES</span>
                  <span className="hover:text-white cursor-pointer transition-colors px-1.5 py-0.5">OFFERS</span>
                  <span className="hover:text-white cursor-pointer transition-colors px-1.5 py-0.5">GALLERY</span>
                  <span className="hover:text-white cursor-pointer transition-colors px-1.5 py-0.5">ABOUT</span>
                  <span className="hover:text-white cursor-pointer transition-colors px-1.5 py-0.5">TEAM</span>
                  <span className="hover:text-white cursor-pointer transition-colors px-1.5 py-0.5">CONTACT</span>
                  <span className="hover:text-white cursor-pointer transition-colors px-1.5 py-0.5">MY BOOKINGS</span>
                </div>
              </div>

              {/* 3. CONNECTED SOCIAL MEDIA HANDLES HUB */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col gap-2">
                <span className="text-[10px] font-mono uppercase text-amber-400 tracking-wider font-bold">
                  CONNECTED SOCIAL HANDLES
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {instagram && (
                    <a href={instagram} target="_blank" rel="noreferrer" className="text-[10px] font-mono bg-gradient-to-r from-amber-500/20 to-rose-500/20 text-rose-300 border border-rose-500/30 px-2.5 py-1 rounded-full flex items-center gap-1">
                      <span>IG</span>
                      <span>@{instagram.split('/').pop() || 'pinkynails.studio'}</span>
                    </a>
                  )}
                  {facebook && (
                    <a href={facebook} target="_blank" rel="noreferrer" className="text-[10px] font-mono bg-blue-950/60 text-blue-300 border border-blue-500/30 px-2.5 py-1 rounded-full flex items-center gap-1">
                      <span>FB</span>
                      <span>Facebook</span>
                    </a>
                  )}
                  {youtube && (
                    <a href={youtube} target="_blank" rel="noreferrer" className="text-[10px] font-mono bg-red-950/60 text-red-300 border border-red-500/30 px-2.5 py-1 rounded-full flex items-center gap-1">
                      <span>YT</span>
                      <span>YouTube</span>
                    </a>
                  )}
                  {tiktok && (
                    <a href={tiktok} target="_blank" rel="noreferrer" className="text-[10px] font-mono bg-slate-800 text-slate-200 border border-slate-700 px-2.5 py-1 rounded-full flex items-center gap-1">
                      <span>TT</span>
                      <span>TikTok</span>
                    </a>
                  )}
                  {!instagram && !facebook && !youtube && !tiktok && (
                    <span className="text-[11px] text-slate-500 italic">
                      No handles connected yet. Enter profile links on the left!
                    </span>
                  )}
                </div>
              </div>

              {/* 4. DYNAMIC GALLERY SECTION 1: "THE EDIT, ON FILM" (YouTube Shorts Reel) */}
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <div>
                    <span className="text-[9px] font-mono uppercase text-rose-400 font-bold tracking-widest block">
                      FEATURED REELS
                    </span>
                    <h5 className="font-display font-extrabold text-xs text-white flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-rose-500 text-base">play_circle</span>
                      <span>The edit, on film</span>
                    </h5>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    {videos.filter(v => v.categoryTag === 'SHORT').length} Shorts
                  </span>
                </div>

                {/* Horizontal / Grid Reels Display */}
                <div className="grid grid-cols-2 gap-2.5">
                  {videos.filter(v => v.categoryTag === 'SHORT').slice(0, 4).map((v) => (
                    <div
                      key={v.id}
                      onClick={() => setPreviewActiveVideo(v)}
                      className="group relative rounded-xl bg-slate-900 border border-slate-800 overflow-hidden cursor-pointer hover:border-rose-500/60 transition-all flex flex-col justify-between h-48 shadow-md"
                    >
                      <img
                        src={v.thumbnailUrl}
                        alt={v.title}
                        className="absolute inset-0 w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

                      {/* Top Badges */}
                      <div className="relative z-10 p-2 flex justify-between items-start">
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded text-white bg-rose-600 shadow-xs">
                          SHORT
                        </span>
                        {v.isOwnerVideo && (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#b0004a] text-white">
                            YOURS
                          </span>
                        )}
                      </div>

                      {/* Play Icon Center */}
                      <div className="relative z-10 self-center w-9 h-9 rounded-full bg-white/25 backdrop-blur-md border border-white/50 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                        <span className="material-symbols-outlined text-lg ml-0.5">play_arrow</span>
                      </div>

                      {/* Bottom Title & Views */}
                      <div className="relative z-10 p-2 bg-slate-950/80 backdrop-blur-xs border-t border-slate-800/60">
                        <p className="text-[11px] font-bold text-white truncate leading-snug">
                          {v.title}
                        </p>
                        <div className="flex items-center justify-between text-[9px] font-mono text-slate-300 mt-0.5">
                          <span>{v.transformationTag || 'Transformation'}</span>
                          <span className="text-rose-300 font-bold">{v.views || 'Short'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5. DYNAMIC GALLERY SECTION 2: "WEEKLY TOP VIDEOS" (Showcase & Long Videos) */}
              <div className="flex flex-col gap-2.5 pt-1">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <div>
                    <span className="text-[9px] font-mono uppercase text-sky-400 font-bold tracking-widest block">
                      FEATURED SHOWCASE
                    </span>
                    <h5 className="font-display font-extrabold text-xs text-white flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sky-400 text-base">video_library</span>
                      <span>Weekly Top Videos</span>
                    </h5>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    {videos.filter(v => v.categoryTag !== 'SHORT').length} Showcase
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  {videos.filter(v => v.categoryTag !== 'SHORT').slice(0, 3).map((v) => (
                    <div
                      key={v.id}
                      onClick={() => setPreviewActiveVideo(v)}
                      className="group p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-sky-500/50 cursor-pointer transition-all flex items-center gap-3 shadow-sm"
                    >
                      <div className="relative w-20 h-14 rounded-lg overflow-hidden shrink-0 border border-slate-800">
                        <img
                          src={v.thumbnailUrl}
                          alt={v.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <span className="w-6 h-6 rounded-full bg-white/80 text-black flex items-center justify-center text-xs">
                            ▶
                          </span>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-500/30">
                            {v.categoryTag}
                          </span>
                          <span className="text-[9px] font-mono text-slate-400 truncate">
                            {v.channelTitle}
                          </span>
                        </div>
                        <h6 className="font-bold text-xs text-white truncate leading-tight">
                          {v.title}
                        </h6>
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                          {v.views || '12.4k views'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 6. INTERACTIVE FLOATING QUICK-CONTACT BUTTONS */}
              <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-20">
                <button
                  type="button"
                  title="Call Salon"
                  onClick={() => alert(`Dialing salon phone number: ${profile.phone || '+1 (555) 019-2834'}`)}
                  className="w-9 h-9 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg cursor-pointer transition-transform hover:scale-110"
                >
                  <span className="material-symbols-outlined text-base">call</span>
                </button>
                <button
                  type="button"
                  title="Social Media Links"
                  onClick={() => alert('Social media links opened!')}
                  className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center shadow-lg cursor-pointer transition-transform hover:scale-110"
                >
                  <span className="material-symbols-outlined text-base">share</span>
                </button>
                <button
                  type="button"
                  title="Back to Top"
                  onClick={() => {
                    const el = document.querySelector('.min-h-\\[580px\\]');
                    if (el) el.scrollTop = 0;
                  }}
                  className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 flex items-center justify-center shadow-lg cursor-pointer transition-transform hover:scale-110"
                >
                  <span className="material-symbols-outlined text-base">keyboard_arrow_up</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* ADD SOCIAL VIDEO MODAL */}
      {/* ============================================================ */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={closeAddModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-social-video-title"
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl w-full max-w-xl my-auto shadow-2xl flex flex-col max-h-[92vh] animate-scale-up"
          >
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 dark:border-slate-800 px-5 sm:px-6 py-4">
              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[#b0004a] text-xl leading-6">add_to_queue</span>
                <div>
                  <h3 id="add-social-video-title" className="font-display font-bold text-lg text-gray-900 dark:text-slate-100 leading-tight">
                    {editingVideo?'Replace Video URL & Title':'Add Social Video URL'}
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                    Step 06 · appears as a portrait reel on your website.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeAddModal}
                aria-label="Close add video dialog"
                className="text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 text-sm font-bold cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>

            <div className="px-5 sm:px-6 py-4 overflow-y-auto flex flex-col gap-4">
              <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed">
                Add a YouTube Short, Instagram Reel or Facebook Reel/Watch link. YouTube covers are automatic — for any platform you can paste a cover URL or upload your own file. For Instagram/Facebook hover playback, add your own playable MP4/WebM preview URL.
              </p>

              {urlError && (
                <div role="alert" className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 p-3 rounded-xl text-xs font-medium flex items-start gap-2">
                  <span className="material-symbols-outlined text-rose-600 dark:text-rose-400 text-base leading-5">error</span>
                  <span>{urlError}</span>
                </div>
              )}

              <form id="add-social-video-form" onSubmit={handleAddVideoSubmit} className="flex flex-col gap-4">
                <div>
                  <label htmlFor="social-video-url" className="text-xs font-bold text-gray-700 dark:text-slate-200 uppercase font-mono-caps block mb-1">
                    Video / Reel URL *
                  </label>
                  <input
                    id="social-video-url"
                    type="text"
                    required
                    inputMode="url"
                    value={videoUrlInput}
                    onChange={(e) => {
                      const value = e.target.value;
                      setVideoUrlInput(value);
                      setUrlError(null);
                      const detected = detectedVideoFormat(value);
                      if (detected) setVideoFormatInput(detected);
                    }}
                    placeholder={VIDEO_URL_PLACEHOLDER}
                    aria-describedby="social-video-url-help"
                    className="w-full text-xs font-mono p-3 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-[#b0004a] focus:outline-none text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500"
                  />
                  <p id="social-video-url-help" className="mt-1.5 text-[10.5px] leading-relaxed text-gray-500 dark:text-slate-400">
                    Supports YouTube Shorts, Instagram Reels, or Facebook Video/Reel links.
                  </p>
                </div>

                <SocialVideoCoverField
                  mode={coverMode}
                  onModeChange={setCoverMode}
                  url={coverImageUrl}
                  onUrlChange={(value) => { setCoverImageUrl(value); setCoverError(null); }}
                  file={coverImageFile}
                  onFileChange={(file) => { setCoverImageFile(file); setCoverError(null); }}
                  fallbackUrl={editingVideo?.thumbnailUrl}
                  error={coverError}
                  disabled={isSavingVideo}
                />

                <label className="text-xs font-bold text-gray-700 dark:text-slate-200">
                  Short preview URL (optional MP4 / WebM, up to 3 minutes)
                  <input
                    type="url"
                    value={previewUrlInput}
                    onChange={e=>setPreviewUrlInput(e.target.value)}
                    placeholder="https://your-site.com/reel-preview.mp4"
                    className="mt-1 block w-full p-3 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500"
                  />
                  <span className="block mt-1 text-[10.5px] font-normal text-gray-500 dark:text-slate-400">Plays on hover in the reels rail. Leave empty to link straight to the post.</span>
                </label>

                <div>
                  <label htmlFor="social-video-title" className="text-xs font-bold text-gray-700 dark:text-slate-200 uppercase font-mono-caps block mb-1">
                    Video Title (Optional)
                  </label>
                  <input
                    id="social-video-title"
                    type="text"
                    value={videoTitleInput}
                    onChange={(e) => setVideoTitleInput(e.target.value)}
                    placeholder="e.g. Keratin Smooth Transformation Reel"
                    className="w-full text-xs p-3 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-[#b0004a] focus:outline-none text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500"
                  />
                </div>

                <div>
                  <span id="social-video-format-label" className="text-xs font-bold text-gray-700 dark:text-slate-200 uppercase font-mono-caps block mb-1">
                    Video format
                  </span>
                  <div role="group" aria-labelledby="social-video-format-label" className="grid grid-cols-3 gap-2">
                    {SOCIAL_VIDEO_FORMATS.map((format) => (
                      <button
                        key={format.id}
                        type="button"
                        aria-pressed={videoFormatInput === format.id}
                        title={format.hint}
                        onClick={() => setVideoFormatInput(format.id)}
                        className={`py-2 px-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          videoFormatInput === format.id
                            ? 'bg-[#b0004a] text-white border-[#b0004a] shadow-xs'
                            : 'bg-gray-50 dark:bg-slate-950 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {format.id}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[10.5px] leading-relaxed text-gray-500 dark:text-slate-400">
                    {SOCIAL_VIDEO_FORMATS.find((format) => format.id === videoFormatInput)?.hint}
                    {videoUrlInput.trim() && detectedVideoFormat(videoUrlInput) && detectedVideoFormat(videoUrlInput) !== videoFormatInput && (
                      <span className="block mt-1 text-amber-700 dark:text-amber-400 font-medium">
                        Heads up: this link looks like a {detectedVideoFormat(videoUrlInput) === 'FACEBOOK' ? 'Facebook' : detectedVideoFormat(videoUrlInput) === 'REEL' ? 'Instagram' : 'YouTube'} post — pick {detectedVideoFormat(videoUrlInput)} to label it correctly.
                      </span>
                    )}
                  </p>
                </div>
              </form>
            </div>

            <div className="flex items-center justify-end gap-3 px-5 sm:px-6 py-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-950/40 rounded-b-2xl">
              <button
                type="button"
                onClick={closeAddModal}
                disabled={isSavingVideo}
                className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 text-xs font-bold text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="add-social-video-form"
                disabled={isSavingVideo}
                className="px-6 py-2.5 rounded-xl bg-[#b0004a] hover:bg-[#d81b60] text-white text-xs font-bold shadow-md cursor-pointer transition-all disabled:opacity-70 disabled:cursor-wait"
              >
                {isSavingVideo?'Uploading cover…':editingVideo?'Save replacement':'Save & Add Video'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MANAGE VIDEO MODAL */}
      {/* ============================================================ */}
      {managingVideo && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-display font-bold text-base text-gray-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-600 text-lg">settings</span>
                <span>Manage Video Item</span>
              </h3>
              <button
                type="button"
                onClick={() => setManagingVideo(null)}
                className="text-gray-400 hover:text-gray-700 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Item Preview Card */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <img
                src={managingVideo.thumbnailUrl}
                alt={managingVideo.title}
                className="w-16 h-12 object-cover rounded-lg border border-gray-300"
              />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-xs text-gray-900 truncate">{managingVideo.title}</p>
                <span className="text-[10px] font-mono text-gray-500">{managingVideo.channelTitle}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] font-bold text-gray-700 uppercase font-mono-caps block mb-1">
                  Video format — Shorts / Reels only
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['SHORT'] as VideoCategoryTag[]).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleUpdateCategoryTag(managingVideo.id, tag)}
                      className={`py-1.5 text-xs font-bold rounded-lg border ${
                        managingVideo.categoryTag === tag
                          ? 'bg-purple-700 text-white border-purple-700'
                          : 'bg-white text-gray-700 border-gray-300'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-bold text-gray-700">Video Ownership Tag</span>
                <button
                  type="button"
                  onClick={() => handleToggleOwnerStatus(managingVideo.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                    managingVideo.isOwnerVideo
                      ? 'bg-[#b0004a] text-white border-[#b0004a]'
                      : 'bg-gray-100 text-gray-700 border-gray-300'
                  }`}
                >
                  {managingVideo.isOwnerVideo ? 'Marked as YOURS' : 'Mark as SHOWCASE'}
                </button>
              </div>

              <button type="button" className="primary-action" onClick={()=>replaceVideo(managingVideo)}>Replace video / Edit URL & title</button><div className="pt-2 border-t border-gray-100 flex justify-between items-center mt-2">
                <button
                  type="button"
                  onClick={() => handleDeleteVideo(managingVideo.id)}
                  className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1 border border-rose-200 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                  <span>Delete Video</span>
                </button>

                <button
                  type="button"
                  onClick={() => setManagingVideo(null)}
                  className="px-5 py-2 rounded-xl bg-gray-900 text-white font-bold text-xs hover:bg-black cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* VIDEO LIGHTBOX PLAYER MODAL */}
      {/* ============================================================ */}
      {previewActiveVideo && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-4 text-white shadow-2xl flex flex-col gap-3 animate-scale-up">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <h4 className="font-bold text-sm text-white">{previewActiveVideo.title}</h4>
                <p className="text-[11px] font-mono text-slate-400">{previewActiveVideo.channelTitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewActiveVideo(null)}
                className="text-slate-400 hover:text-white font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="aspect-video w-full rounded-xl bg-black overflow-hidden border border-slate-800">
              {secureMediaUrl(previewActiveVideo.previewVideoUrl)?<video className="w-full h-full" src={previewActiveVideo.previewVideoUrl} autoPlay muted playsInline controls/>:videoSource(previewActiveVideo)?.platform==='YouTube'?<iframe src={`https://www.youtube.com/embed/${previewActiveVideo.videoId}?autoplay=1&mute=1&playsinline=1`} title={previewActiveVideo.title} className="w-full h-full border-0" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen/>:<a href={videoSource(previewActiveVideo)?.url} target="_blank" rel="noopener noreferrer" className="block p-6 text-white underline">Open on {videoSource(previewActiveVideo)?.platform || 'Instagram'}</a>}
            </div>
          </div>
        </div>
      )}

      {/* NAVIGATION FOOTER */}
      <div className="flex justify-between items-center border-t border-gray-200 pt-6 mt-4">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 rounded-xl border border-gray-300 bg-white text-xs font-bold text-gray-700 hover:bg-gray-100 flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          <span>Back</span>
        </button>

        <button
          type="button"
          onClick={onContinue}
          className="bg-[#b0004a] hover:bg-[#d81b60] text-white text-xs font-bold px-8 py-3.5 rounded-xl shadow-md shadow-[#b0004a]/20 hover:shadow-lg flex items-center gap-2 transition-all cursor-pointer"
        >
          <span>Continue</span>
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </button>
      </div>
    </div>
  );
};
