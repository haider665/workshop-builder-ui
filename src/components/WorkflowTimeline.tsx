import { Accordion, AccordionDetails, AccordionSummary, Box, Chip, Paper, Step, StepLabel, Stepper, Typography } from '@mui/material'
import { CheckCircle, ExpandMore, RadioButtonUnchecked, Pending } from '@mui/icons-material'
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
  'QC Assigned',
  'QC Approved',
  'Payment Pending',
  'Payment Done',
  'Released',
]

function stepIndex(status: CWAppointmentStatus): number {
  // Customer Rejected maps to the Customer Approved step
  if (status === 'Customer Rejected') return STATUS_STEPS.indexOf('Customer Approved')
  // QC Rejected maps to the QC Approved step
  if (status === 'QC Rejected') return STATUS_STEPS.indexOf('QC Approved')
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
    'QC Assigned': 'info',
    'QC Approved': 'success',
    'QC Rejected': 'error',
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
    'QC Assigned': 'QC Asgn',
    'QC Approved': 'QC OK',
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
    <Paper
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        overflow: 'hidden',
        boxShadow: 'none',
      }}
    >
      <Box
        sx={{
          minHeight: 58,
          px: { xs: 1.75, sm: 2.5 },
          py: 1.25,
          bgcolor: 'action.hover',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          minWidth: 0,
        }}
      >
        <Pending sx={{ color: String(stepColor(status)) + '.main' }} />
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 850 }}>Appointment workflow</Typography>
          <Typography variant="caption" color="text.secondary">
            Current stage: {status} · {timeline.length} timeline event{timeline.length === 1 ? '' : 's'}
          </Typography>
        </Box>
        <Chip
          size="small"
          label={status}
          color={stepColor(status)}
          sx={{ ml: 'auto', mr: 1, display: { xs: 'none', sm: 'inline-flex' }, fontWeight: 700 }}
        />
      </Box>
      <Box sx={{ p: { xs: 1.5, sm: 2.5 }, minWidth: 0, overflow: 'hidden' }}>
      {/* ── Horizontal Stepper ── */}
      <Box sx={{ overflowX: 'auto', mb: 3, WebkitOverflowScrolling: 'touch', pb: 1 }}>
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

      {/* ── Detailed event timeline ── */}
      <Accordion
        disableGutters
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '10px !important',
          boxShadow: 'none',
          '&:before': { display: 'none' },
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMore />}
          sx={{ minHeight: 52, bgcolor: 'action.hover', '& .MuiAccordionSummary-content': { alignItems: 'center' } }}
        >
          <Box>
            <Typography sx={{ fontWeight: 850 }}>Detailed timeline</Typography>
            <Typography variant="caption" color="text.secondary">
              {timeline.length} event{timeline.length === 1 ? '' : 's'} · Expand to inspect full activity
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ p: { xs: 1.5, sm: 2 } }}>
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
        </AccordionDetails>
      </Accordion>
      </Box>
    </Paper>
  )
}
