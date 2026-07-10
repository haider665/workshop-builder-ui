import { Alert, Box, Button, Container, Divider, Stack, TextField, Typography } from '@mui/material'
import { keyframes } from '@mui/system'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSessionStore } from '../store/sessionStore'
import { colors, radii, shadows, motion } from '../theme/tokens'

const float = keyframes`
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -20px) scale(1.05); }
  66% { transform: translate(-20px, 15px) scale(0.95); }
`

const pulse = keyframes`
  0%, 100% { opacity: 0.15; }
  50% { opacity: 0.25; }
`

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`

/* ── Styles defined outside component to avoid re-creation ── */

const inputSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: radii.sm,
    backgroundColor: colors.slate[50],
    transition: `all ${motion.normal} ${motion.springEase}`,
    '& fieldset': {
      borderColor: colors.border.default,
      transition: `border-color ${motion.normal} ease`,
    },
    '&:hover fieldset': {
      borderColor: colors.slate[300],
    },
    '&.Mui-focused fieldset': {
      borderColor: colors.border.focus,
      borderWidth: '1.5px',
    },
    '&.Mui-focused': {
      backgroundColor: colors.bg.card,
      boxShadow: `0 0 0 3px ${colors.slate[100]}`,
    },
  },
  '& .MuiInputLabel-root': {
    color: colors.slate[400],
    fontSize: '0.85rem',
    fontWeight: 500,
    '&.Mui-focused': {
      color: colors.slate[900],
      fontWeight: 600,
    },
  },
  '& .MuiOutlinedInput-input': {
    color: colors.slate[900],
    fontSize: '0.92rem',
    padding: '14px 16px',
    fontWeight: 500,
  },
} as const

const pageBackground = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: `linear-gradient(145deg, ${colors.slate[950]} 0%, ${colors.slate[900]} 40%, ${colors.slate[800]} 100%)`,
  position: 'relative' as const,
  overflow: 'hidden',
} as const

const cardSx = {
  p: { xs: 4, sm: 5 },
  borderRadius: radii.xl,
  backgroundColor: colors.bg.card,
  border: `1px solid ${colors.border.default}`,
  boxShadow: `${shadows.dialog}, 0 0 0 1px rgba(255,255,255,0.05)`,
  position: 'relative' as const,
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '3px',
    background: `linear-gradient(90deg, ${colors.slate[900]}, ${colors.slate[600]}, ${colors.slate[900]})`,
    backgroundSize: '200% 100%',
    animation: `${shimmer} 6s ease-in-out infinite`,
  },
} as const

const submitButtonSx = {
  py: 1.5,
  mt: 1,
  fontWeight: 700,
  fontSize: '0.9rem',
  letterSpacing: '0.02em',
  borderRadius: '10px',
  textTransform: 'none' as const,
  bgcolor: colors.slate[900],
  color: '#fff',
  transition: `all ${motion.normal} ${motion.springEase}`,
  '&:hover': {
    bgcolor: colors.slate[800],
    transform: 'translateY(-1px)',
    boxShadow: shadows.elevated,
  },
  '&:active': {
    transform: 'translateY(0)',
  },
  '&.Mui-disabled': {
    bgcolor: colors.slate[200],
    color: colors.slate[400],
  },
} as const

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
    <Box sx={pageBackground}>
      {/* Ambient gradient orbs */}
      <Box
        sx={{
          position: 'absolute',
          width: '600px',
          height: '600px',
          borderRadius: radii.full,
          background: `radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)`,
          top: '-15%',
          left: '-10%',
          animation: `${float} 20s ease-in-out infinite`,
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          borderRadius: radii.full,
          background: `radial-gradient(circle, rgba(200,170,110,0.08) 0%, transparent 70%)`,
          bottom: '-10%',
          right: '-5%',
          animation: `${float} 25s ease-in-out infinite reverse`,
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          width: '300px',
          height: '300px',
          borderRadius: radii.full,
          background: `radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)`,
          top: '60%',
          left: '50%',
          animation: `${pulse} 8s ease-in-out infinite`,
          pointerEvents: 'none',
        }}
      />
      {/* Subtle grid pattern overlay */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `radial-gradient(${colors.slate[700]} 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
          opacity: 0.15,
          pointerEvents: 'none',
        }}
      />

      <Container maxWidth="xs" sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={cardSx}>
          <Stack spacing={1} sx={{ mb: 4, textAlign: 'center' }}>
            {/* Logo mark */}
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: radii.md,
                background: `linear-gradient(135deg, ${colors.slate[900]} 0%, ${colors.slate[700]} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 1,
                boxShadow: shadows.elevated,
              }}
            >
              <Typography sx={{ color: '#fff', fontWeight: 900, fontSize: '1.2rem', letterSpacing: '-0.02em' }}>
                CW
              </Typography>
            </Box>

            <Typography
              variant="overline"
              sx={{
                color: colors.slate[400],
                letterSpacing: '0.2em',
                fontSize: '0.65rem',
                fontWeight: 600,
              }}
            >
              Continental Works
            </Typography>

            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                color: colors.slate[900],
                letterSpacing: '-0.03em',
                lineHeight: 1.2,
              }}
            >
              Welcome back
            </Typography>

            <Typography
              sx={{
                color: colors.slate[500],
                fontSize: '0.875rem',
                lineHeight: 1.5,
              }}
            >
              Sign in to your workshop account
            </Typography>
          </Stack>

          <Divider sx={{ mb: 3, borderColor: colors.border.subtle }} />

          <Stack component="form" spacing={2.5} onSubmit={handleSubmit}>
            {error || sessionError ? (
              <Alert
                severity="error"
                sx={{
                  borderRadius: radii.sm,
                  border: `1px solid rgba(239,68,68,0.2)`,
                  '& .MuiAlert-icon': { alignItems: 'center' },
                }}
              >
                {error ?? sessionError}
              </Alert>
            ) : null}

            <TextField
              label="Username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              disabled={loading}
              fullWidth
              sx={inputSx}
            />

            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              disabled={loading}
              fullWidth
              sx={inputSx}
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading || !username.trim() || !password}
              disableElevation
              sx={submitButtonSx}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </Stack>

          <Typography
            sx={{
              mt: 3,
              textAlign: 'center',
              color: colors.slate[400],
              fontSize: '0.72rem',
              fontWeight: 500,
              letterSpacing: '0.03em',
            }}
          >
            Workshop Management Platform
          </Typography>
        </Box>
      </Container>
    </Box>
  )
}
