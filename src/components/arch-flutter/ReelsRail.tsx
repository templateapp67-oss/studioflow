import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import type { ArchFlutterReel, SocialVideo } from '../../types';
import { ARCH_FLUTTER_ART } from '../../lib/archFlutter';
import { secureMediaUrl, socialVideoSource } from '../../lib/socialVideoSource';
import { SafeImage } from './SafeImage';

/** True once ~40% of the element is on screen; SSR/test-safe default. */
function useOnScreen<T extends Element>(ratio = 0.4) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries) => setVisible(entries[0]?.intersectionRatio >= ratio), { threshold: [0, ratio, 1] });
    observer.observe(node);
    return () => observer.disconnect();
  }, [ratio]);
  return [ref, visible] as const;
}

interface ReelMediaProps {
  /** List key — declared so the rail can render each card with its own id. */
  key?: string;
  reel: ArchFlutterReel;
  salonName: string;
  reducedMotion: boolean;
  compact?: boolean;
}

/**
 * One vertical reel card: bundled poster (lazy), optional owner MP4 that muted-
 * autoplays when the card scrolls into view, tap-to-unmute and play/pause.
 */
function ReelCard({ reel, salonName, reducedMotion, compact }: ReelMediaProps) {
  const [ref, onScreen] = useOnScreen<HTMLElement>(0.45);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);
  const preview = secureMediaUrl(reel.previewVideoUrl);
  const source = reel.sourceUrl ? socialVideoSource(reel.sourceUrl) : null;
  const canAutoplay = Boolean(preview) && onScreen && playing && !reducedMotion;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (canAutoplay) void video.play().catch(() => setPlaying(false));
    else video.pause();
  }, [canAutoplay, preview]);

  const togglePlay = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setPlaying((current) => !current);
  };
  const toggleMute = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setMuted((current) => {
      const next = !current;
      if (videoRef.current) videoRef.current.muted = next;
      return next;
    });
  };

  return (
    <a
      ref={ref as React.RefObject<HTMLAnchorElement>}
      className="af-reel"
      href={source?.url || reel.sourceUrl || '#'}
      target={source ? '_blank' : undefined}
      rel={source ? 'noopener noreferrer' : undefined}
      aria-label={`${reel.title} — ${reel.caption}. ${source ? `Watch on ${source.platform}.` : 'Studio reel.'}`}
    >
      <SafeImage src={reel.posterUrl} fallback={ARCH_FLUTTER_ART.reel} alt="" width={360} height={640} loading="lazy" />
      {preview && canAutoplay && (
        <video ref={videoRef} src={preview} poster={reel.posterUrl} muted={muted} playsInline loop preload="none" aria-hidden="true" tabIndex={-1} />
      )}
      <span className="af-reel-play" aria-hidden="true">
        {playing && preview ? <Pause size={15} /> : <Play size={15} fill="currentColor" />}
      </span>
      <button type="button" className="af-reel-muted" onClick={toggleMute} aria-label={muted ? `Unmute ${reel.title}` : `Mute ${reel.title}`} aria-pressed={!muted}>
        {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
      </button>
      {preview && (
        <button type="button" className="af-reel-muted" style={{ left: 'auto', right: 12, top: 52 }} onClick={togglePlay} aria-label={playing ? `Pause ${reel.title}` : `Play ${reel.title}`}>
          {playing ? <Pause size={14} /> : <Play size={14} />}
        </button>
      )}
      <span className="af-reel-copy">
        <b>{reel.title}</b>
        <span>{compact ? reel.caption : `${salonName} · ${reel.caption}`}</span>
      </span>
    </a>
  );
}

/**
 * "Featured Videos & Reels": one main featured film beside a vertical
 * (9:16) reel rail. Owner reels added from the dashboard (Instagram / YouTube /
 * uploaded MP4) are merged in front of the bundled demo references.
 */
export function ArchFlutterReelsSection({
  reels,
  featured,
  ownerVideos,
  salonName,
  reducedMotion,
}: {
  reels: ArchFlutterReel[];
  featured: ArchFlutterReel;
  ownerVideos: SocialVideo[];
  salonName: string;
  reducedMotion: boolean;
}) {
  const [featuredRef, featuredOnScreen] = useOnScreen<HTMLDivElement>(0.35);
  const featuredVideo = useRef<HTMLVideoElement | null>(null);
  const [featuredMuted, setFeaturedMuted] = useState(true);
  const [featuredPlaying, setFeaturedPlaying] = useState(true);
  const featuredPreview = secureMediaUrl(featured.previewVideoUrl);
  const featuredSource = featured.sourceUrl ? socialVideoSource(featured.sourceUrl) : null;
  const featuredCanPlay = Boolean(featuredPreview) && featuredOnScreen && featuredPlaying && !reducedMotion;

  useEffect(() => {
    const video = featuredVideo.current;
    if (!video) return;
    if (featuredCanPlay) void video.play().catch(() => setFeaturedPlaying(false));
    else video.pause();
  }, [featuredCanPlay, featuredPreview]);

  const ownerReels: ArchFlutterReel[] = ownerVideos
    .filter((video) => video.categoryTag !== 'LONG')
    .slice(0, 6)
    .map((video) => {
      const source = socialVideoSource(video.youtubeUrl);
      return {
        id: video.id,
        title: video.title,
        caption: video.isDemo ? 'Demo / reference' : (video.channelTitle || 'Studio reel'),
        posterUrl: secureMediaUrl(video.thumbnailUrl) || (source?.platform === 'YouTube' ? `https://img.youtube.com/vi/${source.id}/hqdefault.jpg` : ''),
        previewVideoUrl: secureMediaUrl(video.previewVideoUrl) || undefined,
        sourceUrl: source?.url || video.youtubeUrl,
      };
    });
  const rail = [...ownerReels, ...reels].slice(0, 8);

  return (
    <div className="af-reels-shell">
      <div>
        <div ref={featuredRef} className="af-featured-video" role="group" aria-label={`Featured video: ${featured.title}`}>
          <SafeImage className="af-poster" src={featured.posterUrl} fallback={ARCH_FLUTTER_ART.reel} alt={featured.title} width={720} height={900} loading="lazy" />
          {featuredPreview && featuredCanPlay && (
            <video ref={featuredVideo} src={featuredPreview} poster={featured.posterUrl} muted={featuredMuted} playsInline loop preload="none" aria-hidden="true" tabIndex={-1} />
          )}
          <div className="af-video-controls">
            {featuredPreview && (
              <>
                <button
                  type="button"
                  className="af-video-btn"
                  onClick={() => setFeaturedPlaying((current) => !current)}
                  aria-label={featuredPlaying ? 'Pause featured video' : 'Play featured video'}
                >
                  {featuredPlaying ? <Pause size={17} /> : <Play size={17} fill="currentColor" />}
                </button>
                <button
                  type="button"
                  className="af-video-btn"
                  onClick={() => {
                    setFeaturedMuted((current) => {
                      const next = !current;
                      if (featuredVideo.current) featuredVideo.current.muted = next;
                      return next;
                    });
                  }}
                  aria-label={featuredMuted ? 'Unmute featured video' : 'Mute featured video'}
                  aria-pressed={!featuredMuted}
                >
                  {featuredMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
                </button>
              </>
            )}
            {featuredSource && (
              <a className="af-video-btn" href={featuredSource.url} target="_blank" rel="noopener noreferrer" aria-label={`Watch ${featured.title} on ${featuredSource.platform}`}>
                <ExternalLink size={16} />
              </a>
            )}
          </div>
          <div className="af-featured-copy">
            <b>{featured.title}</b>
            <span>{featured.caption}</span>
          </div>
        </div>
      </div>

      <div className="af-reels-rail" tabIndex={0} aria-label="Studio reels. Swipe or scroll horizontally; tap a reel to unmute or open its source.">
        {rail.map((reel) => (
          <ReelCard key={reel.id} reel={reel} salonName={salonName} reducedMotion={reducedMotion} compact />
        ))}
      </div>
    </div>
  );
}
