import {
  AppBar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import {
  AdminPanelSettings,
  Assignment,
  Badge,
  CalendarMonth,
  DirectionsCar,
  DoorFront,
  Groups,
  Menu,
  NotificationsActive,
  People,
  Phone,
  ReceiptLong,
  Settings,
} from '@mui/icons-material'
import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom'
import { useMemo, useState } from 'react'
import type { ReactElement } from 'react'
import type { Role } from '../types/roles'
import { useSessionStore } from '../store/sessionStore'

const drawerWidth = 280

type NavItem = {
  kind: 'section' | 'link'
  label: string
  to?: string
  icon?: ReactElement
  anyOfRoles: Role[]
}

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
      },
      { kind: 'link', label: 'Job Creation', to: '/jc', icon: <Settings />, anyOfRoles: ['Job Creation'] },
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

      {
        kind: 'link',
        label: 'My Tasks',
        to: '/tasks',
        icon: <Assignment />,
        anyOfRoles: ['Technician', 'Service Advisor', 'Service Engineer', 'Custom Role', 'Job Creation', 'Admin'],
      },
      {
        kind: 'link',
        label: 'Calendar',
        to: '/calendar',
        icon: <CalendarMonth />,
        anyOfRoles: ['Technician', 'Custom Role', 'Admin'],
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
        anyOfRoles: ['Admin', 'Job Creation', 'Guard', 'CRE', 'Technician', 'Service Advisor', 'Service Engineer', 'QC', 'Custom Role'],
      },
    ],
    [],
  )

  const allowedItems = navItems.filter((item) => user && item.anyOfRoles.some((r) => user.roles.includes(r)))

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle2" color="text.secondary">
          Continental Works
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
          Workshop Platform
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {user ? `Signed in as ${user.name}` : 'Not signed in'}
        </Typography>
      </Box>
      <Divider />
      <List sx={{ px: 1, py: 1 }}>
        {allowedItems.map((item) => {
          if (item.kind === 'section') {
            return (
              <Box key={`section:${item.label}`} sx={{ px: 2, py: 1.25 }}>
                <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800, letterSpacing: 0.6 }}>
                  {item.label}
                </Typography>
              </Box>
            )
          }

          const to = item.to ?? '#'
          const selected = location.pathname === to || location.pathname.startsWith(to + '/')
          return (
            <ListItemButton
              key={to}
              component={RouterLink}
              to={to}
              selected={selected}
              onClick={() => setMobileOpen(false)}
              sx={{ borderRadius: 2, mx: 1, my: 0.5 }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          )
        })}
      </List>
      <Box sx={{ flexGrow: 1 }} />
      <Divider />
      <List sx={{ px: 1, py: 1 }}>
        <ListItemButton component={RouterLink} to="/admin" disabled={!user?.roles.includes('Admin')} sx={{ borderRadius: 2, mx: 1, my: 0.5 }}>
          <ListItemIcon sx={{ minWidth: 40 }}>
            <Settings />
          </ListItemIcon>
          <ListItemText primary="Settings" />
        </ListItemButton>
      </List>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
          backgroundColor: 'background.paper',
          color: 'text.primary',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Toolbar>
          {!mdUp ? (
            <IconButton edge="start" onClick={() => setMobileOpen((v) => !v)}>
              <Menu />
            </IconButton>
          ) : null}
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {allowedItems
              .filter((i) => i.kind === 'link')
              .find((i) => location.pathname.startsWith(i.to ?? ''))?.label ?? 'Home'}
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Button variant="outlined" onClick={logout}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        {!mdUp ? (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            ModalProps={{ keepMounted: true }}
            sx={{
              display: { xs: 'block', md: 'none' },
              '& .MuiDrawer-paper': { width: drawerWidth },
            }}
          >
            {drawer}
          </Drawer>
        ) : null}

        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
          }}
          open
        >
          <Toolbar />
          {drawer}
        </Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, width: { md: `calc(100% - ${drawerWidth}px)` } }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  )
}
