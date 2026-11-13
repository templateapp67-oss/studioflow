import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

/**
 * `title-demote-to-label` (variant A) adapted to the NEXORA hero.
 *
 * The hero's `<h1>` starts centred and large, holds long enough to be read,
 * then flies to the top-left corner and lands as the section tag the layout
 * already reserves for it. The rest of the hero grows in beneath the flight —
 * the overlap is what keeps the transition gap-free.
 *
 * The flight is a FLIP: the tag is measured in its final layout position, the
 * browser is shown the inverted transform (scaled up, moved to centre) and only
 * the transform is transitioned, so text metrics stay continuous — the type is
 * never re-laid out and never smears. `transform-origin: left center` is what
 * lets the centring translate collapse to zero as the scale returns to 1.
 *
 * Timings are expressed in frames at 30fps (the reference card's rate) and
 * exposed to CSS as custom properties so the stylesheet and this timeline
 * cannot drift apart.
 */

const FRAME = 1000 / 30;

/** The tag's type size in `.nxh-hero__title`; the FLIP ratio is measured against it. */
const TAG_FONT_SIZE = 23;

export const NEXORA_TITLE_MOTION = {
  /** Word rise from behind its mask: 16f, 1.6f apart. */
  rise: 16 * FRAME,
  wordStagger: 1.6 * FRAME,
  /** The vermilion period pops 10f after the last word starts. */
  periodDelay: 10 * FRAME,
  periodPop: 300,
  /**
   * Hold before the demotion. The card asks for >=18s, which belongs to a
   * chapter opening where the title *is* the shot; in a hero the title shares
   * the frame with the navigation, so it is read-and-go.
   */
  hold: 1800,
  /** Eyebrow leaves with the takeoff (6f). */
  eyebrowOut: 6 * FRAME,
  /** The demotion itself: 26f asymmetric in-out. */
  demote: 26 * FRAME,
  /** Content starts growing 12f after the title leaves. */
  contentStart: 12 * FRAME,
  /** One content block: 18-22f. */
  contentGrow: 20 * FRAME,
  /** The "01 /" prefix takes over from the left before the title lands. */
  prefixDelay: 20 * FRAME,
  prefixIn: 6 * FRAME,
  /** Everything has landed. */
  settle: 1500,
} as const;

/** When the demotion begins, measured from the moment the hero is armed. */
export function demoteStartAt(wordCount: number) {
  return (
    NEXORA_TITLE_MOTION.rise +
    Math.max(0, wordCount - 1) * NEXORA_TITLE_MOTION.wordStagger +
    NEXORA_TITLE_MOTION.periodDelay +
    NEXORA_TITLE_MOTION.periodPop +
    NEXORA_TITLE_MOTION.hold
  );
}

export type NexoraHeroStage = 'static' | 'prep' | 'rise' | 'held' | 'fly' | 'settled';

const SEEN_KEY = 'nexora:hero-title-demoted';

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

function motionAllowed() {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  try {
    /* Run the sequence once per session: a hero that replays on every
       client-side navigation is a delay, not a delight. */
    return !window.sessionStorage.getItem(SEEN_KEY);
  } catch {
    /* Storage can be blocked (private mode); play the animation instead. */
    return true;
  }
}

export function useNexoraTitleDemote(wordCount: number): {
  heroRef: RefObject<HTMLElement | null>;
  copyRef: RefObject<HTMLDivElement | null>;
  titleRef: RefObject<HTMLHeadingElement | null>;
  stage: NexoraHeroStage;
} {
  const heroRef = useRef<HTMLElement | null>(null);
  const copyRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const startedRef = useRef(false);
  const [stage, setStage] = useState<NexoraHeroStage>('static');

  /* Arm before the first paint, so the static hero never flashes. */
  useIsomorphicLayoutEffect(() => {
    if (!motionAllowed()) return;
    setStage('prep');
  }, []);

  useEffect(() => {
    if (startedRef.current || !motionAllowed()) return;
    startedRef.current = true;

    const timers: number[] = [];
    let cancelled = false;
    const at = (ms: number, next: NexoraHeroStage) =>
      timers.push(
        window.setTimeout(() => {
          if (!cancelled) setStage(next);
        }, ms),
      );

    /**
     * Measures the landing slot and shows the browser the inverted transform.
     * Runs only once the type is settled, never against a fallback face.
     */
    const arm = () => {
      const hero = heroRef.current;
      const copy = copyRef.current;
      const title = titleRef.current;
      if (!hero || !copy || !title) return;

      /* The hero is already painted at the centred size; read it before the
         title is measured in its landing presentation. */
      const startSize = Number.parseFloat(window.getComputedStyle(title).fontSize) || 60;

      /* Landing metrics, taken with the tag's own type on the same element so
         the measurement cannot be overridden by selector order or a media
         query. Restored immediately after the read. */
      const inline = title.style;
      const saved = { fontSize: inline.fontSize, fontWeight: inline.fontWeight, letterSpacing: inline.letterSpacing };
      inline.fontSize = `${TAG_FONT_SIZE}px`;
      inline.fontWeight = '800';
      inline.letterSpacing = '-0.012em';

      const tag = title.getBoundingClientRect();
      const copyBox = copy.getBoundingClientRect();
      const heroBox = hero.getBoundingClientRect();

      inline.fontSize = saved.fontSize;
      inline.fontWeight = saved.fontWeight;
      inline.letterSpacing = saved.letterSpacing;

      const scale = Math.max(1.05, startSize / TAG_FONT_SIZE);

      /* Centre stage: the inverted transform is about the tag's left edge, so
         the left offset is the centred position of the *scaled* box. */
      const startLeft = heroBox.left + heroBox.width / 2 - (tag.width * scale) / 2;
      const startCenterY = copyBox.top + copyBox.height / 2;

      title.style.setProperty('--nxh-dx', `${startLeft - tag.left}px`);
      title.style.setProperty('--nxh-dy', `${startCenterY - (tag.top + tag.height / 2)}px`);
      title.style.setProperty('--nxh-k', scale.toFixed(3));
    };

    const begin = () => {
      if (cancelled) return;
      arm();
      setStage('rise');

      const demoteAt = demoteStartAt(wordCount);
      at(NEXORA_TITLE_MOTION.rise + NEXORA_TITLE_MOTION.wordStagger * wordCount + 500, 'held');
      at(demoteAt, 'fly');
      at(demoteAt + NEXORA_TITLE_MOTION.demote + NEXORA_TITLE_MOTION.settle, 'settled');
    };

    /* Measure against the real face; cap the wait so a slow font never stalls
       the hero behind an empty first screen. */
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts?.ready;
    const ready = Promise.race([
      fonts ?? Promise.resolve(),
      new Promise<void>((resolve) => {
        timers.push(window.setTimeout(resolve, 320));
      }),
    ]);
    void ready.then(begin);

    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [wordCount]);

  useEffect(() => {
    if (stage !== 'settled') return;
    try {
      window.sessionStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* Nothing to remember if storage is unavailable. */
    }
  }, [stage]);

  return { heroRef, copyRef, titleRef, stage };
}
