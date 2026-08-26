import { useMemo, useState } from 'react'
import { Box, Button, Chip, Stack, Typography } from '@mui/material'
import {
  AccountBalance,
  AssignmentReturn,
  Calculate,
  Inventory,
  LocalShipping,
  Notifications,
  Receipt,
  Settings,
  ShoppingCart,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { colors, pageLayout, shadows, radii } from '../theme/tokens'
import { useCwStore } from '../store/cwStore'
import type { CWNotificationCategory } from '../types/cw'

/* ─────────────────────── Helpers ─────────────────────────── */

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

type CategoryMeta = {
  label: string
  icon: React.ReactElement
  color: string
}

const CATEGORY_META: Record<CWNotificationCategory, CategoryMeta> = {
  parts_request: { label: 'Parts Request', icon: <Settings sx={{ fontSize: 18 }} />, color: colors.accent.orange },
  estimate: { label: 'Estimate', icon: <Calculate sx={{ fontSize: 18 }} />, color: colors.accent.purple },
  purchase_order: { label: 'Purchase Order', icon: <ShoppingCart sx={{ fontSize: 18 }} />, color: colors.accent.blue },
  requisition: { label: 'Requisition', icon: <LocalShipping sx={{ fontSize: 18 }} />, color: colors.accent.teal },
  grn: { label: 'GRN', icon: <Inventory sx={{ fontSize: 18 }} />, color: colors.accent.emerald },
  return: { label: 'Return', icon: <AssignmentReturn sx={{ fontSize: 18 }} />, color: colors.accent.red },
  advance: { label: 'Advance', icon: <AccountBalance sx={{ fontSize: 18 }} />, color: colors.accent.amber },
  invoice: { label: 'Invoice', icon: <Receipt sx={{ fontSize: 18 }} />, color: colors.accent.indigo },
  general: { label: 'General', icon: <Notifications sx={{ fontSize: 18 }} />, color: colors.slate[500] },
}

type FilterKey = 'all' | 'unread' | CWNotificationCategory

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'parts_request', label: 'Parts Request' },
  { key: 'estimate', label: 'Estimate' },
  { key: 'purchase_order', label: 'Purchase Order' },
  { key: 'requisition', label: 'Requisition' },
  { key: 'grn', label: 'GRN' },
  { key: 'return', label: 'Return' },
  { key: 'advance', label: 'Advance' },
]

/* ─────────────────────── Component ─────────────────────────── */

export function NotificationsPage() {
  const notifications = useCwStore((s) => s.notifications)
  const markNotificationRead = useCwStore((s) => s.markNotificationRead)
  const markAllNotificationsRead = useCwStore((s) => s.markAllNotificationsRead)
  const getUnreadCount = useCwStore((s) => s.getUnreadCount)
  const navigate = useNavigate()

  const [filter, setFilter] = useState<FilterKey>('all')
  const unreadCount = getUnreadCount()

  const filtered = useMemo(() => {
    let items = [...notifications]
    if (filter === 'unread') {
      items = items.filter((n) => !n.read)
    } else if (filter !== 'all') {
      items = items.filter((n) => n.category === filter)
    }
    // Sort newest first
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return items
  }, [notifications, filter])

  function handleClick(id: string, actionUrl?: string) {
    markNotificationRead(id)
    if (actionUrl) {
      try {
        const target = new URL(actionUrl, window.location.origin)
        if (target.origin !== window.location.origin) window.location.assign(target.toString())
        else navigate(`${target.pathname}${target.search}${target.hash}`)
      } catch {
        navigate(actionUrl)
      }
    }
  }

  return (
    <Box sx={{ px: pageLayout.px, py: pageLayout.py, maxWidth: 820, mx: 'auto' }}>
      {/* ── Header ── */}
      <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: colors.slate[900], letterSpacing: '-0.02em' }}>
            Notifications
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', color: colors.slate[500], mt: 0.25 }}>
            Stay updated on parts, orders, and approvals.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          {unreadCount > 0 && (
            <Box
              sx={{
                bgcolor: colors.status.info,
                color: '#fff',
                borderRadius: radii.full,
                px: 1,
                py: 0.25,
                fontSize: '0.75rem',
                fontWeight: 700,
                minWidth: 22,
                textAlign: 'center',
                lineHeight: 1.5,
              }}
            >
              {unreadCount}
            </Box>
          )}
          <Button
            variant="outlined"
            size="small"
            disabled={unreadCount === 0}
            onClick={markAllNotificationsRead}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.8rem',
              borderRadius: radii.sm,
              borderColor: colors.border.default,
              color: colors.slate[700],
              '&:hover': { borderColor: colors.slate[400], bgcolor: colors.bg.cardHover },
            }}
          >
            Mark All Read
          </Button>
        </Stack>
      </Stack>

      {/* ── Filter Chips ── */}
      <Stack direction="row" spacing={0.75} sx={{ mb: 3, flexWrap: 'wrap' }}>
        {FILTERS.map((f) => (
          <Chip
            key={f.key}
            label={f.label}
            size="small"
            onClick={() => setFilter(f.key)}
            sx={{
              fontWeight: filter === f.key ? 700 : 500,
              fontSize: '0.8rem',
              borderRadius: radii.full,
              bgcolor: filter === f.key ? colors.slate[900] : colors.bg.card,
              color: filter === f.key ? '#fff' : colors.slate[600],
              border: `1px solid ${filter === f.key ? colors.slate[900] : colors.border.default}`,
              cursor: 'pointer',
              '&:hover': {
                bgcolor: filter === f.key ? colors.slate[800] : colors.bg.cardHover,
              },
            }}
          />
        ))}
      </Stack>

      {/* ── Notification List ── */}
      {filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <Notifications sx={{ fontSize: 48, color: colors.slate[300], mb: 1.5 }} />
          <Typography sx={{ fontWeight: 600, color: colors.slate[600], fontSize: '1rem' }}>
            No notifications yet
          </Typography>
          <Typography sx={{ color: colors.slate[400], fontSize: '0.85rem', mt: 0.5 }}>
            {filter === 'unread'
              ? 'All caught up! No unread notifications.'
              : 'Notifications about parts, orders, and approvals will appear here.'}
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1}>
          {filtered.map((n) => {
            const meta = CATEGORY_META[n.category]
            return (
              <Box
                key={n.id}
                onClick={() => handleClick(n.id, n.actionUrl)}
                sx={{
                  display: 'flex',
                  gap: 1.5,
                  p: 2,
                  bgcolor: n.read ? colors.bg.card : 'rgba(59,130,246,0.04)',
                  borderRadius: radii.md,
                  boxShadow: shadows.card,
                  border: `1px solid ${colors.border.subtle}`,
                  borderLeft: n.read ? undefined : `4px solid ${colors.status.info}`,
                  cursor: 'pointer',
                  transition: 'all 180ms ease',
                  '&:hover': {
                    boxShadow: shadows.elevated,
                    bgcolor: n.read ? colors.bg.cardHover : 'rgba(59,130,246,0.06)',
                  },
                }}
              >
                {/* Category Icon */}
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    bgcolor: `${meta.color}14`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: meta.color,
                    mt: 0.25,
                  }}
                >
                  {meta.icon}
                </Box>

                {/* Content */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography
                      sx={{
                        fontWeight: n.read ? 500 : 700,
                        fontSize: '0.875rem',
                        color: colors.slate[900],
                        lineHeight: 1.4,
                      }}
                    >
                      {n.title}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '0.75rem',
                        color: colors.slate[400],
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        mt: 0.15,
                      }}
                    >
                      {timeAgo(n.createdAt)}
                    </Typography>
                  </Stack>

                  <Typography sx={{ fontSize: '0.8rem', color: colors.slate[500], mt: 0.25, lineHeight: 1.5 }}>
                    {n.message}
                  </Typography>

                  {n.actionUrl && (
                    <Typography
                      component="span"
                      sx={{
                        display: 'inline-block',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: colors.accent.blue,
                        mt: 0.75,
                        '&:hover': { textDecoration: 'underline' },
                      }}
                    >
                      View Details →
                    </Typography>
                  )}
                </Box>
              </Box>
            )
          })}
        </Stack>
      )}
    </Box>
  )
}
