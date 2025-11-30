/* ═══════════════════════════════════════════════════════════════════════════════
   VITAEGIS - Design System Constants
   Instagram-Level Polish • Native Experience
   ═══════════════════════════════════════════════════════════════════════════════ */

// Core Color Palette
export const colors = {
  vitaeGreen: '#00ff00',
  vitaeGreenDim: '#003311',
  vitaeGreenGlow: 'rgba(0, 255, 65, 0.5)',
  vitaeGreenLight: 'rgba(0, 255, 65, 0.2)',
  black: '#000000',
  white: '#ffffff',
  separator: 'rgba(255, 255, 255, 0.15)',
  
  // Glass backgrounds
  glass: {
    default: 'rgba(0, 0, 0, 0.2)',
    subtle: 'rgba(0, 0, 0, 0.1)',
    prominent: 'rgba(0, 0, 0, 0.3)',
  },
  
  // Text opacity levels
  text: {
    primary: 'rgba(255, 255, 255, 1)',
    secondary: 'rgba(255, 255, 255, 0.7)',
    tertiary: 'rgba(255, 255, 255, 0.5)',
    disabled: 'rgba(255, 255, 255, 0.3)',
  },
} as const;

// Instagram Spacing System (4px base unit)
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const;

// Instagram Typography Scale
export const typography = {
  xs: { fontSize: 12, lineHeight: 16 },
  sm: { fontSize: 14, lineHeight: 18 },
  base: { fontSize: 16, lineHeight: 20 },
  lg: { fontSize: 20, lineHeight: 24 },
  xl: { fontSize: 24, lineHeight: 28 },
  '2xl': { fontSize: 28, lineHeight: 32 },
  '3xl': { fontSize: 36, lineHeight: 40 },
  '4xl': { fontSize: 48, lineHeight: 52 },
  '5xl': { fontSize: 64, lineHeight: 68 },
} as const;

// Animation Physics
export const animations = {
  spring: {
    damping: 15,
    stiffness: 150,
    mass: 1,
  },
  bouncy: {
    damping: 10,
    stiffness: 180,
    mass: 0.8,
  },
  gentle: {
    damping: 20,
    stiffness: 100,
    mass: 1.2,
  },
  snappy: {
    damping: 18,
    stiffness: 300,
    mass: 0.6,
  },
} as const;

// Timing durations (ms)
export const durations = {
  instant: 100,
  fast: 150,
  normal: 250,
  slow: 400,
  slower: 600,
} as const;

// Border Radii
export const radii = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
} as const;

// Shadows / Glows
export const shadows = {
  glow: {
    shadowColor: colors.vitaeGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  glowSubtle: {
    shadowColor: colors.vitaeGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
} as const;

// Tab Bar Constants (iOS Standard)
export const tabBar = {
  height: 49,
  iconSize: 24,
  labelSize: 10,
} as const;

// Safe Area Defaults (fallbacks)
export const safeArea = {
  top: 47, // iPhone notch
  bottom: 34, // iPhone home indicator
} as const;

// Navigation Items
export const navItems = [
  { id: 'home', label: 'HOME', icon: 'home' },
  { id: 'about', label: 'ABOUT', icon: 'information-circle' },
  { id: 'practices', label: 'LIVE', icon: 'videocam' },
  { id: 'token', label: 'STORE', icon: 'bag' },
  { id: 'community', label: 'CONNECT', icon: 'people' },
] as const;

// Practices Data
export const practices = [
  {
    id: 'zen',
    name: 'ZEN',
    subtitle: '禅',
    description: 'Mindful meditation for mental clarity',
    color: '#00ff00',
    icon: '🧘',
  },
  {
    id: 'kundalini',
    name: 'KUNDALINI',
    subtitle: 'कुण्डलिनी',
    description: 'Awaken your dormant energy',
    color: '#ff6600',
    icon: '🔥',
  },
  {
    id: 'taichi',
    name: 'TAI CHI',
    subtitle: '太極',
    description: 'Moving meditation for balance',
    color: '#0099ff',
    icon: '☯️',
  },
  {
    id: 'qigong',
    name: 'QI GONG',
    subtitle: '氣功',
    description: 'Cultivate life force energy',
    color: '#cc00ff',
    icon: '🌀',
  },
] as const;

export type NavItemId = (typeof navItems)[number]['id'];
export type PracticeId = (typeof practices)[number]['id'];
