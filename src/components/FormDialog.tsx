import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
  Stack,
  Typography,
} from '@mui/material'
import type { ReactNode } from 'react'
import { colors, radii, shadows } from '../theme/tokens'

type FormDialogProps = {
  open: boolean
  onClose: () => void
  title: string
  icon?: ReactNode
  children: ReactNode
  onSubmit: () => void
  submitLabel?: string
  submitDisabled?: boolean
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg'
}

export function FormDialog({
  open,
  onClose,
  title,
  icon,
  children,
  onSubmit,
  submitLabel = 'Save',
  submitDisabled = false,
  maxWidth = 'sm',
}: FormDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={maxWidth}
      slotProps={{
        paper: {
          sx: {
            borderRadius: radii.lg,
            boxShadow: shadows.dialog,
          },
        },
      }}
    >
      {/* Header */}
      <Box sx={{ px: 3, pt: 3, pb: 2 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          {icon ? (
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: radii.sm,
                bgcolor: colors.slate[900],
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                '& .MuiSvgIcon-root': { fontSize: 20 },
              }}
            >
              {icon}
            </Box>
          ) : null}
          <Typography
            component="h2"
            sx={{
              fontWeight: 700,
              fontSize: '1.1rem',
              color: colors.slate[900],
            }}
          >
            {title}
          </Typography>
        </Stack>
      </Box>

      <Divider sx={{ borderColor: colors.border.subtle }} />

      {/* Content */}
      <DialogContent sx={{ px: 3, py: 2.5 }}>
        <Stack spacing={2.5}>{children}</Stack>
      </DialogContent>

      <Divider sx={{ borderColor: colors.border.subtle }} />

      {/* Actions */}
      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button
          onClick={onClose}
          sx={{
            color: colors.slate[600],
            fontWeight: 600,
            borderRadius: radii.sm,
            px: 2.5,
            '&:hover': { bgcolor: colors.bg.subtle },
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={onSubmit}
          disabled={submitDisabled}
          sx={{
            bgcolor: colors.slate[900],
            fontWeight: 600,
            borderRadius: radii.sm,
            px: 3,
            '&:hover': { bgcolor: colors.slate[800] },
          }}
        >
          {submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
