/**
 * Tek ikon dili: arayüzdeki ikon-rol emojilerinin tümü bu sarmalayıcı
 * üzerinden lucide ince çizgi ikonlarına taşındı (G4). Emoji fontu
 * olmayan platformlarda (başsız Chromium, bazı Android WebView'lar)
 * kutu çıkmaması ve tüm platformlarda tutarlı görünüm için.
 *
 * Yalnızca burada `lucide-react-native` import edilir; ekranlar/bileşenler
 * doğrudan import etmez. Ağaç sarsma için yalnızca kullanılan ikonlar
 * adlı import ile alınır.
 *
 * Kullanım: `<Icon name="home" size={22} color={colors.primary} />`
 */
import {
  BellRing,
  BookOpen,
  Check,
  CircleUser,
  Coffee,
  Compass,
  FastForward,
  Flame,
  Gem,
  Gift,
  Globe,
  Hand,
  Heart,
  HeartCrack,
  House,
  Keyboard,
  Lightbulb,
  Lock,
  Megaphone,
  MessageCircle,
  MessagesSquare,
  Mic,
  Notebook,
  PartyPopper,
  RotateCcw,
  Send,
  ShoppingBag,
  Smartphone,
  Snowflake,
  Square,
  Stethoscope,
  Trophy,
  Turtle,
  Volume2,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';

const ICONS = {
  home: House,
  review: RotateCcw,
  chat: MessageCircle,
  trophy: Trophy,
  user: CircleUser,
  heart: Heart,
  flame: Flame,
  zap: Zap,
  gem: Gem,
  lock: Lock,
  check: Check,
  x: X,
  party: PartyPopper,
  snowflake: Snowflake,
  megaphone: Megaphone,
  globe: Globe,
  volume: Volume2,
  mic: Mic,
  square: Square,
  send: Send,
  keyboard: Keyboard,
  messages: MessagesSquare,
  gift: Gift,
  heartCrack: HeartCrack,
  turtle: Turtle,
  story: BookOpen,
  notes: Notebook,
  skip: FastForward,
  coffee: Coffee,
  hand: Hand,
  compass: Compass,
  shoppingBag: ShoppingBag,
  bellRing: BellRing,
  stethoscope: Stethoscope,
  smartphone: Smartphone,
  lightbulb: Lightbulb,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
};

/** Lucide ince çizgi ikonu (varsayılan strokeWidth 1.75). Dekoratifse accessible={false}. */
export function Icon({ name, size = 22, color = '#000000', strokeWidth = 1.75 }: IconProps) {
  const Glyph = ICONS[name];
  return <Glyph width={size} height={size} color={color} strokeWidth={strokeWidth} accessible={false} />;
}
