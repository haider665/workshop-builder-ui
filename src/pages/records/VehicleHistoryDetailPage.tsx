import {
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import { Page } from '../../components/Page'
import { useCwStore } from '../../store/cwStore'
import type { CWTaskStatus } from '../../types/cw'

function statusChip(status: CWTaskStatus) {
  if (status === 'Assigned') return <Chip size="small" color="info" label="Assigned" />
  if (status === 'In Progress') return <Chip size="small" color="primary" label="In Progress" />
  if (status === 'Pending') return <Chip size="small" color="warning" label="Pending" />
  return <Chip size="small" color="success" label="Completed" />
}

export function VehicleHistoryDetailPage() {
  const { registrationNo } = useParams()
  const navigate = useNavigate()
  const tasks = useCwStore((s) => s.tasks)
  const jobs = useCwStore((s) => s.jobs)
  const shops = useCwStore((s) => s.shops)
  const taskAttachments = useCwStore((s) => s.taskAttachments)
  const taskFieldValues = useCwStore((s) => s.taskFieldValues)

  const reg = (registrationNo ?? '').trim()
  const relevantTasks = tasks
    .filter((t) => (t.registrationNo ?? '') === reg)
    .slice()
    .sort((a, b) => (b.plannedStartAt ?? b.createdAt).localeCompare(a.plannedStartAt ?? a.createdAt))

  const relevantJobs = jobs
    .filter((j) => j.registrationNo === reg)
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  function shopName(shopId: string) {
    return shops.find((s) => s.id === shopId)?.name ?? '—'
  }

  return (
    <Page
      title={`Vehicle History / ${reg}`}
      subtitle="Read-only timeline of jobs and tasks for this vehicle."
      actions={
        <Button variant="outlined" onClick={() => navigate('/vehicle-history')}>
          Back
        </Button>
      }
    >
      <Stack spacing={2}>
        <Paper sx={{ p: 2.5, border: '1px solid', borderColor: 'divider' }}>
          <Stack spacing={1.5}>
            <Typography sx={{ fontWeight: 900 }}>Summary</Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              <Chip size="small" label={`Jobs: ${relevantJobs.length}`} />
              <Chip size="small" label={`Tasks: ${relevantTasks.length}`} />
              <Chip size="small" label="F1 outcomes tracked in Milestone 9" />
            </Stack>
          </Stack>
        </Paper>

        <Paper sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
          <Box sx={{ p: 2 }}>
            <Typography sx={{ fontWeight: 900 }}>Tasks</Typography>
            <Typography variant="body2" color="text.secondary">
              Drill down to task detail to view full form values, comments, and attachments.
            </Typography>
          </Box>
          <Divider />

          {relevantTasks.length ? (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Task</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Shop</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Planned</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Saved fields</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Attachments</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>
                    Action
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {relevantTasks.map((t) => {
                  const attachmentsCount = taskAttachments.filter((a) => a.taskId === t.id).length
                  const values = taskFieldValues[t.id] ?? {}
                  const filledCount = Object.values(values).filter((v) => v !== null && v !== '' && !(Array.isArray(v) && v.length === 0)).length
                  const totalFields = t.fields.length

                  const assignees = t.assignedToNames?.length ? t.assignedToNames : [t.assignedToName]
                  const planned = t.plannedStartAt || t.plannedEndAt
                    ? `${t.plannedStartAt ? new Date(t.plannedStartAt).toLocaleString() : '—'} → ${t.plannedEndAt ? new Date(t.plannedEndAt).toLocaleString() : '—'}`
                    : '—'

                  return (
                    <TableRow key={t.id} hover>
                      <TableCell>
                        <Typography sx={{ fontWeight: 800 }}>{t.title}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          Template: {t.templateName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          Assigned: {assignees.filter(Boolean).join(', ') || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>{shopName(t.shopId)}</TableCell>
                      <TableCell>{statusChip(t.status)}</TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {planned}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {`${filledCount} / ${totalFields}`}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {attachmentsCount}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Button size="small" variant="contained" component={RouterLink} to={`/tasks/${t.id}`}>
                          View Task
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <Box sx={{ p: 2 }}>
              <Typography color="text.secondary">No tasks found for this registration.</Typography>
            </Box>
          )}
        </Paper>
      </Stack>
    </Page>
  )
}
