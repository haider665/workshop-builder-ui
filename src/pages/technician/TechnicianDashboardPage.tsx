import {
  Chip,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page } from '../../components/Page'
import { useCwStore } from '../../store/cwStore'
import { useSessionStore } from '../../store/sessionStore'
import type { CWTechnicianAssignment } from '../../types/cw'

type TaskItem = {
  appointmentId: string
  itemId: string
  itemType: 'concern' | 'service'
  label: string
  vehicleReg: string
  customerName: string
  assignment: CWTechnicianAssignment
  appointmentStatus: string
}

export function TechnicianDashboardPage() {
  const navigate = useNavigate()
  const appointments = useCwStore((s) => s.appointments)
  const vehicles = useCwStore((s) => s.vehicles)
  const customers = useCwStore((s) => s.customers)
  const users = useCwStore((s) => s.users)
  const roles = useCwStore((s) => s.roles)
  const sessionUser = useSessionStore((s) => s.user)

  // Get technician role users
  const techRoleId = useMemo(() => roles.find((r) => r.name === 'Technician')?.id, [roles])
  const techUsers = useMemo(
    () => users.filter((u) => u.status === 'Active' && techRoleId && u.roleIds.includes(techRoleId)),
    [users, techRoleId],
  )

  // Try auto-match by name
  const autoMatchedId = useMemo(() => {
    if (!sessionUser) return null
    const cwUser = techUsers.find((u) => u.fullName === sessionUser.name)
    return cwUser?.id ?? null
  }, [sessionUser, techUsers])

  // Auto-select first technician if no match
  const [manualUserId, setManualUserId] = useState<string>('')

  // If no auto-match and no manual selection yet, auto-pick first tech
  const effectiveManualId = manualUserId || (autoMatchedId ? '' : techUsers[0]?.id ?? '')
  const currentUserId = autoMatchedId ?? (effectiveManualId || null)

  const myTasks = useMemo(() => {
    if (!currentUserId) return []
    const tasks: TaskItem[] = []

    for (const appt of appointments) {
      const v = vehicles.find((v) => v.id === appt.vehicleId)
      const c = customers.find((c) => c.id === appt.customerId)
      const vReg = v?.registrationNo ?? '—'
      const cName = c?.fullName ?? '—'

      for (const concern of appt.concernItems) {
        for (const ta of concern.technicianAssignments) {
          if (ta.technicianUserId === currentUserId) {
            tasks.push({
              appointmentId: appt.id,
              itemId: concern.id,
              itemType: 'concern',
              label: concern.concernName,
              vehicleReg: vReg,
              customerName: cName,
              assignment: ta,
              appointmentStatus: appt.status,
            })
          }
        }
      }

      for (const service of appt.serviceItems) {
        for (const ta of service.technicianAssignments) {
          if (ta.technicianUserId === currentUserId) {
            tasks.push({
              appointmentId: appt.id,
              itemId: service.id,
              itemType: 'service',
              label: service.serviceDescription,
              vehicleReg: vReg,
              customerName: cName,
              assignment: ta,
              appointmentStatus: appt.status,
            })
          }
        }
      }
    }

    return tasks
  }, [appointments, vehicles, customers, currentUserId])

  const active = myTasks.filter((t) => t.assignment.status !== 'Completed')
  const completed = myTasks.filter((t) => t.assignment.status === 'Completed')

  function chipColor(status: string): 'default' | 'primary' | 'success' | 'warning' {
    if (status === 'Completed') return 'success'
    if (status === 'In Progress') return 'primary'
    if (status === 'Paused') return 'warning'
    return 'default'
  }

  return (
    <Page title="My Tasks" subtitle="Your assigned concern and service tasks.">
      <Stack spacing={3}>
        {/* Technician identity selector — always visible */}
        <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              Viewing as:
            </Typography>
            <TextField
              select
              size="small"
              label="Technician"
              value={currentUserId ?? ''}
              onChange={(e) => setManualUserId(e.target.value)}
              sx={{ minWidth: 260 }}
            >
              {techUsers.map((u) => (
                <MenuItem key={u.id} value={u.id}>{u.fullName}</MenuItem>
              ))}
            </TextField>
            {currentUserId && (
              <Typography variant="body2" color="text.secondary">
                {myTasks.length} task{myTasks.length !== 1 ? 's' : ''} assigned
              </Typography>
            )}
          </Stack>
        </Paper>

        {/* Active */}
        <Paper sx={{ border: '2px solid', borderColor: 'primary.main', p: 2.5 }}>
          <Typography sx={{ fontWeight: 900, mb: 1.5, color: 'primary.main' }}>
            Active Tasks ({active.length})
          </Typography>
          {active.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No active tasks.</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 800 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Task</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Vehicle</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {active.map((t) => (
                  <TableRow key={t.assignment.id} hover sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/technician/task/${t.appointmentId}/${t.itemType}/${t.itemId}?ta=${t.assignment.id}`)}>
                    <TableCell>
                      <Chip label={t.itemType === 'concern' ? 'Diagnosis' : 'Service'} size="small"
                        color={t.itemType === 'concern' ? 'warning' : 'success'} sx={{ fontWeight: 700, textTransform: 'capitalize' }} />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{t.label}</TableCell>
                    <TableCell>{t.vehicleReg}</TableCell>
                    <TableCell><Chip label={t.assignment.status} size="small" color={chipColor(t.assignment.status)} sx={{ fontWeight: 700 }} /></TableCell>
                    <TableCell>
                      <Typography variant="body2" color="primary" sx={{ fontWeight: 700 }}>Open →</Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>

        {/* Completed */}
        {completed.length > 0 && (
          <Paper sx={{ border: '1px solid', borderColor: 'divider', p: 2.5 }}>
            <Typography sx={{ fontWeight: 900, mb: 1.5, color: 'text.secondary' }}>
              Completed ({completed.length})
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 800 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Task</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Vehicle</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {completed.map((t) => (
                  <TableRow key={t.assignment.id}>
                    <TableCell>
                      <Chip label={t.itemType === 'concern' ? 'Diagnosis' : 'Service'} size="small" color="default" />
                    </TableCell>
                    <TableCell>{t.label}</TableCell>
                    <TableCell>{t.vehicleReg}</TableCell>
                    <TableCell><Chip label="Completed" size="small" color="success" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        )}
      </Stack>
    </Page>
  )
}
