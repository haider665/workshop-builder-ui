import { alpha, Alert, Box, Button, Container, Paper, Stack, TextField, Typography } from '@mui/material'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSessionStore } from '../store/sessionStore'

export function LoginPage() {
  const login = useSessionStore((s) => s.login)
  const status = useSessionStore((s) => s.status)
  const sessionError = useSessionStore((s) => s.error)
  const navigate = useNavigate()
  const location = useLocation()

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname
  const [username, setUsername] = useState('Administrator')
  const [password, setPassword] = useState('admin')
  const [error, setError] = useState<string | null>(null)

  const loading = status === 'loading'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    try {
      await login(username.trim(), password)
      setPassword('')
      navigate(from ?? '/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    }
  }

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
            Sign in with your Workshop account.
          </Typography>
        </Stack>

        <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
          <Stack component="form" spacing={2.5} onSubmit={handleSubmit}>
            {error || sessionError ? <Alert severity="error">{error ?? sessionError}</Alert> : null}

            <TextField
              label="Username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              disabled={loading}
              fullWidth
            />

            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              disabled={loading}
              fullWidth
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading || !username.trim() || !password}
              sx={{ py: 1.25, fontWeight: 800 }}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </Stack>
        </Paper>
      </Container>
    </Box>
  )
}
