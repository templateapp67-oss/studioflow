import React from "react";
import "../ironInk.css";
import type {
  LoyaltyConfig,
  RewardThreshold,
  SalonProfile,
} from "../../types";
import {
  IRON_INK_CATEGORIES,
  ironInkDefaults,
  ironInkDurationMinutes,
} from "../../lib/ironInk";
import {
  IRON_INK_MEDIA_FALLBACK_POSTER,
  ironInkMediaTopics,
  type IronInkMediaTopic,
} from "../../lib/ironInkMedia";
import {
  ironInkPosterSrc,
  ironInkSocialLink,
  ironInkVideoLink,
  type IronInkSocialPlatform,
} from "../../lib/ironInkSocial";
import {
  IRON_INK_PERK_SUGGESTIONS,
  blankIronInkPerk,
} from "../../lib/ironInkLoyalty";
import { socialVideoSource } from "../../lib/socialVideoSource";
import { IronInkSocialVideosManager } from "./IronInkSocialVideosManager";

type SocialKey = "instagramHandle" | "facebookPage" | "youtubeChannel";
const SOCIAL_FIELDS: Array<{
  key: SocialKey;
  platform: IronInkSocialPlatform;
  label: string;
  hint: string;
}> = [
  {
    key: "instagramHandle",
    platform: "instagram",
    label: "Instagram",
    hint: "Handle or profile URL",
  },
  {
    key: "facebookPage",
    platform: "facebook",
    label: "Facebook",
    hint: "Page handle or profile URL",
  },
  {
    key: "youtubeChannel",
    platform: "youtube",
    label: "YouTube",
    hint: "Channel handle or URL",
  },
];

export function IronInkEditor({
  profile,
  setProfile,
  services,
  setServices,
  loyaltyConfig,
  setLoyaltyConfig,
}: {
  profile: SalonProfile;
  setProfile: React.Dispatch<React.SetStateAction<SalonProfile>>;
  services?: import("../../types").SalonService[];
  setServices?: React.Dispatch<
    React.SetStateAction<import("../../types").SalonService[]>
  >;
  loyaltyConfig?: LoyaltyConfig;
  setLoyaltyConfig?: React.Dispatch<React.SetStateAction<LoyaltyConfig>>;
}) {
  const config = profile.ironInk || {};
  const savedCategories = config.categories || [];
  const categories = [
    ...IRON_INK_CATEGORIES.map(
      (category) => savedCategories.find((saved) => saved.slug === category.slug) || category,
    ),
    ...savedCategories.filter(
      (saved) => !IRON_INK_CATEGORIES.some((category) => category.slug === saved.slug),
    ),
  ];
  const patch = (value: Partial<NonNullable<SalonProfile["ironInk"]>>) =>
    setProfile((previous) => ({
      ...previous,
      ironInk: { ...previous.ironInk, ...value },
    }));
  const updateCategory = (
    slug: string,
    key: "enabled" | "price" | "image" | "description" | "duration",
    value: boolean | number | string,
  ) => {
    const target = categories.find((category) => category.slug === slug);
    patch({
      categories: categories.map((category) =>
        category.slug === slug ? { ...category, [key]: value } : category,
      ),
    });
    if (target && setServices && key !== "enabled")
      setServices((current) =>
        current.map((service) =>
          service.id === `ii-${slug}` || service.category === target.name
            ? {
                ...service,
                ...(key === "price"
                  ? { price: Number(value) }
                  : key === "duration"
                    ? {
                        durationMinutes: ironInkDurationMinutes(String(value)),
                      }
                    : key === "image"
                      ? { imageUrl: String(value) }
                      : { description: String(value) }),
              }
            : service,
        ),
      );
  };
  const updateFaq = (
    index: number,
    key: "question" | "answer",
    value: string,
  ) =>
    patch({
      faq: (config.faq || ironInkDefaults.faq).map((faq, i) =>
        i === index ? { ...faq, [key]: value } : faq,
      ),
    });
  const testimonials = (profile.websiteTestimonials || []).filter((item) => !item.isDemo);
  const updateTestimonial = (
    id: string,
    key: "name" | "comment" | "avatarUrl",
    value: string,
  ) =>
    setProfile((previous) => ({
      ...previous,
      websiteTestimonials: (previous.websiteTestimonials || []).map((item) =>
        item.id === id ? { ...item, [key]: value, isDemo: false } : item,
      ),
    }));
  const updateTestimonialRating = (id: string, value: string) =>
    setProfile((previous) => ({
      ...previous,
      websiteTestimonials: (previous.websiteTestimonials || []).map((item) =>
        item.id === id
          ? {
              ...item,
              rating: Math.max(0, Math.min(5, Number(value) || 0)),
              isDemo: false,
            }
          : item,
      ),
    }));
  const addTestimonial = () =>
    setProfile((previous) => {
      const current = previous.websiteTestimonials || [];
      if (current.length >= 6) return previous;
      return {
        ...previous,
        websiteTestimonials: [...current, {
          id: `ii-review-${Date.now()}`,
          name: "",
          location: "",
          rating: 0,
          serviceName: "",
          comment: "",
          avatarUrl: "",
          date: "",
        }],
      };
    });
  const removeTestimonial = (index: number) =>
    setProfile((previous) => ({
      ...previous,
      websiteTestimonials: (previous.websiteTestimonials || []).filter((item) => item.id !== testimonials[index]?.id),
    }));

  const updateSocial = (key: SocialKey, value: string) =>
    setProfile((previous) => ({ ...previous, [key]: value }));

  const media = ironInkMediaTopics(config.media);
  const patchMedia = (next: IronInkMediaTopic[]) => patch({ media: next });
  const updateMedia = (
    id: string,
    key: "title" | "caption" | "posterUrl" | "href" | "isDemo",
    value: string | boolean,
  ) =>
    patchMedia(
      media.map((topic) => (topic.id === id ? { ...topic, [key]: value } : topic)),
    );
  const addMedia = () =>
    patchMedia([
      ...media,
      {
        id: `ii-media-custom-${Date.now()}`,
        title: "",
        caption: "",
        posterUrl: IRON_INK_MEDIA_FALLBACK_POSTER,
        href: "",
        isDemo: true,
      },
    ]);
  const removeMedia = (id: string) =>
    patchMedia(media.filter((topic) => topic.id !== id));
  const resetMedia = () => patch({ media: undefined });

  const ownerReels = (profile.socialVideos || []).filter((video) => !video.isDemo);
  const updateReel = (
    id: string,
    key: "title" | "description" | "thumbnailUrl" | "youtubeUrl",
    value: string,
  ) =>
    setProfile((previous) => ({
      ...previous,
      socialVideos: (previous.socialVideos || []).map((video) =>
        video.id === id ? { ...video, [key]: value } : video,
      ),
    }));
  const removeReel = (id: string) =>
    setProfile((previous) => ({
      ...previous,
      socialVideos: (previous.socialVideos || []).filter((video) => video.id !== id),
    }));

  const loyalty = loyaltyConfig;
  const updateLoyalty = (next: Partial<LoyaltyConfig>) =>
    setLoyaltyConfig?.((previous) => ({ ...previous, ...next }));
  const updateReward = (id: string, next: Partial<RewardThreshold>) =>
    setLoyaltyConfig?.((previous) => ({
      ...previous,
      rewards: (previous.rewards || []).map((reward) =>
        reward.id === id ? { ...reward, ...next } : reward,
      ),
    }));
  const addPerk = (perk: RewardThreshold) =>
    setLoyaltyConfig?.((previous) => ({
      ...previous,
      rewards: [
        ...(previous.rewards || []),
        { ...perk, id: `ii-perk-${Date.now()}`, isActive: false },
      ],
    }));
  const removePerk = (id: string) =>
    setLoyaltyConfig?.((previous) => ({
      ...previous,
      rewards: (previous.rewards || []).filter((reward) => reward.id !== id),
    }));

  return (
    <section className="ii-editor" aria-label="Template 12 content settings">
      <div className="ii-editor-head">
        <span className="ii-kicker">TEMPLATE 12 · IRON & INK</span>
        <h2>Shape your studio site</h2>
        <p>
          All 30 tattoo and body-art categories start enabled with a starting
          price, session duration and detailed description. Customize them here;
          your existing profile, artists and gallery are used automatically.
        </p>
      </div>
      <div className="ii-editor-grid">
        <label>
          Hero image URL
          <input
            value={config.heroImage || ""}
            placeholder={ironInkDefaults.heroImage}
            onChange={(e) => patch({ heroImage: e.target.value })}
          />
        </label>
        <label>
          Studio interior image URL
          <input
            value={config.interiorImage || ""}
            placeholder={ironInkDefaults.interiorImage}
            onChange={(e) => patch({ interiorImage: e.target.value })}
          />
        </label>
        <label>
          Booking deposit (₹)
          <input
            type="number"
            min="0"
            value={config.bookingDeposit ?? ironInkDefaults.bookingDeposit}
            onChange={(e) => patch({ bookingDeposit: Number(e.target.value) })}
          />
        </label>
      </div>

      <h3>
        Social profiles <small>Follow our studio cards</small>
      </h3>
      <p>
        Enter a handle (for example <code>@ironandink.delhi</code>) or the full
        profile URL. Only valid https profiles are shown; empty or invalid
        platforms stay hidden on the public site.
      </p>
      <div className="ii-editor-grid">
        {SOCIAL_FIELDS.map((field) => {
          const value = String(profile[field.key] || "");
          const link = ironInkSocialLink(field.platform, value);
          const invalid = Boolean(value.trim()) && !link;
          return (
            <label key={field.key}>
              {field.label} <small>{field.hint}</small>
              <input
                value={value}
                placeholder={
                  field.platform === "instagram"
                    ? "@ironandink.delhi"
                    : `https://www.${field.platform}.com/your-studio`
                }
                aria-invalid={invalid}
                aria-describedby={`ii-social-help-${field.key}`}
                onChange={(e) => updateSocial(field.key, e.target.value)}
              />
              <span
                id={`ii-social-help-${field.key}`}
                role={invalid ? "alert" : "status"}
                className={invalid ? "ii-editor-error" : "ii-editor-hint"}
              >
                {!value.trim()
                  ? "Not configured — this card will be hidden."
                  : invalid
                    ? `Enter a valid ${field.label} handle or https profile URL.`
                    : `Shown as ${link?.handle} · opens ${link?.url}`}
              </span>
            </label>
          );
        })}
      </div>

      <h3>
        Featured videos &amp; reels <small>Posters, titles, captions and links</small>
      </h3>
      <p>
        The studio guides below are illustrative demo posters, not client work.
        Replace a poster, title, caption or link with your own. Nothing here
        autoplays with sound.
      </p>
      <div className="ii-media-editor">
        {media.map((topic, index) => {
          const posterOk = !topic.posterUrl || Boolean(ironInkPosterSrc(topic.posterUrl));
          const linkOk = !topic.href || Boolean(ironInkVideoLink(topic.href));
          return (
            <article className="ii-media-editor-card" key={topic.id}>
              <div className="ii-media-editor-head">
                <strong>Guide {index + 1}</strong>
                <button type="button" className="ii-outline" onClick={() => removeMedia(topic.id)}>
                  REMOVE
                </button>
              </div>
              <label>
                Title
                <input
                  aria-label={`Guide ${index + 1} title`}
                  value={topic.title}
                  onChange={(e) => updateMedia(topic.id, "title", e.target.value)}
                />
              </label>
              <label>
                Caption
                <textarea
                  aria-label={`Guide ${index + 1} caption`}
                  rows={3}
                  value={topic.caption}
                  onChange={(e) => updateMedia(topic.id, "caption", e.target.value)}
                />
              </label>
              <label>
                Poster image URL
                <input
                  aria-label={`Guide ${index + 1} poster URL`}
                  value={topic.posterUrl}
                  placeholder={IRON_INK_MEDIA_FALLBACK_POSTER}
                  aria-invalid={!posterOk}
                  onChange={(e) => updateMedia(topic.id, "posterUrl", e.target.value)}
                />
                <span role={posterOk ? "status" : "alert"} className={posterOk ? "ii-editor-hint" : "ii-editor-error"}>
                  {posterOk
                    ? "Use an uploaded https image or a bundled /templates/12 path."
                    : "Poster must be an https image URL or a local /path."}
                </span>
              </label>
              <label>
                Video or reel link (optional)
                <input
                  aria-label={`Guide ${index + 1} video link`}
                  value={topic.href || ""}
                  placeholder="https://www.youtube.com/shorts/…"
                  aria-invalid={!linkOk}
                  onChange={(e) => updateMedia(topic.id, "href", e.target.value)}
                />
                <span role={linkOk ? "status" : "alert"} className={linkOk ? "ii-editor-hint" : "ii-editor-error"}>
                  {linkOk
                    ? "Only YouTube or Instagram links are accepted. Leave empty to show a poster guide with no video."
                    : "Link must be a YouTube or Instagram https URL."}
                </span>
              </label>
              <label className="ii-enable">
                <input
                  type="checkbox"
                  checked={topic.isDemo !== false}
                  onChange={(e) => updateMedia(topic.id, "isDemo", e.target.checked)}
                />
                <span>Label as illustrative demo poster</span>
              </label>
            </article>
          );
        })}
      </div>
      <div className="ii-editor-actions">
        <button type="button" className="ii-outline" onClick={addMedia}>
          ADD A MEDIA CARD
        </button>
        <button type="button" className="ii-outline" onClick={resetMedia}>
          RESET TO STUDIO EXAMPLES
        </button>
      </div>

      <h3>
        Your linked reels <small>Existing Social &amp; Videos configuration</small>
      </h3>
      {ownerReels.length ? (
        ownerReels.map((video, index) => {
          const linkOk = !video.youtubeUrl || Boolean(socialVideoSource(video.youtubeUrl));
          const posterOk = !video.thumbnailUrl || Boolean(ironInkPosterSrc(video.thumbnailUrl));
          return (
            <div className="ii-media-editor-card" key={video.id}>
              <div className="ii-media-editor-head">
                <strong>Reel {index + 1}</strong>
                <button type="button" className="ii-outline" onClick={() => removeReel(video.id)}>
                  REMOVE
                </button>
              </div>
              <label>
                Title
                <input
                  aria-label={`Reel ${index + 1} title`}
                  value={video.title}
                  onChange={(e) => updateReel(video.id, "title", e.target.value)}
                />
              </label>
              <label>
                Caption
                <textarea
                  aria-label={`Reel ${index + 1} caption`}
                  rows={2}
                  value={video.description || ""}
                  onChange={(e) => updateReel(video.id, "description", e.target.value)}
                />
              </label>
              <label>
                Poster image URL
                <input
                  aria-label={`Reel ${index + 1} poster URL`}
                  value={video.thumbnailUrl || ""}
                  aria-invalid={!posterOk}
                  onChange={(e) => updateReel(video.id, "thumbnailUrl", e.target.value)}
                />
              </label>
              <label>
                Video link
                <input
                  aria-label={`Reel ${index + 1} video link`}
                  value={video.youtubeUrl}
                  aria-invalid={!linkOk}
                  onChange={(e) => updateReel(video.id, "youtubeUrl", e.target.value)}
                />
                <span role={linkOk ? "status" : "alert"} className={linkOk ? "ii-editor-hint" : "ii-editor-error"}>
                  {linkOk
                    ? "YouTube or Instagram video/reel URL."
                    : "Enter a valid YouTube or Instagram video/reel URL."}
                </span>
              </label>
            </div>
          );
        })
      ) : (
        <p className="ii-editor-hint">
          No owner reels are linked yet. Template 12 shows the studio guides
          above until you add reels in <strong>Social &amp; videos</strong>.
        </p>
      )}

      <IronInkSocialVideosManager />

      <h3>
        Loyalty &amp; rewards <small>Perks are promises — enable only what you honour</small>
      </h3>
      {setLoyaltyConfig ? (
        <>
          <p>
            Perks are saved through your existing StudioFlow workspace sync.
            Only enabled perks are published. Examples below stay inactive until
            you add, edit, enable and save them.
          </p>
          <label className="ii-enable">
            <input
              type="checkbox"
              checked={loyalty?.programEnabled === true}
              onChange={(e) => updateLoyalty({ programEnabled: e.target.checked })}
            />
            <span>Loyalty programme enabled on the public site</span>
          </label>
          <div className="ii-editor-grid">
            <label>
              Points per eligible visit
              <input
                type="number"
                min="0"
                value={loyalty?.pointsPerVisit ?? 0}
                onChange={(e) => updateLoyalty({ pointsPerVisit: Math.max(0, Number(e.target.value) || 0) })}
              />
            </label>
            <label>
              Points per ₹100 spent
              <input
                type="number"
                min="0"
                value={loyalty?.pointsPerHundredSpent ?? 0}
                onChange={(e) => updateLoyalty({ pointsPerHundredSpent: Math.max(0, Number(e.target.value) || 0) })}
              />
            </label>
          </div>
          <h4>Published perks</h4>
          {(loyalty?.rewards || []).length ? (
            (loyalty?.rewards || []).map((reward, index) => (
              <article className="ii-perk-editor-card" key={reward.id}>
                <label className="ii-enable">
                  <input
                    type="checkbox"
                    checked={reward.isActive}
                    onChange={(e) => updateReward(reward.id, { isActive: e.target.checked })}
                  />
                  <span>{reward.isActive ? "Published" : "Not published"}</span>
                </label>
                <label>
                  Perk title
                  <input
                    aria-label={`Perk ${index + 1} title`}
                    value={reward.title}
                    onChange={(e) => updateReward(reward.id, { title: e.target.value })}
                  />
                </label>
                <label>
                  Description
                  <textarea
                    aria-label={`Perk ${index + 1} description`}
                    rows={2}
                    value={reward.description}
                    onChange={(e) => updateReward(reward.id, { description: e.target.value })}
                  />
                </label>
                <div className="ii-editor-grid">
                  <label>
                    Points required
                    <input
                      aria-label={`Perk ${index + 1} points required`}
                      type="number"
                      min="0"
                      value={reward.requiredPoints}
                      onChange={(e) => updateReward(reward.id, { requiredPoints: Math.max(0, Number(e.target.value) || 0) })}
                    />
                  </label>
                  <label>
                    Reward value
                    <input
                      aria-label={`Perk ${index + 1} reward value`}
                      type="number"
                      min="0"
                      value={reward.discountValue}
                      onChange={(e) => updateReward(reward.id, { discountValue: Math.max(0, Number(e.target.value) || 0) })}
                    />
                  </label>
                </div>
                <div className="ii-editor-actions">
                  <button type="button" className="ii-outline" onClick={() => removePerk(reward.id)}>
                    REMOVE PERK
                  </button>
                </div>
              </article>
            ))
          ) : (
            <p className="ii-editor-hint">No perks saved yet. Add an example below.</p>
          )}
          <h4>Example perks (inactive until you add them)</h4>
          <div className="ii-perk-suggestions">
            {IRON_INK_PERK_SUGGESTIONS.map((suggestion) => (
              <article key={suggestion.id}>
                <strong>{suggestion.title}</strong>
                <p>{suggestion.description}</p>
                <button type="button" className="ii-outline" onClick={() => addPerk(suggestion)}>
                  USE THIS EXAMPLE
                </button>
              </article>
            ))}
          </div>
          <button
            type="button"
            className="ii-outline"
            onClick={() => addPerk(blankIronInkPerk(`ii-perk-${Date.now()}`))}
          >
            ADD A BLANK PERK
          </button>
        </>
      ) : (
        <p role="status">
          Perk editing is available in the Owner Workspace Loyalty &amp; Rewards
          settings for this studio.
        </p>
      )}

      <h3>
        30 styles &amp; body-art services{" "}
        <small>Enable, price, duration, description and image</small>
      </h3>
      <div className="ii-category-settings">
        {categories.map((item) => (
          <article className="ii-category-setting" key={item.slug}>
            <label className="ii-enable">
              <input
                type="checkbox"
                checked={item.enabled}
                onChange={(e) =>
                  updateCategory(item.slug, "enabled", e.target.checked)
                }
              />
              <span>{item.name}</span>
            </label>
            <label>
              Starting at ₹
              <input
                type="number"
                min="0"
                value={item.price}
                onChange={(e) =>
                  updateCategory(item.slug, "price", Number(e.target.value))
                }
              />
            </label>
            <label>
              Duration
              <input
                value={item.duration}
                onChange={(e) =>
                  updateCategory(item.slug, "duration", e.target.value)
                }
              />
            </label>
            <label>
              Service description
              <textarea
                rows={3}
                value={item.description}
                onChange={(e) =>
                  updateCategory(item.slug, "description", e.target.value)
                }
              />
            </label>
            <label>
              Image URL
              <input
                value={item.image}
                onChange={(e) =>
                  updateCategory(item.slug, "image", e.target.value)
                }
              />
            </label>
          </article>
        ))}
      </div>
      <h3>Frequently asked questions</h3>
      {(config.faq || ironInkDefaults.faq).map((faq, index) => (
        <div className="ii-faq-edit" key={index}>
          <input
            aria-label={`FAQ ${index + 1} question`}
            value={faq.question}
            onChange={(e) => updateFaq(index, "question", e.target.value)}
          />
          <textarea
            aria-label={`FAQ ${index + 1} answer`}
            value={faq.answer}
            onChange={(e) => updateFaq(index, "answer", e.target.value)}
          />
        </div>
      ))}
      <h3>Client testimonials</h3>
      <p>Add only reviews you have permission to publish. Empty reviews are not shown on the storefront.</p>
      {testimonials.slice(0, 6).map((item, index) => (
        <div className="ii-testimonial-edit" key={item.id}>
          <input
            aria-label={`Testimonial ${index + 1} client name`}
            value={item.name}
            onChange={(e) => updateTestimonial(item.id, "name", e.target.value)}
          />
          <input
            aria-label={`Testimonial ${index + 1} client photo URL`}
            value={item.avatarUrl || ""}
            placeholder="Client photo URL"
            onChange={(e) =>
              updateTestimonial(item.id, "avatarUrl", e.target.value)
            }
          />
          <label>
            Rating (0–5)
            <input
              aria-label={`Testimonial ${index + 1} rating out of 5`}
              type="number"
              min="0"
              max="5"
              step="0.1"
              value={item.rating || 0}
              onChange={(e) =>
                updateTestimonialRating(item.id, e.target.value)
              }
            />
          </label>
          <textarea
            aria-label={`Testimonial ${index + 1} review`}
            value={item.comment}
            onChange={(e) =>
              updateTestimonial(item.id, "comment", e.target.value)
            }
          />
          <button type="button" className="ii-outline" onClick={()=>removeTestimonial(index)}>REMOVE REVIEW</button>
        </div>
      ))}
      {testimonials.length<6&&<button type="button" className="ii-outline" onClick={addTestimonial}>ADD A CLIENT REVIEW</button>}
    </section>
  );
}
