import React, { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  Facebook,
  Instagram,
  Play,
  Settings2,
  Youtube,
  type LucideIcon,
} from "lucide-react";
import type { SalonProfile } from "../../types";
import {
  SOCIAL_VIDEO_PLATFORM_LABEL,
  parseSocialVideo,
  socialVideoSamples,
  type ParsedSocialVideo,
  type SocialVideoPlatform,
} from "../../lib/socialVideoEmbeds";
import type { SalonSocialVideo } from "../../lib/salonSocialVideos";
import { fadeUp, stagger } from "./motion";
import { usePublicSalonSocialVideos } from "./useSalonSocialVideos";

const PLATFORM_ICON: Record<SocialVideoPlatform, LucideIcon> = {
  youtube: Youtube,
  instagram: Instagram,
  facebook: Facebook,
};

type Filter = "all" | SocialVideoPlatform;

type GalleryVideo = {
  id: string;
  title: string;
  platform: SocialVideoPlatform;
  parsed: ParsedSocialVideo;
  thumbnailUrl: string;
  isSample: boolean;
};

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All" },
  { id: "youtube", label: "YouTube" },
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
];

function toGalleryVideo(video: SalonSocialVideo): GalleryVideo | null {
  const parsed = parseSocialVideo(video.url);
  if (!parsed) return null;
  return {
    id: video.id,
    title: video.title?.trim() || `${SOCIAL_VIDEO_PLATFORM_LABEL[parsed.platform]} video`,
    platform: parsed.platform,
    parsed,
    thumbnailUrl: parsed.thumbnailUrl,
    isSample: false,
  };
}

function sampleVideos(): GalleryVideo[] {
  const seen = new Set<string>();
  return socialVideoSamples
    .map((sample): GalleryVideo | null => {
      const parsed = parseSocialVideo(sample.url);
      if (!parsed) return null;
      return {
        id: sample.id,
        title: sample.title,
        platform: parsed.platform,
        parsed,
        thumbnailUrl: sample.thumbnailUrl || parsed.thumbnailUrl,
        isSample: true,
      };
    })
    .filter((video): video is GalleryVideo => Boolean(video))
    .filter((video) => {
      if (seen.has(video.parsed.canonicalUrl)) return false;
      seen.add(video.parsed.canonicalUrl);
      return true;
    });
}

function EmbedFallback({
  video,
  message,
}: {
  video: GalleryVideo;
  message: string;
}) {
  const Icon = PLATFORM_ICON[video.platform];
  const label = SOCIAL_VIDEO_PLATFORM_LABEL[video.platform];
  return (
    <div className="ii-short-fallback">
      <Icon size={26} aria-hidden="true" />
      <strong>{message}</strong>
      <span>The video always opens on {label} itself.</span>
      <a
        className="ii-short-watch"
        href={video.parsed.canonicalUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Watch ${video.title} on ${label} (opens in a new tab)`}
      >
        Watch on {label} <ArrowUpRight size={13} aria-hidden="true" />
      </a>
    </div>
  );
}

/**
 * The iframe is only mounted after a tap. Instagram and Facebook embeds keep a
 * visible "watch on …" link because their players can be blocked by the
 * browser; a failed or slow embed swaps to the fallback card.
 */
function VideoEmbed({ video }: { video: GalleryVideo }) {
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");

  useEffect(() => {
    if (status !== "loading") return;
    const timer = setTimeout(() => setStatus((value) => (value === "loading" ? "failed" : value)), 9000);
    return () => clearTimeout(timer);
  }, [status]);

  if (status === "failed") {
    return <EmbedFallback video={video} message="Embed could not load" />;
  }

  return (
    <>
      <iframe
        className="ii-short-iframe"
        src={video.parsed.embedUrl}
        title={`${video.title} — ${SOCIAL_VIDEO_PLATFORM_LABEL[video.platform]} player`}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation allow-forms"
        onLoad={() => setStatus("ready")}
        onError={() => setStatus("failed")}
      />
      {/* Instagram and Facebook players can refuse to render; keep a visible
          route to the original video. The YouTube player has its own chrome. */}
      {video.platform !== "youtube" && (
        <a
          className="ii-short-watch ii-short-watch-inline"
          href={video.parsed.canonicalUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Watch ${video.title} on ${SOCIAL_VIDEO_PLATFORM_LABEL[video.platform]} (opens in a new tab)`}
        >
          Open on {SOCIAL_VIDEO_PLATFORM_LABEL[video.platform]}
          <ArrowUpRight size={12} aria-hidden="true" />
        </a>
      )}
    </>
  );
}

function ShortCard({
  video,
  playing,
  onPlay,
  reduced,
}: {
  key?: React.Key;
  video: GalleryVideo;
  playing: boolean;
  onPlay: () => void;
  reduced: boolean;
}) {
  const Icon = PLATFORM_ICON[video.platform];
  const label = SOCIAL_VIDEO_PLATFORM_LABEL[video.platform];
  const [posterFailed, setPosterFailed] = useState(false);

  return (
    <motion.article
      className="ii-short-card"
      variants={fadeUp}
      whileHover={reduced ? undefined : { y: -4 }}
      data-kind="short"
      data-demo={video.isSample ? "true" : "false"}
    >
      <div className="ii-short-media">
        {playing ? (
          <VideoEmbed video={video} />
        ) : (
          <button
            type="button"
            className="ii-short-poster"
            onClick={onPlay}
            aria-label={`Play ${video.title} — ${label} video`}
          >
            {video.thumbnailUrl && !posterFailed ? (
              <img
                src={video.thumbnailUrl}
                alt={`${video.title} — ${label} video preview`}
                loading="lazy"
                decoding="async"
                width={720}
                height={1280}
                onError={() => setPosterFailed(true)}
              />
            ) : (
              <span className="ii-short-placeholder" aria-hidden="true">
                <Icon size={34} />
                <small>{label.toUpperCase()} REEL</small>
              </span>
            )}
            <span className="ii-short-play" aria-hidden="true">
              <Play size={20} />
            </span>
            {video.isSample && <span className="ii-short-sample">SAMPLE · NOT CLIENT WORK</span>}
          </button>
        )}
        <span className="ii-short-badge">
          <Icon size={12} aria-hidden="true" />
          {label}
        </span>
      </div>
      <div className="ii-short-copy">
        <h3>{video.title}</h3>
        <a
          className="ii-short-link"
          href={video.parsed.canonicalUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Watch ${video.title} on ${label} (opens in a new tab)`}
        >
          WATCH ON {label.toUpperCase()} <ArrowUpRight size={12} aria-hidden="true" />
        </a>
      </div>
    </motion.article>
  );
}

export function IronInkShorts({
  profile,
  siteSlug,
  onManage,
}: {
  profile: SalonProfile;
  siteSlug?: string;
  /** Owner preview only: opens the Social videos manager. */
  onManage?: () => void;
}) {
  const reduced = Boolean(useReducedMotion());
  const { videos: savedVideos } = usePublicSalonSocialVideos(siteSlug);
  const [filter, setFilter] = useState<Filter>("all");
  const [playing, setPlaying] = useState<string | null>(null);

  const galleryVideos = useMemo(() => {
    const saved = savedVideos
      .map(toGalleryVideo)
      .filter((video): video is GalleryVideo => Boolean(video));
    return saved.length ? saved : sampleVideos();
  }, [savedVideos]);
  const usingSamples = savedVideos.length === 0;

  const counts = useMemo(() => {
    const base: Record<Filter, number> = {
      all: galleryVideos.length,
      youtube: 0,
      instagram: 0,
      facebook: 0,
    };
    galleryVideos.forEach((video) => {
      base[video.platform] += 1;
    });
    return base;
  }, [galleryVideos]);

  const visible = filter === "all" ? galleryVideos : galleryVideos.filter((video) => video.platform === filter);

  const labelFor = (id: Filter) => FILTERS.find((item) => item.id === id)?.label || "All";

  return (
    <section
      className="ii-section ii-shorts"
      id="reels-shorts"
      aria-labelledby="ii-shorts-title"
      data-section="reels"
    >
      <div className="ii-section-head">
        <span className="ii-kicker">IN MOTION</span>
        <h2 id="ii-shorts-title">Watch our work – Reels &amp; Shorts</h2>
        <p>
          Process clips, healed pieces and flash-day drops from{" "}
          {profile.businessName || "the studio"}. Videos load only when you tap
          them, straight from the platform&rsquo;s own player.
        </p>
        {onManage && (
          <button type="button" className="ii-text-link" onClick={onManage}>
            <Settings2 size={14} aria-hidden="true" /> MANAGE SOCIAL VIDEOS
          </button>
        )}
      </div>

      <div className="ii-shorts-tabs" role="tablist" aria-label="Filter videos by platform">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`ii-shorts-tab-${item.id}`}
            aria-selected={filter === item.id}
            aria-controls="ii-shorts-panel"
            tabIndex={filter === item.id ? 0 : -1}
            className={filter === item.id ? "selected" : ""}
            onClick={() => setFilter(item.id)}
            onKeyDown={(event) => {
              if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
              event.preventDefault();
              const index = FILTERS.findIndex((entry) => entry.id === filter);
              const step = event.key === "ArrowRight" ? 1 : -1;
              const next = FILTERS[(index + step + FILTERS.length) % FILTERS.length];
              setFilter(next.id);
              document.getElementById(`ii-shorts-tab-${next.id}`)?.focus();
            }}
          >
            {item.label}
            <span className="ii-shorts-count" aria-hidden="true">
              {counts[item.id]}
            </span>
          </button>
        ))}
      </div>

      <div id="ii-shorts-panel" role="tabpanel" aria-labelledby={`ii-shorts-tab-${filter}`} aria-live="polite">
        {visible.length === 0 ? (
          <p className="ii-shorts-empty">
            No {labelFor(filter)} videos yet. Choose another platform or check the
            studio&rsquo;s profile.
          </p>
        ) : (
          <motion.div
            className="ii-shorts-track"
            initial="hidden"
            animate="show"
            variants={stagger}
          >
            {visible.map((video) => (
              <ShortCard
                key={video.id}
                video={video}
                playing={playing === video.id}
                onPlay={() => setPlaying(video.id)}
                reduced={reduced}
              />
            ))}
          </motion.div>
        )}
      </div>

      {usingSamples && (
        <p className="ii-shorts-note">
          Sample videos are shown while the studio adds its own reels. They are
          placeholders, not client work — the studio&rsquo;s published videos
          replace them automatically.
        </p>
      )}
    </section>
  );
}
