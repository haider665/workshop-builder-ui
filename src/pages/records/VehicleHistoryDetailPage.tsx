import {
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { ArrowBack, DirectionsCar, Assignment, WorkHistory } from '@mui/icons-material'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import { SectionCard } from '../../components/SectionCard'
import { StatCard } from '../../components/StatCard'
import { tableSectionSx, headerCellSx, bodyCellSx, tableHeaderSx, tableHeaderIconSx, tableHeaderTitleSx } from '../../theme/tableStyles'
import { colors, radii } from '../../theme/tokens'
import { useCwStore } from '../../store/cwStore'
import type { CWTaskStatus } from '../../types/cw'

function statusChip(status: CWTaskStatus) {
  if (status === 'Assigned') return <Chip size="small" color="info" label="Assigned" sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
  if (status === 'In Progress') return <Chip size="small" color="primary" label="In Progress" sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
  if (status === 'Pending') return <Chip size="small" color="warning" label="Pending" sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
  return <Chip size="small" color="success" label="Completed" sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
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
    <Box sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
      <Stack spacing={3.5}>
        {/* Header */}
        <Stack direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' }, gap: 2 }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <IconButton onClick={() => navigate('/vehicle-history')} sx={{ border: `1px solid ${colors.border.default}`, borderRadius: '10px' }}>
              <ArrowBack sx={{ fontSize: '1.1rem', color: colors.slate[600] }} />
            </IconButton>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.85rem' }, color: colors.slate[900], letterSpacing: '-0.02em' }}>
                {reg}
              </Typography>
              <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>Read-only timeline of jobs and tasks for this vehicle.</Typography>
            </Box>
          </Stack>
        </Stack>

        {/* Stat cards */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <StatCard icon={<WorkHistory fontSize="small" />} title="JOBS" value={relevantJobs.length} gradient="linear-gradient(135deg, #0F172A 0%, #1E293B 100%)" />
          <StatCard icon={<Assignment fontSize="small" />} title="TASKS" value={relevantTasks.length} gradient="linear-gradient(135deg, #334155 0%, #475569 100%)" />
        </Stack>

        {/* Summary section */}
        <SectionCard title="SUMMARY" icon={<DirectionsCar sx={{ fontSize: '1rem' }} />}>
          <Stack direction="row" sx={{ alignItems: 'center', py: 1.25, borderBottom: `1px solid ${colors.border.subtle}` }}>
            <Typography sx={{ width: 180, flexShrink: 0, fontSize: '0.82rem', color: colors.slate[500], fontWeight: 500 }}>Registration</Typography>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: colors.slate[900], flex: 1 }}>{reg}</Typography>
          </Stack>
          <Stack direction="row" sx={{ alignItems: 'center', py: 1.25, borderBottom: `1px solid ${colors.border.subtle}` }}>
            <Typography sx={{ width: 180, flexShrink: 0, fontSize: '0.82rem', color: colors.slate[500], fontWeight: 500 }}>Total Jobs</Typography>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: colors.slate[900], flex: 1 }}>{relevantJobs.length}</Typography>
          </Stack>
          <Stack direction="row" sx={{ alignItems: 'center', py: 1.25 }}>
            <Typography sx={{ width: 180, flexShrink: 0, fontSize: '0.82rem', color: colors.slate[500], fontWeight: 500 }}>Total Tasks</Typography>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: colors.slate[900], flex: 1 }}>{relevantTasks.length}</Typography>
          </Stack>
        </SectionCard>

        {/* Tasks table */}
        <Box sx={tableSectionSx}>
          <Box sx={tableHeaderSx}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Box sx={tableHeaderIconSx}><Assignment sx={{ fontSize: '1rem' }} /></Box>
              <Typography sx={tableHeaderTitleSx}>TASKS</Typography>
              <Box sx={{ bgcolor: colors.slate[100], borderRadius: radii.full, px: 1.2, py: 0.15, fontSize: '0.72rem', fontWeight: 700, color: colors.slate[600] }}>
                {relevantTasks.length}
              </Box>
            </Stack>
            <Typography sx={{ fontSize: '0.75rem', color: colors.slate[500] }}>
              Drill down to task detail to view full form values, comments, and attachments.
            </Typography>
          </Box>

          {relevantTasks.length ? (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& .MuiTableCell-head': headerCellSx }}>
                  <TableCell>Task</TableCell>
                  <TableCell>Shop</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Planned</TableCell>
                  <TableCell>Saved Fields</TableCell>
                  <TableCell>Attachments</TableCell>
                  <TableCell align="right">Action</TableCell>
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
                    <TableRow key={t.id} hover sx={{ '& .MuiTableCell-body': bodyCellSx }}>
                      <TableCell>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: colors.slate[900] }}>{t.title}</Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: colors.slate[500] }}>
                          Template: {t.templateName}
                        </Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: colors.slate[500] }}>
                          Assigned: {assignees.filter(Boolean).join(', ') || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.82rem', color: colors.slate[600] }}>{shopName(t.shopId)}</Typography>
                      </TableCell>
                      <TableCell>{statusChip(t.status)}</TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.82rem', color: colors.slate[500] }}>
                          {planned}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.82rem', color: colors.slate[500] }}>
                          {`${filledCount} / ${totalFields}`}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.82rem', color: colors.slate[500] }}>
                          {attachmentsCount}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="contained"
                          component={RouterLink}
                          to={`/tasks/${t.id}`}
                          sx={{ bgcolor: colors.slate[900], fontWeight: 600, borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: colors.slate[800] } }}
                        >
                          View Task
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <Box sx={{ p: 3 }}>
              <Typography sx={{ color: colors.slate[500], fontSize: '0.85rem' }}>No tasks found for this registration.</Typography>
            </Box>
          )}
        </Box>
      </Stack>
    </Box>
  )
}
