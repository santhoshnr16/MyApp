export const C = {
  bg: '#0A0F1E',
  surface: '#111827',
  elevated: '#1A2236',
  border: '#1E2D45',

  gold: '#C9A84C',
  goldSoft: '#F5ECD7',
  goldGlow: 'rgba(201,168,76,0.15)',
  goldBorder: 'rgba(201,168,76,0.3)',

  textPrimary: '#F0F4FF',
  textSecondary: '#8A9BBE',
  textMuted: '#4A5568',
  bodyText: '#C8D3E8',
  legalText: '#A0AEC0',

  highRisk: '#E53E3E',
  mediumRisk: '#DD6B20',
  lowRisk: '#38A169',

  mootRed: '#8B1A1A',
  mootRedBubble: '#2D0A0A',
  mootRedText: '#F5D5D5',
  mootNavy: '#1A3A6B',
  mootNavyBorder: '#1A3A6B',
  mootRedBorder: '#6B1A1A',

  glass: 'rgba(255,255,255,0.03)',
  glassBorder: 'rgba(255,255,255,0.08)',

  overlay: 'rgba(10,15,30,0.92)',
} as const;

const palette = {
  background: C.bg,
  surface: C.surface,
  elevated: C.elevated,
  border: C.border,

  primary: C.gold,
  accent: C.gold,
  accentSoft: C.goldGlow,

  textPrimary: C.textPrimary,
  textSecondary: C.textSecondary,
  textMuted: C.textMuted,

  highRisk: C.highRisk,
  mediumRisk: C.mediumRisk,
  lowRisk: C.lowRisk,

  success: C.lowRisk,
  warning: C.mediumRisk,
  danger: C.highRisk,

  overlay: C.overlay,
};

export const AppColors = {
  light: palette,
  dark: palette,
} as const;

export const Radius = {
  standard: 16,
  button: 12,
  pill: 99,
  bubble: 18,
  card: 16,
} as const;

export const RiskLevelColors = {
  high: C.highRisk,
  medium: C.mediumRisk,
  low: C.lowRisk,
} as const;

export const GlassCard = {
  backgroundColor: C.glass,
  borderTopWidth: 2,
  borderTopColor: C.gold,
  borderLeftWidth: 1,
  borderRightWidth: 1,
  borderBottomWidth: 1,
  borderLeftColor: C.glassBorder,
  borderRightColor: C.glassBorder,
  borderBottomColor: C.glassBorder,
  borderRadius: Radius.card,
  shadowColor: C.gold,
  shadowOpacity: 0.1,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 8 },
  elevation: 5,
} as const;
