import { Alert, Box, Button, Container, Divider, Paper, Stack, TextField, Typography } from '@mui/material'
import { keyframes } from '@mui/system'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSessionStore } from '../store/sessionStore'

const float = keyframes`
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -20px) scale(1.05); }
  66% { transform: translate(-20px, 15px) scale(0.95); }
`

const pulse = keyframes`
  0%, 100% { opacity: 0.15; }
  50% { opacity: 0.25; }
`

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

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '12px',
      backgroundColor: '#f8f9fa',
      transition: 'all 0.2s ease',
      '& fieldset': {
        borderColor: '#e0e0e0',
        transition: 'border-color 0.2s ease',
      },
      '&:hover fieldset': {
        borderColor: '#bbb',
      },
      '&.Mui-focused fieldset': {
        borderColor: '#1a1a1a',
        borderWidth: '1.5px',
      },
      '&.Mui-focused': {
        backgroundColor: '#fff',
      },
    },
    '& .MuiInputLabel-root': {
      color: '#888',
      '&.Mui-focused': {
        color: '#1a1a1a',
      },
    },
    '& .MuiOutlinedInput-input': {
      color: '#1a1a1a',
      fontSize: '0.95rem',
      padding: '14px 16px',
    },
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0a',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient gradient orbs */}
      <Box
        sx={{
          position: 'absolute',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)',
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
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(200,170,110,0.08) 0%, transparent 70%)',
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
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)',
          top: '60%',
          left: '50%',
          animation: `${pulse} 8s ease-in-out infinite`,
          pointerEvents: 'none',
        }}
      />

      <Container maxWidth="xs" sx={{ position: 'relative', zIndex: 1 }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 4, sm: 5 },
            borderRadius: '24px',
            backgroundColor: '#ffffff',
            boxShadow: '0 25px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)',
          }}
        >
          <Stack spacing={1} sx={{ mb: 4, textAlign: 'center' }}>
            {/* Logo mark */}
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #1a1a1a 0%, #333 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 1,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}
            >
              <Typography sx={{ color: '#fff', fontWeight: 900, fontSize: '1.2rem', letterSpacing: '-0.02em' }}>
                CW
              </Typography>
            </Box>

            <Typography
              variant="overline"
              sx={{
                color: '#999',
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
                color: '#1a1a1a',
                letterSpacing: '-0.03em',
                lineHeight: 1.2,
              }}
            >
              Welcome back
            </Typography>

            <Typography
              sx={{
                color: '#888',
                fontSize: '0.875rem',
                lineHeight: 1.5,
              }}
            >
              Sign in to your workshop account
            </Typography>
          </Stack>

          <Divider sx={{ mb: 3, borderColor: '#f0f0f0' }} />

          <Stack component="form" spacing={2.5} onSubmit={handleSubmit}>
            {error || sessionError ? (
              <Alert
                severity="error"
                sx={{
                  borderRadius: '12px',
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
              sx={{
                py: 1.5,
                mt: 1,
                fontWeight: 700,
                fontSize: '0.9rem',
                letterSpacing: '0.02em',
                borderRadius: '12px',
                textTransform: 'none',
                background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
                color: '#fff',
                transition: 'all 0.25s ease',
                '&:hover': {
                  background: 'linear-gradient(135deg, #2d2d2d 0%, #444 100%)',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
                },
                '&:active': {
                  transform: 'translateY(0)',
                },
                '&.Mui-disabled': {
                  background: '#e0e0e0',
                  color: '#aaa',
                },
              }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </Stack>

          <Typography
            sx={{
              mt: 3,
              textAlign: 'center',
              color: '#bbb',
              fontSize: '0.75rem',
            }}
          >
            Workshop Management Platform
          </Typography>
        </Paper>
      </Container>
    </Box>
  )
}
