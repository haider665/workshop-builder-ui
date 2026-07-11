import {
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  useMediaQuery,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import {
  AdminPanelSettings,
  Assignment,
  Badge,
  CalendarMonth,
  Calculate,
  DirectionsCar,
  DoorFront,
  Groups,
  Inventory,
  Logout,
  Menu,
  NotificationsActive,
  People,
  Phone,
  ReceiptLong,
  Settings,
  ShoppingCart,
  Store,
  Storefront,
} from '@mui/icons-material'
import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom'
import { useMemo, useState } from 'react'
import type { ReactElement } from 'react'
import type { Role } from '../types/roles'
import { useSessionStore } from '../store/sessionStore'
import { useCwStore } from '../store/cwStore'

/* ─────────────────────── Constants ─────────────────────────── */

const drawerWidth = 264
const SPRING_EASE = 'cubic-bezier(0.32, 0.72, 0, 1)'

/* ─────────────────── Dark Sidebar Palette ─────────────────── */

const sb = {
  bg: '#0F172A',
  bgSubtle: 'rgba(255,255,255,0.06)',
  bgSelected: 'rgba(255,255,255,0.12)',
  bgHover: 'rgba(255,255,255,0.08)',
  text: 'rgba(255,255,255,0.92)',
  textMuted: 'rgba(255,255,255,0.55)',
  textFaint: 'rgba(255,255,255,0.35)',
  border: 'rgba(255,255,255,0.08)',
  accent: '#FFFFFF',
  iconDefault: 'rgba(255,255,255,0.5)',
  iconSelected: '#FFFFFF',
} as const

/* ─────────────────────── Types ─────────────────────────────── */

type NavItem = {
  kind: 'section' | 'link'
  label: string
  to?: string
  icon?: ReactElement
  anyOfRoles: Role[]
  exactMatch?: boolean
}

/* ─────────────────────── Notification Badge ────────────────── */

function NotificationBadge() {
  const count = useCwStore((s) => s.getUnreadCount)()
  if (count === 0) return null
  return (
    <Box
      sx={{
        bgcolor: '#ef4444',
        color: '#fff',
        borderRadius: '9999px',
        px: 0.75,
        fontSize: '0.65rem',
        fontWeight: 700,
        lineHeight: '16px',
        minWidth: 16,
        textAlign: 'center',
      }}
    >
      {count > 99 ? '99+' : count}
    </Box>
  )
}

/* ─────────────────────── Component ─────────────────────────── */

export function AppShell() {
  const user = useSessionStore((s) => s.user)
  const logout = useSessionStore((s) => s.logout)
  const location = useLocation()
  const theme = useTheme()
  const mdUp = useMediaQuery(theme.breakpoints.up('md'))
  const [mobileOpen, setMobileOpen] = useState(false)

  const navItems = useMemo<NavItem[]>(
    () => [
      {
        kind: 'link',
        label: 'Admin',
        to: '/admin',
        icon: <AdminPanelSettings />,
        anyOfRoles: ['Admin'],
        exactMatch: true,
      },
      { kind: 'link', label: 'Job Creation', to: '/jc', icon: <Settings />, anyOfRoles: ['Job Creation'], exactMatch: true },
      { kind: 'link', label: 'JC Calendar', to: '/jc/calendar', icon: <CalendarMonth />, anyOfRoles: ['Job Creation'] },
      { kind: 'link', label: 'Gantt View', to: '/jc/gantt', icon: <Assignment />, anyOfRoles: ['Job Creation'] },
      { kind: 'link', label: 'Bay Management', to: '/jc/bays', icon: <Settings />, anyOfRoles: ['Job Creation'] },
      { kind: 'link', label: 'Gatepass', to: '/guard', icon: <DoorFront />, anyOfRoles: ['Guard'] },

      { kind: 'section', label: 'Service Advisor', anyOfRoles: ['Service Advisor'] },
      { kind: 'link', label: 'SA Appointments', to: '/sa/appointments', icon: <CalendarMonth />, anyOfRoles: ['Service Advisor'] },
      { kind: 'link', label: 'SA Calendar', to: '/sa/calendar', icon: <CalendarMonth />, anyOfRoles: ['Service Advisor'] },
      { kind: 'link', label: 'Jobs', to: '/jc/jobs/new', icon: <Settings />, anyOfRoles: ['Service Advisor'] },

      { kind: 'section', label: 'Service Engineer', anyOfRoles: ['Service Engineer'] },
      { kind: 'link', label: 'SE Appointments', to: '/se/appointments', icon: <CalendarMonth />, anyOfRoles: ['Service Engineer'] },
      { kind: 'link', label: 'SE Calendar', to: '/se/calendar', icon: <CalendarMonth />, anyOfRoles: ['Service Engineer'] },

      { kind: 'section', label: 'Technician', anyOfRoles: ['Technician'] },
      { kind: 'link', label: 'My Tasks', to: '/technician', icon: <CalendarMonth />, anyOfRoles: ['Technician'] },

      { kind: 'section', label: 'QC', anyOfRoles: ['QC'] },
      { kind: 'link', label: 'QC Appointments', to: '/qc/appointments', icon: <CalendarMonth />, anyOfRoles: ['QC'] },

      { kind: 'section', label: 'CRE', anyOfRoles: ['CRE'] },
      { kind: 'link', label: 'Dashboard', to: '/cre', icon: <People />, anyOfRoles: ['CRE'] },
      { kind: 'link', label: 'Manage Customer', to: '/cre/customers', icon: <People />, anyOfRoles: ['CRE'] },
      { kind: 'link', label: 'Manage Vehicles', to: '/cre/vehicles', icon: <DirectionsCar />, anyOfRoles: ['CRE'] },
      { kind: 'link', label: 'Appointments', to: '/cre/appointments', icon: <CalendarMonth />, anyOfRoles: ['CRE'] },
      { kind: 'link', label: 'Calendar', to: '/cre/calendar', icon: <CalendarMonth />, anyOfRoles: ['CRE'] },
      { kind: 'link', label: 'Call History', to: '/cre/calls', icon: <Phone />, anyOfRoles: ['CRE'] },
      { kind: 'link', label: 'Reminders', to: '/cre/reminders', icon: <NotificationsActive />, anyOfRoles: ['CRE'] },
      { kind: 'section', label: 'Admin Config', anyOfRoles: ['Admin'] },
      { kind: 'link', label: 'Concerns', to: '/admin/concerns', icon: <AdminPanelSettings />, anyOfRoles: ['Admin'] },
      { kind: 'link', label: 'Services', to: '/admin/services', icon: <ReceiptLong />, anyOfRoles: ['Admin'] },
      { kind: 'link', label: 'Teams', to: '/admin/teams', icon: <Groups />, anyOfRoles: ['Admin'] },
      { kind: 'link', label: 'Parts', to: '/admin/parts', icon: <Settings />, anyOfRoles: ['Admin'] },
      { kind: 'link', label: 'Part Requests', to: '/admin/part-requests', icon: <ReceiptLong />, anyOfRoles: ['Admin'] },
      { kind: 'link', label: 'Reports', to: '/admin/reports', icon: <Assignment />, anyOfRoles: ['Admin'] },

      { kind: 'section', label: 'Parts Department', anyOfRoles: ['Parts', 'Admin'] },
      { kind: 'link', label: 'Purchase Module', to: '/parts/purchase-orders', icon: <ShoppingCart />, anyOfRoles: ['Parts', 'Admin'] },
      { kind: 'link', label: 'Vendor Management', to: '/parts/vendors', icon: <Storefront />, anyOfRoles: ['Parts', 'Admin'] },
      { kind: 'link', label: 'Counter Desk', to: '/parts/counter-desk', icon: <Store />, anyOfRoles: ['Parts', 'Admin'] },
      { kind: 'link', label: 'Inventory Tracker', to: '/parts/inventory', icon: <Inventory />, anyOfRoles: ['Parts', 'Admin'] },
      { kind: 'link', label: 'Estimator', to: '/parts/estimator', icon: <Calculate />, anyOfRoles: ['Parts', 'Admin'] },

      {
        kind: 'link',
        label: 'My Tasks',
        to: '/tasks',
        icon: <Assignment />,
        anyOfRoles: ['Technician', 'Service Advisor', 'Service Engineer', 'Job Creation', 'Admin'],
      },
      {
        kind: 'link',
        label: 'Calendar',
        to: '/calendar',
        icon: <CalendarMonth />,
        anyOfRoles: ['Technician', 'Admin'],
      },
      {
        kind: 'link',
        label: 'Vehicle History',
        to: '/vehicle-history',
        icon: <DirectionsCar />,
        anyOfRoles: ['Admin', 'Job Creation', 'CRE'],
      },
      {
        kind: 'link',
        label: 'Employee Records',
        to: '/employee-records',
        icon: <ReceiptLong />,
        anyOfRoles: ['Admin', 'Job Creation'],
      },
      {
        kind: 'link',
        label: 'Notifications',
        to: '/notifications',
        icon: <Badge />,
        anyOfRoles: ['Admin', 'Job Creation', 'Guard', 'CRE', 'Technician', 'Service Advisor', 'Service Engineer', 'QC'],
      },
    ],
    [],
  )

  const allowedItems = navItems.filter((item) => user && item.anyOfRoles.some((r) => user.roles.includes(r)))



  const drawer = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: sb.bg,
      }}
    >
      {/* ── Brand Header ── */}
      <Box sx={{ p: 2.5, pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 13, letterSpacing: 1 }}>
              CW
            </Typography>
          </Box>
          <Box>
            <Typography
              sx={{
                fontSize: '0.65rem',
                color: sb.textFaint,
                letterSpacing: '0.18em',
                fontWeight: 600,
                textTransform: 'uppercase',
                lineHeight: 1.2,
              }}
            >
              Continental Works
            </Typography>
            <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: sb.text, lineHeight: 1.3 }}>
              Workshop
            </Typography>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ borderColor: sb.border, mx: 2 }} />

      {/* ── Navigation List ── */}
      <List
        component="nav"
        aria-label="Main navigation"
        sx={{ px: 1.25, py: 1.5, overflowY: 'auto', flexGrow: 1 }}
      >
        {allowedItems.map((item) => {
          if (item.kind === 'section') {

            return (
              <Box key={`section:${item.label}`} sx={{ px: 1, pt: 2.5, pb: 0.75 }}>
                <Typography
                  component="h3"
                  sx={{
                    fontSize: '0.65rem',
                    color: sb.textFaint,
                    fontWeight: 700,
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                  }}
                >
                  {item.label}
                </Typography>
              </Box>
            )
          }

          const to = item.to ?? '#'
          const selected = item.exactMatch
            ? location.pathname === to
            : location.pathname === to || location.pathname.startsWith(to + '/')

          return (
            <ListItemButton
              key={to}
              component={RouterLink}
              to={to}
              selected={selected}
              onClick={() => setMobileOpen(false)}
              aria-current={selected ? 'page' : undefined}
              sx={{
                borderRadius: '10px',
                mx: 0.25,
                my: '2px',
                py: 0.85,
                px: 1.5,
                color: selected ? sb.accent : sb.textMuted,
                transition: `all 200ms ${SPRING_EASE}`,
                '&.Mui-selected': {
                  backgroundColor: sb.bgSelected,
                  color: sb.accent,
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.15)' },
                  '& .MuiListItemIcon-root': { color: sb.iconSelected },
                  /* Left accent indicator */
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 4,
                    height: 24,
                    borderRadius: '0 3px 3px 0',
                    background: sb.accent,
                  },
                },
                '&:hover': {
                  backgroundColor: sb.bgHover,
                  color: sb.text,
                  '& .MuiListItemIcon-root': { color: sb.text },
                },
                '&:focus-visible': {
                  outline: `2px solid ${sb.accent}`,
                  outlineOffset: '-2px',
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 34,
                  color: selected ? sb.iconSelected : sb.iconDefault,
                  transition: `color 200ms ${SPRING_EASE}`,
                  '& .MuiSvgIcon-root': { fontSize: 20 },
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={
                  item.label === 'Notifications' ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {item.label}
                      <NotificationBadge />
                    </Box>
                  ) : (
                    item.label
                  )
                }
                sx={{
                  '& .MuiListItemText-primary': {
                    fontSize: '0.85rem',
                    fontWeight: selected ? 700 : 500,
                    letterSpacing: '-0.01em',
                  },
                }}
              />
            </ListItemButton>
          )
        })}
      </List>

      <Divider sx={{ borderColor: sb.border, mx: 2 }} />

      {/* ── User Footer ── */}
      <Box sx={{ p: 1.5 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            p: 1.5,
            borderRadius: '12px',
            background: sb.bgSubtle,
          }}
        >
          {/* Avatar */}
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 12, lineHeight: 1 }}>
              {(() => {
                const parts = (user?.name ?? '').trim().split(/\s+/)
                if (parts.length === 0 || !parts[0]) return 'U'
                return parts.length >= 2
                  ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
                  : parts[0][0].toUpperCase()
              })()}
            </Typography>
          </Box>
          {/* Name + Email */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: sb.text,
                lineHeight: 1.3,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user?.name ?? 'User'}
            </Typography>
            <Typography
              sx={{
                fontSize: '0.72rem',
                color: sb.textMuted,
                lineHeight: 1.4,
                mt: 0.15,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user?.email ?? ''}
            </Typography>
          </Box>
          {/* Logout */}
          <IconButton
            onClick={logout}
            aria-label="Logout"
            size="small"
            sx={{
              color: sb.textMuted,
              flexShrink: 0,
              transition: `all 200ms ${SPRING_EASE}`,
              '&:hover': {
                backgroundColor: 'rgba(239,68,68,0.15)',
                color: '#FCA5A5',
              },
              '&:focus-visible': {
                outline: '2px solid #FCA5A5',
                outlineOffset: '-2px',
              },
            }}
          >
            <Logout sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </Box>
    </Box>
  )

  const drawerPaper = {
    width: drawerWidth,
    boxSizing: 'border-box' as const,
    backgroundColor: sb.bg,
    borderRight: `1px solid ${sb.border}`,
    boxShadow: 'none',
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        {!mdUp ? (
          <>
            <Box
              sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                height: 56,
                backgroundColor: 'rgba(15,23,42,0.95)',
                backdropFilter: 'blur(12px)',
                borderBottom: `1px solid ${sb.border}`,
                display: 'flex',
                alignItems: 'center',
                px: 1,
                zIndex: (t) => t.zIndex.drawer + 1,
              }}
            >
              <IconButton
                onClick={() => setMobileOpen((v) => !v)}
                aria-label="Open navigation menu"
                sx={{
                  color: '#fff',
                  '&:focus-visible': {
                    outline: '2px solid #fff',
                    outlineOffset: '2px',
                  },
                }}
              >
                <Menu />
              </IconButton>
              <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', ml: 1, color: '#fff' }}>
                Continental Works
              </Typography>
            </Box>
            <Drawer
              variant="temporary"
              open={mobileOpen}
              onClose={() => setMobileOpen(false)}
              ModalProps={{ keepMounted: true }}
              sx={{
                display: { xs: 'block', md: 'none' },
                '& .MuiDrawer-paper': drawerPaper,
              }}
            >
              {drawer}
            </Drawer>
          </>
        ) : null}

        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': drawerPaper,
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: { xs: '56px', md: 0 },
          backgroundColor: '#F8F9FC',
          minHeight: '100vh',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  )
}
