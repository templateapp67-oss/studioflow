import type { SocialVideo } from '../types';

export type IronInkMediaTopic = 'tattoos' | 'piercings' | 'aftercare' | 'behind_the_scenes';

export const IRON_INK_MEDIA_FALLBACK_POSTER = 'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?auto=format&fit=crop&w=800&q=80';

export const ironInkMediaTopics: { id: IronInkMediaTopic; label: string }[] = [
  { id: 'tattoos', label: 'Dark Realism Tattoos' },
  { id: 'piercings', label: 'Surgical Piercings' },
  { id: 'aftercare', label: 'Tattoo Aftercare' },
  { id: 'behind_the_scenes', label: 'Studio BTS' }
];

export const ironInkOwnerVideos: SocialVideo[] = [
  {
    id: 'ink-video-1',
    title: 'Custom Blackwork Sleeve Stencil & Inking Session',
    url: 'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?auto=format&fit=crop&w=800&q=80',
    platform: 'reels',
    thumbnailUrl: 'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?auto=format&fit=crop&w=800&q=80',
    aspectRatio: '9:16',
    topic: 'tattoos'
  },
  {
    id: 'ink-video-2',
    title: 'Precision Helix Piercing with Implant Grade Titanium',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
    platform: 'reels',
    thumbnailUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
    aspectRatio: '9:16',
    topic: 'piercings'
  }
];
