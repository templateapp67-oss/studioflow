import { colorsSchema, themePresetSchema } from './schemas';
import type { Settings, ThemePreset } from '../types';

export const THEME_PRESETS: Record<ThemePreset, { name: string; description: string; sandal: string; neem: string; turmeric: string; terracotta: string; ink: string; paper: string; muted: string; line: string }> = {
  neem: { name: 'Neem garden', description: 'Forest green & warm sandalwood', sandal: '#F6EEDD', neem: '#2F4A3A', turmeric: '#D9A233', terracotta: '#B4572F', ink: '#1E1B16', paper: '#FCFAF5', muted: '#62675C', line: '#DCDDD0' },
  saffron: { name: 'Saffron morning', description: 'Golden light & soft ivory', sandal: '#F8EDD9', neem: '#694522', turmeric: '#D9A233', terracotta: '#A34827', ink: '#2B2118', paper: '#FFFBF3', muted: '#72614C', line: '#E7D8BE' },
  rose_clay: { name: 'Rose clay', description: 'Earthly rose & handmade paper', sandal: '#F4E7E1', neem: '#633F3B', turmeric: '#C9974B', terracotta: '#A54F43', ink: '#2D201E', paper: '#FCF7F4', muted: '#78615B', line: '#E4D2CA' },
  midnight_herb: { name: 'Midnight herb', description: 'Deep botanical green & gold', sandal: '#20382E', neem: '#E4EAD6', turmeric: '#E2B95E', terracotta: '#EAA17D', ink: '#F6EEDD', paper: '#192F27', muted: '#BCC9B8', line: '#40564A' },
  sandal: { name: 'Sandalwood quiet', description: 'Soft timber & olive leaves', sandal: '#EFE8D9', neem: '#505A38', turmeric: '#C6A052', terracotta: '#995738', ink: '#29291E', paper: '#F9F7F0', muted: '#666B56', line: '#DADCCB' },
};
export const THEME_KEY = 'veda-theme';
export function readSavedTheme(): ThemePreset | null {
  try { const value = localStorage.getItem(THEME_KEY); const result = themePresetSchema.safeParse(value); return result.success ? result.data : null; } catch { return null; }
}
export function saveTheme(theme: ThemePreset) { try { localStorage.setItem(THEME_KEY, theme); } catch { /* Private browsing: theme remains available for this visit. */ } }
function rgb(hex: string) { return `${parseInt(hex.slice(1, 3), 16)} ${parseInt(hex.slice(3, 5), 16)} ${parseInt(hex.slice(5, 7), 16)}`; }
export function applyTheme(preset: ThemePreset, overrides: Settings['colors'] = {}, root: HTMLElement = document.documentElement) {
  const base = THEME_PRESETS[preset];
  const colors = colorsSchema.parse(overrides);
  const values = { sandal: colors.sandalwood ?? base.sandal, neem: colors.neem ?? base.neem, turmeric: colors.turmeric ?? base.turmeric, terracotta: colors.terracotta ?? base.terracotta, ink: colors.ink ?? base.ink };
  for (const [key, value] of Object.entries(values)) { root.style.setProperty(`--${key}`, value); root.style.setProperty(`--${key}-rgb`, rgb(value)); }
  const custom = Object.keys(colors).length > 0;
  root.style.setProperty('--paper', custom ? values.sandal : base.paper);
  root.style.setProperty('--muted', custom ? values.ink : base.muted);
  root.style.setProperty('--line', custom ? values.neem + '30' : base.line);
  root.dataset.theme = preset;
  root.style.colorScheme = preset === 'midnight_herb' && !custom ? 'dark' : 'light';
}
