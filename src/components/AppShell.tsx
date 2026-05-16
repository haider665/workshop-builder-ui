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
  Menu,
  People,
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
      { kind: 'link', label: 'Guard', to: '/guard', icon: <DoorFront />, anyOfRoles: ['Guard'] },

      { kind: 'section', label: 'CRO', anyOfRoles: ['CRO'] },
      { kind: 'link', label: 'CRO Home', to: '/cro', icon: <People />, anyOfRoles: ['CRO'] },
      { kind: 'link', label: 'Customers', to: '/cro/customers', icon: <People />, anyOfRoles: ['CRO'] },
      { kind: 'link', label: 'Vehicles', to: '/cro/vehicles', icon: <DirectionsCar />, anyOfRoles: ['CRO'] },
      { kind: 'link', label: 'Appointments', to: '/cro/appointments', icon: <CalendarMonth />, anyOfRoles: ['CRO'] },

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
        anyOfRoles: ['Technician', 'Service Advisor', 'Service Engineer', 'Custom Role', 'Job Creation', 'Admin'],
      },
      {
        kind: 'link',
        label: 'Vehicle History',
        to: '/vehicle-history',
        icon: <DirectionsCar />,
        anyOfRoles: ['Admin', 'Job Creation', 'CRO'],
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
        anyOfRoles: ['Admin', 'Job Creation', 'Guard', 'CRO', 'Technician', 'Service Advisor', 'Service Engineer', 'Custom Role'],
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
