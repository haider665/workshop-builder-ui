import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material'
import { Search } from '@mui/icons-material'
import { useMemo, useState } from 'react'
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
  onClick?: () => void
  drilldownLabel?: string
}

export function StatCard({ icon, title, label, value, gradient, color, details, onClick, drilldownLabel }: StatCardProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [records, setRecords] = useState<{ id: string; cells: string[]; source?: HTMLElement }[]>([])
  const displayTitle = title ?? label ?? ''
  const displayGradient = gradient ?? (color ? `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)` : 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)')
  const visibleRecords = useMemo(() => { const query = search.trim().toLowerCase(); return query ? records.filter((record) => record.cells.join(' ').toLowerCase().includes(query)) : records }, [records, search])
  const drilldown = onClick ?? (() => {
    const rows = Array.from(document.querySelectorAll<HTMLElement>('main tbody tr')).filter((row) => row.offsetParent !== null).map((row, index) => ({ id: `${index}-${row.innerText.slice(0, 24)}`, cells: Array.from(row.querySelectorAll<HTMLElement>('td')).map((cell) => cell.innerText.trim()).filter(Boolean), source: row }))
    setRecords(rows.length ? rows : (details ?? []).map((detail, index) => ({ id: String(index), cells: [detail.label, String(detail.value)] })))
    setSearch(''); setOpen(true)
  })
  return (
    <><Box role="button" tabIndex={0} aria-label={drilldownLabel ?? `View ${displayTitle} details`} onClick={drilldown} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); drilldown() } }} sx={{
      flex: 1, minWidth: 180, borderRadius: radii.lg, background: displayGradient,
      color: '#fff', p: 2.5, position: 'relative', overflow: 'hidden',
      boxShadow: '0 4px 24px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.1)',
      transition: 'transform 0.3s cubic-bezier(0.32,0.72,0,1), box-shadow 0.3s cubic-bezier(0.32,0.72,0,1)',
      cursor: 'pointer',
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
      '&:focus-visible': { outline: '3px solid rgba(59,130,246,.55)', outlineOffset: 3 },
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
    {!onClick ? <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md" slotProps={{ paper: { sx: { borderRadius: { xs: 2.5, sm: 3.5 }, maxHeight: { xs: '92dvh', sm: '86vh' }, m: { xs: 1, sm: 3 } } } }}>
      <DialogTitle sx={{ pb: 1 }}><Typography sx={{ fontWeight: 850, fontSize: '1.2rem' }}>{displayTitle}</Typography><Typography color="text.secondary" sx={{ fontSize: '.8rem' }}>{visibleRecords.length} visible record{visibleRecords.length === 1 ? '' : 's'}</Typography></DialogTitle>
      <DialogContent dividers sx={{ bgcolor: '#f8fafc', p: { xs: 1.5, sm: 2.5 } }}><TextField fullWidth size="small" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search these records" slotProps={{ input: { startAdornment: <Search sx={{ mr: 1, color: '#94a3b8' }} /> } }} sx={{ mb: 2, bgcolor: '#fff' }} /><Stack spacing={1.25}>{visibleRecords.map((record) => <Box key={record.id} sx={{ p: 1.75, borderRadius: 2.5, border: '1px solid #e2e8f0', bgcolor: '#fff' }}><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}><Box>{record.cells.map((cell, index) => <Typography key={`${record.id}-${index}`} sx={{ fontWeight: index === 0 ? 800 : 500, color: index === 0 ? '#0f172a' : '#64748b', fontSize: index === 0 ? '.9rem' : '.78rem' }}>{cell}</Typography>)}</Box>{record.source ? <Button size="small" onClick={() => { setOpen(false); window.setTimeout(() => record.source?.click(), 0) }}>Open record</Button> : null}</Stack></Box>)}{!visibleRecords.length ? <Box sx={{ py: 6, textAlign: 'center' }}><Typography sx={{ fontWeight: 800 }}>No records available</Typography><Typography color="text.secondary" sx={{ fontSize: '.82rem' }}>There are no matching records for this summary.</Typography></Box> : null}</Stack></DialogContent>
      <DialogActions sx={{ px: 2.5, py: 1.5 }}><Button variant="contained" onClick={() => setOpen(false)} sx={{ bgcolor: '#0f172a' }}>Close</Button></DialogActions>
    </Dialog> : null}</>
  )
}
