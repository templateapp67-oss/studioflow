import { useEffect, useRef, useState } from 'react';
import { Gift } from 'lucide-react';
import { REWARD_IMAGE_BASE } from './content';

/** Variants written by `scripts/build-growth-rewards-assets.mjs`. */
const VARIANTS = {
  /** 4:3 studio frame used by the reward cards. */
  card: { suffix: '', widths: [480, 720, 960], fallbackWidth: 720, ratio: 4 / 3 },
  /** 1:1 frame used by the medallions of the hero illustration. */
  thumb: { suffix: '-thumb', widths: [128, 256], fallbackWidth: 256, ratio: 1 },
} as const;

export type RewardImageVariant = keyof typeof VARIANTS;

export function rewardImageUrl(slug: string, variant: RewardImageVariant, width: number) {
  return `${REWARD_IMAGE_BASE}/${slug}${VARIANTS[variant].suffix}-${width}.webp`;
}

interface RewardImageProps {
  slug: string;
  /** Text alternative. Pass an empty string when the image is decorative. */
  alt: string;
  /** The `sizes` hint for the slot this image fills. */
  sizes: string;
  variant?: RewardImageVariant;
  /** Load and decode immediately; use only for small imagery above the fold. */
  eager?: boolean;
}

/**
 * Responsive reward visual with a designed fallback.
 *
 * The slot never collapses and never shows a broken-image glyph: if the file
 * cannot be loaded, the same box shows a gift mark on the studio backdrop and
 * keeps the text alternative. An image can fail before React attaches its
 * listeners to the prerendered markup, so its state is also read once on mount.
 */
export function RewardImage({ slug, alt, sizes, variant = 'card', eager = false }: RewardImageProps) {
  const image = useRef<HTMLImageElement>(null);
  const [failed, setFailed] = useState(false);
  const { widths, fallbackWidth, ratio } = VARIANTS[variant];

  useEffect(() => {
    const node = image.current;
    if (node && node.complete && node.naturalWidth === 0) setFailed(true);
  }, []);

  if (failed) {
    return alt ? (
      <span className="ngr-image ngr-image--missing" role="img" aria-label={alt}>
        <Gift aria-hidden="true" />
      </span>
    ) : (
      <span className="ngr-image ngr-image--missing" aria-hidden="true">
        <Gift />
      </span>
    );
  }

  return (
    <img
      ref={image}
      className="ngr-image"
      src={rewardImageUrl(slug, variant, fallbackWidth)}
      srcSet={widths.map((width) => `${rewardImageUrl(slug, variant, width)} ${width}w`).join(', ')}
      sizes={sizes}
      width={fallbackWidth}
      height={Math.round(fallbackWidth / ratio)}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding={eager ? 'sync' : 'async'}
      onError={() => setFailed(true)}
    />
  );
}
