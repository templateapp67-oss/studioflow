import {
  BarChart3,
  Boxes,
  Building2,
  CalendarDays,
  ChartNoAxesColumn,
  Flower2,
  Globe,
  Hand,
  HeartPulse,
  Image,
  IndianRupee,
  Layers,
  Megaphone,
  Palette,
  PenTool,
  Scissors,
  Share2,
  Sparkles,
  Store,
  Type,
  UserCog,
  UsersRound,
  WandSparkles,
  Brush,
  type LucideIcon,
} from 'lucide-react';

/**
 * One icon family (lucide) with a single stroke treatment for the whole
 * landing page. Keys match the `icon` fields used by the landing content.
 */
export const LANDING_ICON_REGISTRY: Record<string, LucideIcon> = {
  appointments: CalendarDays,
  brush: Brush,
  calendar: CalendarDays,
  chart: ChartNoAxesColumn,
  globe: Globe,
  hand: Hand,
  heart: HeartPulse,
  image: Image,
  inventory: Boxes,
  layers: Layers,
  megaphone: Megaphone,
  palette: Palette,
  pen: PenTool,
  razor: Brush,
  rose: Flower2,
  flower: Flower2,
  scissors: Scissors,
  share: Share2,
  sparkles: Sparkles,
  store: Store,
  staff: UserCog,
  type: Type,
  users: UsersRound,
  wand: WandSparkles,
  building: Building2,
  currency: IndianRupee,
  rupee: IndianRupee,
  analytics: BarChart3,
};

export function LandingIcon({ name, size = 20, className }: { name: string; size?: number; className?: string }) {
  const Icon = LANDING_ICON_REGISTRY[name] ?? Sparkles;
  return <Icon size={size} aria-hidden="true" className={className} strokeWidth={1.75} />;
}
