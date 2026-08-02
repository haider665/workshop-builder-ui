import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  Stack,
  Typography,
} from '@mui/material'
import { Chat, ExpandMore, Reply } from '@mui/icons-material'
import { SectionCard } from './SectionCard'
import type { CWWhatsappLog } from '../types/cw'

type Props = {
  logs: CWWhatsappLog[]
  onReply?: (log: CWWhatsappLog) => void
}

function formatDate(value: string) {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString()
}

export function WhatsAppHistory({ logs, onReply }: Props) {
  return (
    <SectionCard
      title={'WhatsApp history (' + logs.length + ')'}
      icon={<Chat sx={{ fontSize: '1rem' }} />}
      defaultCollapsed
    >
      {logs.length === 0 ? (
        <Typography variant="body2" color="text.secondary">No WhatsApp messages yet.</Typography>
      ) : (
        <Stack spacing={1}>
          {[...logs].reverse().map((log) => (
            <Accordion
              key={log.id}
              disableGutters
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '10px !important',
                boxShadow: 'none',
                overflow: 'hidden',
                '&:before': { display: 'none' },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMore />}
                sx={{ px: { xs: 1.25, sm: 2 }, '& .MuiAccordionSummary-content': { minWidth: 0 } }}
              >
                <Stack direction="row" spacing={1} sx={{ width: '100%', minWidth: 0, alignItems: 'center' }}>
                  <Chip
                    size="small"
                    label={log.direction === 'outbound' ? 'Sent' : 'Received'}
                    color={log.direction === 'outbound' ? 'success' : 'info'}
                  />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography sx={{ fontSize: '0.82rem', fontWeight: 750 }} noWrap>
                      {log.message || 'Message'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {log.authorName} · {formatDate(log.sentAt)}
                    </Typography>
                  </Box>
                </Stack>
              </AccordionSummary>
              <AccordionDetails sx={{ px: { xs: 1.5, sm: 2 }, pt: 0, pb: 2 }}>
                <Typography
                  variant="body2"
                  sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}
                >
                  {log.message}
                </Typography>
                {onReply && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Reply />}
                    onClick={() => onReply(log)}
                    sx={{ mt: 1.5 }}
                  >
                    Reply
                  </Button>
                )}
              </AccordionDetails>
            </Accordion>
          ))}
        </Stack>
      )}
    </SectionCard>
  )
}
