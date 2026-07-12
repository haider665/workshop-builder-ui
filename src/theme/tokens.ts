/**
 * Design tokens for the Workshop Builder UI.
 * Centralizes colors, spacing, shadows, and border-radius
 * so pages don't hardcode hex values.
 */

/* ─────────────────── Color Palette ─────────────────────── */

export const colors = {
  /* Slate scale — primary text hierarchy */
  slate: {
    950: '#020617',
    900: '#0F172A',
    800: '#1E293B',
    700: '#334155',
    600: '#475569',
    500: '#64748B',
    400: '#94A3B8',
    300: '#CBD5E1',
    200: '#E2E8F0',
    100: '#F1F5F9',
    50: '#F8FAFC',
  },

  /* Page & surface backgrounds */
  bg: {
    page: '#F8F9FC',
    card: '#FFFFFF',
    cardHover: 'rgba(0,0,0,0.02)',
    subtle: 'rgba(0,0,0,0.03)',
    overlay: 'rgba(15,23,42,0.08)',
  },

  /* Borders */
  border: {
    default: 'rgba(0,0,0,0.07)',
    subtle: 'rgba(0,0,0,0.04)',
    strong: 'rgba(0,0,0,0.12)',
    focus: '#0F172A',
  },

  /* Status colors */
  status: {
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    neutral: '#64748B',
  },

  /* Accent colors — used for section identity */
  accent: {
    indigo: '#6366f1',
    teal: '#14b8a6',
    emerald: '#10b981',
    amber: '#f59e0b',
    orange: '#f97316',
    blue: '#3b82f6',
    cyan: '#06b6d4',
    purple: '#8b5cf6',
    red: '#ef4444',
  },
} as const

/* ─────────────────── Shadows ─────────────────────────── */

export const shadows = {
  /** Subtle card shadow */
  card: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
  /** Elevated card shadow (hover, modals) */
  elevated: '0 4px 16px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)',
  /** Dialog/modal shadow */
  dialog: '0 16px 48px rgba(0,0,0,0.12), 0 8px 16px rgba(0,0,0,0.06)',
} as const

/* ─────────────────── Border Radius ─────────────────────── */

export const radii = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  full: '9999px',
} as const

/* ─────────────────── Motion ─────────────────────────────── */

export const motion = {
  springEase: 'cubic-bezier(0.32, 0.72, 0, 1)',
  fast: '150ms',
  normal: '220ms',
  slow: '350ms',
  entry: '600ms',
} as const

/* ─────────────────── Spacing (reference) ──────────────── */

/** Standard page layout padding */
export const pageLayout = {
  px: { xs: 2, sm: 3, md: 4 },
  py: { xs: 3, md: 4 },
} as const
