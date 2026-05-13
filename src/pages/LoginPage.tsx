import {
  alpha,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSessionStore } from '../store/sessionStore'
import { ALL_ROLES } from '../types/roles'
import type { Role } from '../types/roles'

function normalizeRoles(selected: Record<Role, boolean>): Role[] {
  return ALL_ROLES.filter((r) => selected[r])
}

export function LoginPage() {
  const login = useSessionStore((s) => s.login)
  const navigate = useNavigate()
  const location = useLocation()

  const from = (location.state as { from?: { pathname?: string } } | null)?.from
    ?.pathname

  const [name, setName] = useState('Demo User')
  const [selectedRoles, setSelectedRoles] = useState<Record<Role, boolean>>({
    Admin: true,
    Guard: false,
    'Job Controller': false,
    CRO: false,
    Technician: false,
    'Service Advisor': false,
    'Service Engineer': false,
    'Custom Role': false,
  })
  const [showAllRoles, setShowAllRoles] = useState(false)

  const activeRoles = useMemo(
    () => normalizeRoles(selectedRoles),
    [selectedRoles],
  )

  return (
    <Box
      sx={(t) => ({
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        background: `radial-gradient(1200px 600px at 20% 10%, ${alpha(
          t.palette.primary.main,
          0.18,
        )}, transparent 60%), radial-gradient(900px 500px at 80% 0%, ${alpha(
          t.palette.secondary.main,
          0.12,
        )}, transparent 55%), ${t.palette.background.default}`,
      })}
    >
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Stack spacing={2} sx={{ mb: 3 }}>
          <Typography variant="overline" color="text.secondary">
            Continental Works
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 900, lineHeight: 1.05 }}>
            Workshop Platform
          </Typography>
          <Typography color="text.secondary">
            MVP mode: everything is stored in-memory only. A hard refresh (Ctrl+Shift+R) clears all data.
          </Typography>
        </Stack>

        <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
          <Stack spacing={2.5}>
            <TextField
              label="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
            />

            <Stack
              direction="row"
              spacing={1}
              sx={{ flexWrap: 'wrap' }}
              useFlexGap
            >
              {activeRoles.length ? (
                activeRoles.map((r) => <Chip key={r} label={r} />)
              ) : (
                <Chip color="warning" label="Select at least one role" />
              )}
            </Stack>

            <Divider />

            <Stack
              direction="row"
              sx={{ justifyContent: 'space-between', alignItems: 'center' }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Roles
              </Typography>
              <FormControlLabel
                control={<Switch checked={showAllRoles} onChange={(e) => setShowAllRoles(e.target.checked)} />}
                label="Show all"
              />
            </Stack>

            <FormControl component="fieldset">
              <FormGroup>
                {ALL_ROLES.filter((r) => showAllRoles || ['Admin', 'Guard', 'Job Controller', 'CRO', 'Technician'].includes(r)).map(
                  (role) => (
                    <FormControlLabel
                      key={role}
                      control={
                        <Switch
                          checked={selectedRoles[role]}
                          onChange={(e) =>
                            setSelectedRoles((prev) => ({
                              ...prev,
                              [role]: e.target.checked,
                            }))
                          }
                        />
                      }
                      label={role}
                    />
                  ),
                )}
              </FormGroup>
            </FormControl>

            <Button
              variant="contained"
              size="large"
              disabled={!activeRoles.length || !name.trim()}
              onClick={() => {
                login({ name: name.trim(), roles: activeRoles })
                navigate(from ?? '/', { replace: true })
              }}
              sx={{ py: 1.25, fontWeight: 800 }}
            >
              Sign in
            </Button>
          </Stack>
        </Paper>
      </Container>
    </Box>
  )
}
