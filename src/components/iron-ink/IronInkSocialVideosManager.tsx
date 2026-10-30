import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronRight,
  Facebook,
  Instagram,
  Plus,
  Trash2,
  Youtube,
  type LucideIcon,
} from "lucide-react";
import {
  MAX_SALON_SOCIAL_VIDEOS,
  createSalonSocialVideo,
  deleteSalonSocialVideo,
  fetchOwnerSalonSocialVideos,
  hasSocialVideoOwnerSession,
  readLocalSalonSocialVideos,
  reorderSalonSocialVideos,
  salonSocialVideoThumbnail,
  updateSalonSocialVideo,
  writeLocalSalonSocialVideos,
  type SalonSocialVideo,
} from "../../lib/salonSocialVideos";
import {
  SOCIAL_VIDEO_PLATFORM_LABEL,
  parseSocialVideo,
  socialVideoPlatformHint,
  type SocialVideoPlatform,
} from "../../lib/socialVideoEmbeds";

const PLATFORM_ICON: Record<SocialVideoPlatform, LucideIcon> = {
  youtube: Youtube,
  instagram: Instagram,
  facebook: Facebook,
};

type Notice = { tone: "info" | "success" | "error"; message: string } | null;

/**
 * Owner workspace → "Social videos" manager.
 *
 * Paste a link, the platform is detected and validated in the browser, a small
 * preview is shown, and only then is the row saved. Rows can be reordered,
 * enabled/disabled and deleted; the maximum is 12 per salon.
 *
 * Saving goes to `public.salon_social_videos` when an owner session exists. In
 * the design preview (no session) the same controls edit a browser-local list so
 * the flow stays usable — the storefront never reads that list.
 */
export function IronInkSocialVideosManager() {
  const [videos, setVideos] = useState<SalonSocialVideo[]>([]);
  const [mode, setMode] = useState<"live" | "local" | "loading">("loading");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [pendingDelete, setPendingDelete] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const signedIn = await hasSocialVideoOwnerSession();
      const rows = signedIn ? await fetchOwnerSalonSocialVideos() : [];
      if (!active) return;
      if (signedIn) {
        setVideos(rows);
        setMode("live");
      } else {
        setVideos(readLocalSalonSocialVideos());
        setMode("local");
        setNotice({
          tone: "info",
          message:
            "Preview mode: no owner session here, so changes stay in this browser. Sign in to your workspace to publish videos to the salon site.",
        });
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const parsed = useMemo(() => parseSocialVideo(url), [url]);
  const invalid = Boolean(url.trim()) && !parsed;
  const atLimit = videos.length >= MAX_SALON_SOCIAL_VIDEOS;

  const persistLocal = (next: SalonSocialVideo[]) => {
    setVideos(next);
    writeLocalSalonSocialVideos(next);
  };

  const addVideo = async () => {
    setNotice(null);
    if (!parsed) {
      setNotice({ tone: "error", message: socialVideoPlatformHint() });
      return;
    }
    if (atLimit) {
      setNotice({
        tone: "error",
        message: `You can publish up to ${MAX_SALON_SOCIAL_VIDEOS} videos. Remove one first.`,
      });
      return;
    }
    if (videos.some((video) => video.url === parsed.canonicalUrl)) {
      setNotice({ tone: "error", message: "This video has already been added." });
      return;
    }
    const nextTitle = title.trim().slice(0, 120);
    if (mode === "local") {
      persistLocal([
        ...videos,
        {
          id: `local-${Date.now()}`,
          platform: parsed.platform,
          url: parsed.canonicalUrl,
          title: nextTitle,
          sortOrder: videos.length,
          isActive: true,
        },
      ]);
      setUrl("");
      setTitle("");
      setNotice({ tone: "success", message: "Video added to this preview." });
      return;
    }
    setBusy(true);
    try {
      const saved = await createSalonSocialVideo({
        url: parsed.canonicalUrl,
        title: nextTitle,
        sortOrder: videos.length,
      });
      setVideos((current) => [...current, saved]);
      setUrl("");
      setTitle("");
      setNotice({ tone: "success", message: "Video added and published to the salon site." });
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Could not save this video.",
      });
    } finally {
      setBusy(false);
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= videos.length) return;
    const next = [...videos];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    const ordered = next.map((video, position) => ({ ...video, sortOrder: position }));
    setNotice(null);
    if (mode === "local") {
      persistLocal(ordered);
      return;
    }
    setVideos(ordered);
    try {
      await reorderSalonSocialVideos(ordered.map((video) => video.id));
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Could not save the new order.",
      });
    }
  };

  const toggleActive = async (video: SalonSocialVideo) => {
    const isActive = !video.isActive;
    setNotice(null);
    if (mode === "local") {
      persistLocal(videos.map((item) => (item.id === video.id ? { ...item, isActive } : item)));
      return;
    }
    setVideos((current) =>
      current.map((item) => (item.id === video.id ? { ...item, isActive } : item)),
    );
    try {
      await updateSalonSocialVideo(video.id, { isActive });
    } catch (error) {
      setVideos((current) =>
        current.map((item) => (item.id === video.id ? { ...item, isActive: video.isActive } : item)),
      );
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Could not update this video.",
      });
    }
  };

  const saveTitle = async (video: SalonSocialVideo, value: string) => {
    const nextTitle = value.trim().slice(0, 120);
    if (nextTitle === video.title) return;
    setVideos((current) =>
      current.map((item) => (item.id === video.id ? { ...item, title: nextTitle } : item)),
    );
    if (mode === "local") {
      writeLocalSalonSocialVideos(
        videos.map((item) => (item.id === video.id ? { ...item, title: nextTitle } : item)),
      );
      return;
    }
    try {
      await updateSalonSocialVideo(video.id, { title: nextTitle });
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Could not update this title.",
      });
    }
  };

  const remove = async (video: SalonSocialVideo) => {
    setNotice(null);
    setPendingDelete("");
    if (mode === "local") {
      persistLocal(videos.filter((item) => item.id !== video.id));
      return;
    }
    try {
      await deleteSalonSocialVideo(video.id);
      setVideos((current) => current.filter((item) => item.id !== video.id));
      setNotice({ tone: "success", message: "Video removed." });
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Could not delete this video.",
      });
    }
  };

  return (
    <section className="ii-videos-manager" aria-labelledby="ii-videos-manager-title">
      <h3 id="ii-videos-manager-title">
        Social videos <small>Reels &amp; Shorts on the customer site</small>
      </h3>
      <p>
        Paste a YouTube Shorts/video, an Instagram Reel or a Facebook Reel/video
        link. The platform is detected and validated automatically — only links
        from those three platforms are accepted. Up to {MAX_SALON_SOCIAL_VIDEOS}{" "}
        videos are shown newest first on the studio site.
      </p>

      <div className="ii-videos-form">
        <label>
          Video URL
          <input
            type="url"
            inputMode="url"
            value={url}
            placeholder="https://www.youtube.com/shorts/…"
            aria-invalid={invalid}
            aria-describedby="ii-videos-url-help"
            onChange={(event) => {
              setUrl(event.target.value);
              setNotice(null);
            }}
          />
          <span
            id="ii-videos-url-help"
            role={invalid ? "alert" : "status"}
            className={invalid ? "ii-editor-error" : "ii-editor-hint"}
          >
            {!url.trim()
              ? socialVideoPlatformHint()
              : parsed
                ? `Detected ${SOCIAL_VIDEO_PLATFORM_LABEL[parsed.platform]} · ${parsed.canonicalUrl}`
                : "Only youtube.com, youtu.be, instagram.com/reel, facebook.com/reel and fb.watch links are accepted."}
          </span>
        </label>
        <label>
          Title <small>Optional — shown under the video</small>
          <input
            value={title}
            maxLength={120}
            placeholder="Fine-line florals, start to finish"
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
      </div>

      {parsed && (
        <div className="ii-videos-preview" aria-label="Video preview">
          <div className="ii-videos-preview-media">
            {parsed.thumbnailUrl ? (
              <img
                src={parsed.thumbnailUrl}
                alt="YouTube thumbnail preview"
                loading="lazy"
                width={360}
                height={640}
              />
            ) : (
              <span className="ii-videos-preview-placeholder">
                {React.createElement(PLATFORM_ICON[parsed.platform], { size: 26 })}
                <small>{SOCIAL_VIDEO_PLATFORM_LABEL[parsed.platform]}</small>
              </span>
            )}
          </div>
          <div>
            <strong>{SOCIAL_VIDEO_PLATFORM_LABEL[parsed.platform]} ready to add</strong>
            <span className="ii-editor-hint">
              Embeds use the platform&rsquo;s privacy-friendly player and load only
              after a visitor taps the card.
            </span>
            <a
              className="ii-videos-preview-link"
              href={parsed.canonicalUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Check the original <ChevronRight size={13} aria-hidden="true" />
            </a>
          </div>
        </div>
      )}

      <div className="ii-editor-actions">
        <button
          type="button"
          className="ii-outline"
          onClick={() => void addVideo()}
          disabled={busy || !parsed || atLimit}
        >
          <Plus size={14} aria-hidden="true" /> ADD VIDEO
        </button>
        <span className="ii-editor-hint">
          {videos.length} of {MAX_SALON_SOCIAL_VIDEOS} videos
          {mode === "local" ? " · browser preview only" : mode === "live" ? " · saved to your workspace" : ""}
        </span>
      </div>

      {notice && (
        <p
          className={notice.tone === "error" ? "ii-editor-error" : "ii-editor-hint"}
          role={notice.tone === "error" ? "alert" : "status"}
        >
          {notice.message}
        </p>
      )}

      {videos.length === 0 ? (
        <p className="ii-editor-hint" role="status">
          No social videos yet. The customer site shows three clearly-labelled
          sample cards until you add the first one.
        </p>
      ) : (
        <ol className="ii-videos-list">
          {videos.map((video, index) => {
            const Icon = PLATFORM_ICON[video.platform];
            const thumbnail = salonSocialVideoThumbnail(video);
            return (
              <li key={video.id} className={video.isActive ? "" : "is-disabled"}>
                <span className="ii-videos-row-media">
                  {thumbnail ? (
                    <img src={thumbnail} alt="" loading="lazy" width={54} height={96} />
                  ) : (
                    <span className="ii-videos-row-placeholder" aria-hidden="true">
                      <Icon size={18} />
                    </span>
                  )}
                </span>
                <div className="ii-videos-row-body">
                  <span className="ii-videos-row-platform">
                    <Icon size={12} aria-hidden="true" />
                    {SOCIAL_VIDEO_PLATFORM_LABEL[video.platform]}
                  </span>
                  <label>
                    <span className="sr-only">Title for video {index + 1}</span>
                    <input
                      value={video.title}
                      maxLength={120}
                      placeholder="Add a title"
                      onChange={(event) => {
                        const value = event.target.value;
                        setVideos((current) =>
                          current.map((item) =>
                            item.id === video.id ? { ...item, title: value } : item,
                          ),
                        );
                      }}
                      onBlur={(event) => void saveTitle(video, event.target.value)}
                    />
                  </label>
                  <span className="ii-videos-row-url" title={video.url}>
                    {video.url}
                  </span>
                </div>
                <div className="ii-videos-row-actions">
                  <button
                    type="button"
                    className="ii-videos-icon"
                    onClick={() => void move(index, -1)}
                    disabled={index === 0}
                    aria-label={`Move ${video.title || "video"} up`}
                  >
                    <ArrowUp size={14} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="ii-videos-icon"
                    onClick={() => void move(index, 1)}
                    disabled={index === videos.length - 1}
                    aria-label={`Move ${video.title || "video"} down`}
                  >
                    <ArrowDown size={14} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={`ii-videos-toggle${video.isActive ? " is-on" : ""}`}
                    onClick={() => void toggleActive(video)}
                    aria-pressed={video.isActive}
                    aria-label={`${video.isActive ? "Disable" : "Enable"} ${video.title || "video"}`}
                  >
                    {video.isActive ? <Check size={12} aria-hidden="true" /> : null}
                    {video.isActive ? "LIVE" : "HIDDEN"}
                  </button>
                  {pendingDelete === video.id ? (
                    <button
                      type="button"
                      className="ii-videos-delete is-confirm"
                      onClick={() => void remove(video)}
                      aria-label={`Confirm delete ${video.title || "video"}`}
                    >
                      SURE?
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="ii-videos-delete"
                      onClick={() => setPendingDelete(video.id)}
                      aria-label={`Delete ${video.title || "video"}`}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
