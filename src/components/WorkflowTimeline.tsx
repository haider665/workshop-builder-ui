import { Box, Chip, Paper, Step, StepLabel, Stepper, Typography } from '@mui/material'
import { CheckCircle, RadioButtonUnchecked, Pending } from '@mui/icons-material'
import type { CWAppointmentStatus, CWTimelineEvent } from '../types/cw'

const STATUS_STEPS: CWAppointmentStatus[] = [
  'New',
  'SA Inspection',
  'SA Reviewed',
  'Customer Notified',
  'Customer Approved',
  'Diagnosis Assigned',
  'Diagnosis In Progress',
  'Diagnosis Complete',
  'Service Approval Pending',
  'Service Approved',
  'Service Assigned',
  'Service In Progress',
  'Service Complete',
  'Payment Pending',
  'Payment Done',
  'Released',
]

function stepIndex(status: CWAppointmentStatus): number {
  // Customer Rejected maps to the Customer Approved step
  if (status === 'Customer Rejected') return STATUS_STEPS.indexOf('Customer Approved')
  const idx = STATUS_STEPS.indexOf(status)
  return idx >= 0 ? idx : 0
}

function stepColor(status: CWAppointmentStatus): 'default' | 'info' | 'warning' | 'success' | 'primary' | 'error' {
  const map: Record<string, 'default' | 'info' | 'warning' | 'success' | 'primary' | 'error'> = {
    New: 'info',
    'SA Inspection': 'primary',
    'SA Reviewed': 'warning',
    'Customer Notified': 'warning',
    'Customer Approved': 'success',
    'Customer Rejected': 'error',
    'Diagnosis Assigned': 'info',
    'Diagnosis In Progress': 'primary',
    'Diagnosis Complete': 'success',
    'Service Approval Pending': 'warning',
    'Service Approved': 'success',
    'Service Assigned': 'info',
    'Service In Progress': 'primary',
    'Service Complete': 'success',
    'Payment Pending': 'warning',
    'Payment Done': 'success',
    Released: 'success',
  }
  return map[status] ?? 'default'
}

// Short labels for stepper (16 full names won't fit)
function stepShortLabel(s: CWAppointmentStatus): string {
  const map: Record<string, string> = {
    'New': 'New',
    'SA Inspection': 'Inspect',
    'SA Reviewed': 'Reviewed',
    'Customer Notified': 'Notified',
    'Customer Approved': 'Approved',
    'Diagnosis Assigned': 'Diag Asgn',
    'Diagnosis In Progress': 'Diagnosing',
    'Diagnosis Complete': 'Diag Done',
    'Service Approval Pending': 'Svc Notify',
    'Service Approved': 'Svc Appr',
    'Service Assigned': 'Svc Asgn',
    'Service In Progress': 'Servicing',
    'Service Complete': 'Svc Done',
    'Payment Pending': 'Payment',
    'Payment Done': 'Paid',
    'Released': 'Released',
  }
  return map[s] ?? s
}

type Props = {
  status: CWAppointmentStatus
  timeline: CWTimelineEvent[]
}

export function WorkflowTimeline({ status, timeline }: Props) {
  const activeIdx = stepIndex(status)

  return (
    <Paper sx={{ p: 2.5, border: '1px solid', borderColor: 'divider' }}>
      {/* ── Horizontal Stepper ── */}
      <Box sx={{ overflowX: 'auto', mb: 3 }}>
        <Stepper activeStep={activeIdx} alternativeLabel sx={{ minWidth: 1200 }}>
          {STATUS_STEPS.map((s, idx) => {
            const completed = idx < activeIdx
            const active = idx === activeIdx
            return (
              <Step key={s} completed={completed}>
                <StepLabel
                slots={{
                  stepIcon: () =>
                    completed ? (
                      <CheckCircle sx={{ color: 'success.main', fontSize: 24 }} />
                    ) : active ? (
                      <Pending sx={{ color: `${stepColor(status)}.main`, fontSize: 24 }} />
                    ) : (
                      <RadioButtonUnchecked sx={{ color: 'text.disabled', fontSize: 24 }} />
                    ),
                }}
              >
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: active ? 900 : completed ? 700 : 400,
                      color: active ? `${stepColor(status)}.main` : completed ? 'text.primary' : 'text.disabled',
                      fontSize: '0.65rem',
                    }}
                  >
                    {stepShortLabel(s)}
                  </Typography>
                  {active && (
                    <Chip
                      size="small"
                      label={status === 'Customer Rejected' ? 'Rejected' : 'Current'}
                      color={stepColor(status)}
                      sx={{ mt: 0.5, fontWeight: 800, fontSize: '0.65rem' }}
                    />
                  )}
                </StepLabel>
              </Step>
            )
          })}
        </Stepper>
      </Box>

      {/* ── Vertical Timeline ── */}
      <Box>
        <Typography sx={{ fontWeight: 900, mb: 1.5 }}>Timeline</Typography>
        <Box sx={{ position: 'relative', pl: 3 }}>
          {/* Vertical line */}
          <Box
            sx={{
              position: 'absolute',
              left: 8,
              top: 0,
              bottom: 0,
              width: 2,
              bgcolor: 'divider',
            }}
          />
          {timeline.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
              No events yet.
            </Typography>
          )}
          {[...timeline].reverse().map((ev) => (
            <Box key={ev.id} sx={{ position: 'relative', mb: 2, pl: 2 }}>
              {/* Dot */}
              <Box
                sx={{
                  position: 'absolute',
                  left: -19,
                  top: 4,
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                  border: '2px solid',
                  borderColor: 'background.paper',
                }}
              />
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {ev.action}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {new Date(ev.timestamp).toLocaleString()} · {ev.actor}
              </Typography>
              {ev.details && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  {ev.details}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      </Box>
    </Paper>
  )
}
