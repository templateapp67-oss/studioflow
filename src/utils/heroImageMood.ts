export interface HeroAIStyling {
  dominantColor: string;
  overlayOpacity: number;
  textColor: string;
  accentColor: string;
}

export async function extractImageMoodAsync(imageUrl: string): Promise<HeroAIStyling> {
  return {
    dominantColor: '#000000',
    overlayOpacity: 0.4,
    textColor: '#ffffff',
    accentColor: '#f59e0b'
  };
}

export function computeHeroAIStyling(imageUrl?: string): HeroAIStyling {
  return {
    dominantColor: '#000000',
    overlayOpacity: 0.4,
    textColor: '#ffffff',
    accentColor: '#f59e0b'
  };
}
