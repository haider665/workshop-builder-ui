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
import { ArrowBack, Person, Assignment, CheckCircle, PlayArrow, PendingActions } from '@mui/icons-material'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import { useMemo } from 'react'
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

export function EmployeeRecordDetailPage() {
  const { userId } = useParams()
  const navigate = useNavigate()

  const users = useCwStore((s) => s.users)
  const roles = useCwStore((s) => s.roles)
  const tasks = useCwStore((s) => s.tasks)
  const shops = useCwStore((s) => s.shops)

  const user = users.find((u) => u.id === userId)

  const roleNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const r of roles) map.set(r.id, r.name)
    return map
  }, [roles])

  const tasksForUser = useMemo(() => {
    if (!user) return []
    return tasks
      .filter((t) => {
        if (t.assignedToName === user.fullName) return true
        return (t.assignedToNames ?? []).includes(user.fullName)
      })
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [tasks, user])

  const counts = useMemo(() => {
    const c: Record<CWTaskStatus, number> = { Assigned: 0, 'In Progress': 0, Pending: 0, Completed: 0 }
    for (const t of tasksForUser) c[t.status] += 1
    return c
  }, [tasksForUser])

  function shopName(shopId: string) {
    return shops.find((s) => s.id === shopId)?.name ?? '—'
  }

  const roleNames = user ? (user.roleIds ?? []).map((id) => roleNameById.get(id)).filter(Boolean) : []

  return (
    <Box sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
      <Stack spacing={3.5}>
        {/* Header */}
        <Stack direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' }, gap: 2 }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <IconButton onClick={() => navigate('/employee-records')} sx={{ border: `1px solid ${colors.border.default}`, borderRadius: '10px' }}>
              <ArrowBack sx={{ fontSize: '1.1rem', color: colors.slate[600] }} />
            </IconButton>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.85rem' }, color: colors.slate[900], letterSpacing: '-0.02em' }}>
                {user?.fullName ?? userId ?? ''}
              </Typography>
              <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>Read-only task history for a user (in-memory MVP).</Typography>
            </Box>
          </Stack>
        </Stack>

        {!user ? (
          <SectionCard title="NOT FOUND" icon={<Person sx={{ fontSize: '1rem' }} />}>
            <Typography sx={{ color: colors.slate[500], fontSize: '0.85rem', py: 2 }}>User not found.</Typography>
          </SectionCard>
        ) : (
          <>
            {/* Stat cards */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <StatCard icon={<Assignment fontSize="small" />} title="ASSIGNED" value={counts.Assigned} gradient="linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)" />
              <StatCard icon={<PlayArrow fontSize="small" />} title="IN PROGRESS" value={counts['In Progress']} gradient="linear-gradient(135deg, #0F172A 0%, #1E293B 100%)" />
              <StatCard icon={<PendingActions fontSize="small" />} title="PENDING" value={counts.Pending} gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" />
              <StatCard icon={<CheckCircle fontSize="small" />} title="COMPLETED" value={counts.Completed} gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)" />
            </Stack>

            {/* Summary section */}
            <SectionCard title="SUMMARY" icon={<Person sx={{ fontSize: '1rem' }} />}>
              <Stack direction="row" sx={{ alignItems: 'center', py: 1.25, borderBottom: `1px solid ${colors.border.subtle}` }}>
                <Typography sx={{ width: 180, flexShrink: 0, fontSize: '0.82rem', color: colors.slate[500], fontWeight: 500 }}>Email</Typography>
                <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: colors.slate[900], flex: 1 }}>{user.email}</Typography>
              </Stack>
              <Stack direction="row" sx={{ alignItems: 'center', py: 1.25, borderBottom: `1px solid ${colors.border.subtle}` }}>
                <Typography sx={{ width: 180, flexShrink: 0, fontSize: '0.82rem', color: colors.slate[500], fontWeight: 500 }}>Roles</Typography>
                <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: colors.slate[900], flex: 1 }}>{roleNames.length ? roleNames.join(', ') : '—'}</Typography>
              </Stack>
              <Stack direction="row" sx={{ alignItems: 'center', py: 1.25 }}>
                <Typography sx={{ width: 180, flexShrink: 0, fontSize: '0.82rem', color: colors.slate[500], fontWeight: 500 }}>Total Tasks</Typography>
                <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: colors.slate[900], flex: 1 }}>{tasksForUser.length}</Typography>
              </Stack>
            </SectionCard>

            {/* Tasks table */}
            <Box sx={tableSectionSx}>
              <Box sx={tableHeaderSx}>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <Box sx={tableHeaderIconSx}><Assignment sx={{ fontSize: '1rem' }} /></Box>
                  <Typography sx={tableHeaderTitleSx}>TASKS</Typography>
                  <Box sx={{ bgcolor: colors.slate[100], borderRadius: radii.full, px: 1.2, py: 0.15, fontSize: '0.72rem', fontWeight: 700, color: colors.slate[600] }}>
                    {tasksForUser.length}
                  </Box>
                </Stack>
              </Box>

              {tasksForUser.length ? (
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ '& .MuiTableCell-head': headerCellSx }}>
                      <TableCell>Task</TableCell>
                      <TableCell>Vehicle</TableCell>
                      <TableCell>Shop</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Updated</TableCell>
                      <TableCell align="right">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tasksForUser.map((t) => (
                      <TableRow key={t.id} hover sx={{ '& .MuiTableCell-body': bodyCellSx }}>
                        <TableCell>
                          <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: colors.slate[900] }}>{t.title}</Typography>
                          <Typography sx={{ fontSize: '0.75rem', color: colors.slate[500] }}>
                            Template: {t.templateName}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: '0.82rem', color: colors.slate[500] }}>
                            {t.registrationNo ?? '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: '0.82rem', color: colors.slate[600] }}>{shopName(t.shopId)}</Typography>
                        </TableCell>
                        <TableCell>{statusChip(t.status)}</TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: '0.82rem', color: colors.slate[500] }}>
                            {new Date(t.updatedAt).toLocaleString()}
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
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Box sx={{ p: 3 }}>
                  <Typography sx={{ color: colors.slate[500], fontSize: '0.85rem' }}>No tasks assigned.</Typography>
                </Box>
              )}
            </Box>
          </>
        )}
      </Stack>
    </Box>
  )
}
