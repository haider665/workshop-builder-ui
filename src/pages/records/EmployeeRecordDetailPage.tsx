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
import { useMemo } from 'react'
import { Page } from '../../components/Page'
import { useCwStore } from '../../store/cwStore'
import type { CWTaskStatus } from '../../types/cw'

function statusChip(status: CWTaskStatus) {
  if (status === 'Assigned') return <Chip size="small" color="info" label="Assigned" />
  if (status === 'In Progress') return <Chip size="small" color="primary" label="In Progress" />
  if (status === 'Pending') return <Chip size="small" color="warning" label="Pending" />
  return <Chip size="small" color="success" label="Completed" />
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
    <Page
      title={`Employee Record / ${user?.fullName ?? userId ?? ''}`}
      subtitle="Read-only task history for a user (in-memory MVP)."
      actions={
        <Button variant="outlined" onClick={() => navigate('/employee-records')}>
          Back
        </Button>
      }
    >
      {!user ? (
        <Paper sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
          <Typography color="text.secondary">User not found.</Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          <Paper sx={{ p: 2.5, border: '1px solid', borderColor: 'divider' }}>
            <Stack spacing={1.5}>
              <Typography sx={{ fontWeight: 900 }}>Summary</Typography>
              <Typography color="text.secondary">{user.email}</Typography>
              <Typography variant="body2" color="text.secondary">
                Roles: {roleNames.length ? roleNames.join(', ') : '—'}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                <Chip size="small" label={`Assigned: ${counts.Assigned}`} />
                <Chip size="small" label={`In Progress: ${counts['In Progress']}`} />
                <Chip size="small" label={`Pending: ${counts.Pending}`} />
                <Chip size="small" label={`Completed: ${counts.Completed}`} />
              </Stack>
            </Stack>
          </Paper>

          <Paper sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
            <Box sx={{ p: 2 }}>
              <Typography sx={{ fontWeight: 900 }}>Tasks</Typography>
            </Box>
            <Divider />
            {tasksForUser.length ? (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>Task</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Vehicle</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Shop</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Updated</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>
                      Action
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tasksForUser.map((t) => (
                    <TableRow key={t.id} hover>
                      <TableCell>
                        <Typography sx={{ fontWeight: 800 }}>{t.title}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          Template: {t.templateName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {t.registrationNo ?? '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>{shopName(t.shopId)}</TableCell>
                      <TableCell>{statusChip(t.status)}</TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {new Date(t.updatedAt).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Button size="small" variant="contained" component={RouterLink} to={`/tasks/${t.id}`}>
                          View Task
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Box sx={{ p: 2 }}>
                <Typography color="text.secondary">No tasks assigned.</Typography>
              </Box>
            )}
          </Paper>
        </Stack>
      )}
    </Page>
  )
}
