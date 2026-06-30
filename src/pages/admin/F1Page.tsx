import {
  Alert,
  Box,
  Button,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { Page } from '../../components/Page'
import { useCwStore } from '../../store/cwStore'
import { f1Service } from '../../services/admin/f1Service'
import { colors, radii, shadows } from '../../theme/tokens'

export function F1Page() {
  return <F1ConfigPage />
}

function F1ConfigPage() {
  const config = useCwStore((s) => s.f1Config)
  const [draft, setDraft] = useState<string>(String(config.returnWindowDays))
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function loadConfig() {
      setLoading(true)
      try {
        const data = await f1Service.getConfig()
        if (active) setDraft(String(data.returnWindowDays))
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadConfig()
    return () => {
      active = false
    }
  }, [])

  const parsed = useMemo(() => {
    const trimmed = draft.trim()
    if (!trimmed) return { ok: false as const, message: 'Required' }
    if (!/^\d+$/.test(trimmed)) return { ok: false as const, message: 'Must be an integer' }

    const value = Number(trimmed)
    if (value < 1 || value > 365) {
      return { ok: false as const, message: 'Must be between 1 and 365' }
    }
    return { ok: true as const, value }
  }, [draft])

  const hasChanges = parsed.ok && parsed.value !== config.returnWindowDays

  async function save() {
    if (!parsed.ok) return
    try {
      setError(null)
      await f1Service.setReturnWindowDays(parsed.value)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <Page
      title="F1 Configuration"
      subtitle="Configure the F1 return window settings."
      actions={
        <Button
          variant="contained"
          onClick={save}
          disabled={loading || !parsed.ok || !hasChanges}
          sx={{
            bgcolor: colors.slate[900],
            fontWeight: 600,
            borderRadius: '10px',
            px: 2.5,
            '&:hover': { bgcolor: colors.slate[800] },
          }}
        >
          Save
        </Button>
      }
    >
      {error ? (
        <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }}>
          {error}
        </Alert>
      ) : null}

      <Box
        sx={{
          p: 3,
          borderRadius: radii.lg,
          border: `1px solid ${colors.border.default}`,
          background: colors.bg.card,
          boxShadow: shadows.card,
        }}
      >
        <Stack spacing={2}>
          <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: colors.slate[900] }}>
            Return window
          </Typography>
          <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>
            Controls how many days a vehicle can return and still count for F1. This is stored in-memory only; a hard refresh clears it.
          </Typography>

          <Box sx={{ maxWidth: 360 }}>
            <TextField
              label="Return window (days)"
              type="number"
              value={draft}
              onChange={(e) => {
                setError(null)
                setDraft(e.target.value)
              }}
              fullWidth
              slotProps={{
                htmlInput: { min: 1, max: 365, step: 1 },
              }}
              error={!parsed.ok}
              helperText={
                parsed.ok
                  ? `Current: ${config.returnWindowDays} day${config.returnWindowDays === 1 ? '' : 's'}`
                  : parsed.message
              }
            />
          </Box>
        </Stack>
      </Box>

      <Box
        sx={{
          p: 3,
          mt: 2,
          borderRadius: radii.lg,
          border: `1px solid ${colors.border.default}`,
          background: colors.bg.card,
          boxShadow: shadows.card,
        }}
      >
        <Stack spacing={1}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: colors.slate[900] }}>
            Reporting
          </Typography>
          <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>
            Detailed F1 reporting screens are planned for Milestone 9.
          </Typography>
        </Stack>
      </Box>
    </Page>
  )
}
