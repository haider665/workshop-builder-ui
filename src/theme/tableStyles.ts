import { colors, radii, shadows } from './tokens'

/* ─────────────────────────────────────────────────────────── */
/*  Shared table style tokens for the premium design system  */
/* ─────────────────────────────────────────────────────────── */

/** Outer wrapper for table sections — rounded card with border + shadow */
export const tableSectionSx = {
  borderRadius: radii.lg,
  border: `1px solid ${colors.border.default}`,
  background: colors.bg.card,
  boxShadow: shadows.card,
  overflow: 'hidden',
} as const

/** Table header cells — uppercase, letter-spaced, subtle bg */
export const headerCellSx = {
  background: colors.bg.subtle,
  borderBottom: `1px solid ${colors.border.default}`,
  color: colors.slate[600],
  fontSize: '0.7rem',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  py: 1.5,
  '&:first-of-type': { pl: 3 },
  '&:last-of-type': { pr: 3 },
} as const

/** Table body cells — subtle bottom border, consistent padding */
export const bodyCellSx = {
  borderBottom: `1px solid ${colors.border.subtle}`,
  py: 1.5,
  '&:first-of-type': { pl: 3 },
  '&:last-of-type': { pr: 3 },
} as const

/** Section header for table cards — black accent bar, icon pill, gradient bg */
export const tableHeaderSx = {
  px: 3,
  py: 1.75,
  borderBottom: `1px solid ${colors.border.default}`,
  background: `linear-gradient(135deg, ${colors.bg.subtle} 0%, ${colors.bg.card} 100%)`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  position: 'relative' as const,
  '&::before': {
    content: '""',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    background: colors.slate[900],
    borderRadius: '0 4px 4px 0',
  },
} as const

/** Icon pill for table section headers */
export const tableHeaderIconSx = {
  width: 30,
  height: 30,
  borderRadius: '8px',
  background: colors.slate[100],
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: colors.slate[900],
} as const

/** Title text for table section headers */
export const tableHeaderTitleSx = {
  fontWeight: 800,
  fontSize: '0.88rem',
  color: colors.slate[900],
  letterSpacing: '0.01em',
  textTransform: 'uppercase' as const,
} as const
