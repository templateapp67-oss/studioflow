import type { SocialVideo } from '../types';
import { ironInkPosterSrc, ironInkVideoLink } from './ironInkSocial';

export interface IronInkMediaTopic {
  id: string;
  title: string;
  caption: string;
  posterUrl: string;
  href?: string;
  isDemo?: boolean;
}

export const IRON_INK_MEDIA_FALLBACK_POSTER = '/templates/12/media/studio-practice.jpg';

export const IRON_INK_MEDIA_TOPICS: IronInkMediaTopic[] = [
  {
    id: 'guide-fine-line',
    title: 'Precision fine-line linework & needle tuning',
    caption: 'Mastering the single-needle fine-line craft with tailored voltage and delicate skin tensioning.',
    posterUrl: '/templates/12/media/artist-process.jpg',
    isDemo: true,
    href: ''
  },
  {
    id: 'guide-healed',
    title: 'Healed blackwork and contrast longevity',
    caption: 'Follow our Healed client pieces through the months to see how solid saturation stays rich and bold.',
    posterUrl: '/templates/12/media/healed-work.jpg',
    isDemo: true,
    href: ''
  },
  {
    id: 'guide-studio',
    title: 'Inside our private studio & clinical sterility',
    caption: 'A complete walk-through of the studio sanitisation ritual, autoclave packaging and disposable grips.',
    posterUrl: '/templates/12/media/studio-practice.jpg',
    isDemo: true,
    href: ''
  },
  {
    id: 'guide-piercing',
    title: 'Piercing hygiene with ASTM F136 titanium',
    caption: 'Strict aseptic Piercing hygiene practices paired with internally threaded implant-grade titanium studs.',
    posterUrl: '/templates/12/media/piercing-hygiene.jpg',
    isDemo: true,
    href: ''
  },
  {
    id: 'guide-aftercare',
    title: 'Aftercare essentials for second-skin healing',
    caption: 'Step-by-step Aftercare guidance for breathable protective film, gentle washing, and hydration balms.',
    posterUrl: '/templates/12/media/aftercare.jpg',
    isDemo: true,
    href: ''
  },
  {
    id: 'guide-reference',
    title: 'Curating reference images & custom sketches',
    caption: 'How to assemble your moodboards and reference designs before meeting your artist for a bespoke sleeve.',
    posterUrl: '/templates/12/media/custom-design.jpg',
    isDemo: true,
    href: ''
  }
];

export function ironInkMediaTopics(saved?: IronInkMediaTopic[]): IronInkMediaTopic[] {
  if (saved === undefined) return IRON_INK_MEDIA_TOPICS;
  if (!Array.isArray(saved)) return [];
  return saved;
}

export function ironInkOwnerVideos(source?: { socialVideos?: any[] } | any[]): SocialVideo[] {
  const rawList = Array.isArray(source)
    ? source
    : Array.isArray(source?.socialVideos)
      ? source?.socialVideos
      : [];

  return rawList
    .filter((v: any) => {
      if (!v || typeof v !== 'object') return false;
      const url = v.youtubeUrl || v.url || v.videoUrl || '';
      if (!url || typeof url !== 'string') return false;
      if (url.startsWith('javascript:') || url.startsWith('//')) return false;
      const link = ironInkVideoLink(url);
      if (!link) return false;
      return true;
    })
    .map((v: any) => ({
      ...v,
      thumbnailUrl: ironInkPosterSrc(v.thumbnailUrl) || ''
    }));
}
