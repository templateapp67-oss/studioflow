import React, { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  ExternalLink,
  ImageOff,
  Pause,
  Play,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import type { SalonProfile, SocialVideo } from "../../types";
import {
  IRON_INK_MEDIA_FALLBACK_POSTER,
  ironInkMediaTopics,
  ironInkOwnerVideos,
  type IronInkMediaTopic,
} from "../../lib/ironInkMedia";
import {
  ironInkHttpsUrl,
  ironInkPosterSrc,
  ironInkSocialLinks,
  ironInkVideoLink,
} from "../../lib/ironInkSocial";
import { socialVideoSource } from "../../lib/socialVideoSource";
import { fadeUp, stagger } from "./motion";

function platformLabel(url: string): string {
  const host = (() => {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return "";
    }
  })();
  if (host.includes("instagram")) return "Instagram";
  if (host.includes("youtu")) return "YouTube";
  return "the studio";
}

function Poster({
  src,
  alt,
  fallback = IRON_INK_MEDIA_FALLBACK_POSTER,
}: {
  src: string;
  alt: string;
  /** Pass null for real owner media so a demo file is never substituted. */
  fallback?: string | null;
}) {
  const fallbackSrc = ironInkPosterSrc(fallback || "") || "";
  const safe = ironInkPosterSrc(src) || fallbackSrc;
  const [current, setCurrent] = useState(safe);
  const [failed, setFailed] = useState(!safe);
  useEffect(() => {
    setCurrent(safe);
    setFailed(!safe);
  }, [safe]);
  if (failed || !current) {
    return (
      <span className="ii-reel-poster-fallback" role="img" aria-label={alt}>
        <ImageOff size={24} aria-hidden="true" />
        <small>Poster unavailable</small>
      </span>
    );
  }
  return (
    <img
      src={current}
      alt={alt}
      width={1200}
      height={896}
      loading="lazy"
      decoding="async"
      onError={() => {
        if (fallbackSrc && current !== fallbackSrc) setCurrent(fallbackSrc);
        else setFailed(true);
      }}
    />
  );
}

function OwnerReelCard({
  video,
  studioName,
  reduced,
}: {
  key?: React.Key;
  video: SocialVideo;
  studioName: string;
  reduced: boolean;
}) {
  const source = socialVideoSource(video.youtubeUrl);
  const href = ironInkVideoLink(video.youtubeUrl);
  const preview = ironInkHttpsUrl(video.previewVideoUrl);
  const [playing, setPlaying] = useState(false);
  if (!href) return null;
  const platform = source?.platform || platformLabel(href);
  const poster =
    ironInkPosterSrc(video.thumbnailUrl) ||
    (source?.platform === "YouTube"
      ? `https://img.youtube.com/vi/${source.id}/hqdefault.jpg`
      : "");

  return (
    <motion.article className="ii-reel-card" variants={fadeUp} data-kind="reel">
      <div className="ii-reel-media">
        {playing && preview ? (
          <video
            className="ii-reel-player"
            src={preview}
            poster={poster}
            controls
            muted
            playsInline
            preload="none"
            autoPlay={!reduced}
            aria-label={`${video.title} — muted studio preview`}
            onEnded={() => setPlaying(false)}
          />
        ) : (
          <Poster
            src={poster}
            alt={`${video.title} — ${studioName} reel poster`}
            fallback={null}
          />
        )}
        <span className="ii-reel-badge">{video.categoryTag === "SHORT" ? "REEL" : "VIDEO"}</span>
        {preview && !playing && (
          <button
            type="button"
            className="ii-reel-play"
            aria-label={`Play a muted preview of ${video.title}`}
            onClick={() => setPlaying(true)}
          >
            <Play size={20} aria-hidden="true" />
          </button>
        )}
        {playing && (
          <button
            type="button"
            className="ii-reel-play ii-reel-stop"
            aria-label={`Stop the preview of ${video.title}`}
            onClick={() => setPlaying(false)}
          >
            <Pause size={18} aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="ii-reel-copy">
        <span className="ii-kicker">STUDIO REEL · {platform.toUpperCase()}</span>
        <h3>{video.title}</h3>
        {video.description && <p>{video.description}</p>}
        <a
          className="ii-reel-link"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Watch ${video.title} on ${platform} (opens in a new tab)`}
        >
          WATCH ON {platform.toUpperCase()} <ExternalLink size={13} aria-hidden="true" />
        </a>
      </div>
    </motion.article>
  );
}

function MediaTopicCard({
  topic,
  reduced,
}: {
  key?: React.Key;
  topic: IronInkMediaTopic;
  reduced: boolean;
}) {
  const href = ironInkVideoLink(topic.href);
  const demo = topic.isDemo !== false;
  return (
    <motion.article
      className="ii-reel-card ii-reel-topic"
      variants={fadeUp}
      whileHover={reduced ? undefined : { y: -3 }}
      data-kind="guide"
      data-demo={demo ? "true" : "false"}
    >
      <div className="ii-reel-media">
        <Poster
          src={topic.posterUrl}
          alt={`${topic.title} — illustrative studio poster`}
          fallback={demo ? IRON_INK_MEDIA_FALLBACK_POSTER : null}
        />
        <span className="ii-reel-badge">STUDIO GUIDE</span>
        {demo && <span className="ii-reel-demo">DEMO POSTER · NOT CLIENT WORK</span>}
      </div>
      <div className="ii-reel-copy">
        <span className="ii-kicker">FROM THE STUDIO</span>
        <h3>{topic.title}</h3>
        <p>{topic.caption}</p>
        {href ? (
          <a
            className="ii-reel-link"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${topic.title} on ${platformLabel(href)} (opens in a new tab)`}
          >
            OPEN STUDIO CLIP <ArrowUpRight size={13} aria-hidden="true" />
          </a>
        ) : (
          <span className="ii-reel-topic-note">
            <ShieldCheck size={13} aria-hidden="true" /> Illustrative studio guide — no video linked yet.
          </span>
        )}
      </div>
    </motion.article>
  );
}

export function IronInkReels({
  profile,
  videos,
  topics,
  onManage,
}: {
  profile: SalonProfile;
  videos?: SocialVideo[];
  topics?: IronInkMediaTopic[];
  /** Owner preview only: opens the existing content editor. */
  onManage?: () => void;
}) {
  const reduced = useReducedMotion();
  const studioName = profile.businessName || "the studio";
  const title = profile.sectionHeadings?.videosTitle?.trim() || "Featured Videos & Reels";
  const subtitle =
    profile.sectionHeadings?.videosSubtitle?.trim() ||
    "Artist process, healed work, studio practice, piercing hygiene and aftercare — the parts of the craft that happen before and after the chair.";
  const ownerVideos = videos ?? ironInkOwnerVideos(profile);
  const guideTopics = (topics ?? ironInkMediaTopics(profile.ironInk?.media)).filter(
    (topic) => topic.title.trim(),
  );
  const hasContent = ownerVideos.length > 0 || guideTopics.length > 0;
  const socialHref = ironInkSocialLinks(profile).find(
    (link) => link.platform === "youtube" || link.platform === "instagram",
  )?.url;

  return (
    <section
      className="ii-section ii-reels"
      id="videos"
      aria-labelledby="ii-reels-title"
      data-section="videos"
    >
      <div className="ii-section-head">
        <span className="ii-kicker">IN MOTION</span>
        <h2 id="ii-reels-title">{title}</h2>
        <p>{subtitle}</p>
        {onManage && (
          <button type="button" className="ii-text-link" onClick={onManage}>
            <Settings2 size={14} aria-hidden="true" /> EDIT FEATURED MEDIA
          </button>
        )}
      </div>

      {hasContent ? (
        <motion.div
          className="ii-reel-grid"
          initial="hidden"
          animate="show"
          variants={stagger}
        >
          {ownerVideos.map((video) => (
            <OwnerReelCard
              key={video.id}
              video={video}
              studioName={studioName}
              reduced={Boolean(reduced)}
            />
          ))}
          {guideTopics.map((topic) => (
            <MediaTopicCard
              key={topic.id}
              topic={topic}
              reduced={Boolean(reduced)}
            />
          ))}
        </motion.div>
      ) : (
        <div className="ii-media-empty" role="note">
          <Play size={22} aria-hidden="true" />
          <div>
            <strong>No featured media yet.</strong>
            <p>
              {socialHref
                ? "The studio's latest reels are on its social profiles. Ask the studio for the link, or check back soon."
                : "The studio has not published featured videos or reels yet."}
            </p>
          </div>
          {socialHref && (
            <a
              className="ii-outline"
              href={socialHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              OPEN STUDIO PROFILE <ExternalLink size={14} aria-hidden="true" />
            </a>
          )}
        </div>
      )}
    </section>
  );
}
