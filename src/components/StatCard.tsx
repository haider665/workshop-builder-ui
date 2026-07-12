import { Box, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { radii } from '../theme/tokens'

/* ─────────────────────────────────────────────────────────── */
/*  StatCard — premium dark gradient card with shine effect  */
/* ─────────────────────────────────────────────────────────── */

const cardShine = {
  '@keyframes cardShine': {
    '0%': { transform: 'translateX(-100%) skewX(-15deg)' },
    '100%': { transform: 'translateX(200%) skewX(-15deg)' },
  },
} as const

type StatCardProps = {
  icon: ReactNode
  title?: string
  /** @deprecated Use `title` instead */
  label?: string
  value: number | string
  gradient?: string
  /** @deprecated Use `gradient` instead — auto-mapped to gradient */
  color?: string
  details?: { label: string; value: number | string }[]
}

export function StatCard({ icon, title, label, value, gradient, color, details }: StatCardProps) {
  const displayTitle = title ?? label ?? ''
  const displayGradient = gradient ?? (color ? `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)` : 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)')
  return (
    <Box sx={{
      flex: 1, minWidth: 180, borderRadius: radii.lg, background: displayGradient,
      color: '#fff', p: 2.5, position: 'relative', overflow: 'hidden',
      boxShadow: '0 4px 24px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.1)',
      transition: 'transform 0.3s cubic-bezier(0.32,0.72,0,1), box-shadow 0.3s cubic-bezier(0.32,0.72,0,1)',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: '0 12px 36px rgba(0,0,0,0.25), 0 4px 12px rgba(0,0,0,0.12)',
        '& .card-shine': { animation: 'cardShine 0.6s ease forwards' },
      },
      '&::before': {
        content: '""', position: 'absolute', top: -30, right: -30,
        width: 120, height: 120, borderRadius: '50%',
        background: 'rgba(255,255,255,0.07)', pointerEvents: 'none',
      },
      '&::after': {
        content: '""', position: 'absolute', bottom: -40, left: -20,
        width: 100, height: 100, borderRadius: '50%',
        background: 'rgba(255,255,255,0.04)', pointerEvents: 'none',
      },
      ...cardShine,
    }}>
      {/* Shine sweep overlay */}
      <Box className="card-shine" sx={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
        background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)',
      }} />

      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1.5, position: 'relative', zIndex: 2 }}>
        <Box sx={{
          background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px',
          p: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </Box>
        <Typography sx={{
          fontSize: '0.72rem', fontWeight: 700, opacity: 0.85,
          textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          {displayTitle}
        </Typography>
      </Stack>
      <Typography sx={{
        fontSize: '2.2rem', fontWeight: 800, lineHeight: 1,
        position: 'relative', zIndex: 2, letterSpacing: '-0.02em',
        mb: details ? 1.5 : 0,
      }}>
        {value}
      </Typography>
      {details && (
        <Stack spacing={0.75} sx={{
          mt: 'auto', position: 'relative', zIndex: 2,
          pt: 1, borderTop: '1px solid rgba(255,255,255,0.1)',
        }}>
          {details.map((d) => (
            <Stack key={d.label} direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography sx={{ fontSize: '0.73rem', opacity: 0.65, fontWeight: 500 }}>{d.label}</Typography>
              <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, opacity: 0.95 }}>{d.value}</Typography>
            </Stack>
          ))}
        </Stack>
      )}
    </Box>
  )
}
