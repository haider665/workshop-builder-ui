import {
  Box,
  Chip,
  InputAdornment,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import {
  Assignment,
  CheckCircle,
  Engineering,
  Search,
  WavingHand,
} from '@mui/icons-material'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCwStore } from '../../store/cwStore'
import { useBackendData } from '../../hooks/useCREData'
import { useSessionStore } from '../../store/sessionStore'
import { colors, radii, shadows } from '../../theme/tokens'
import type { CWTechnicianAssignment } from '../../types/cw'

/* ─────────────────── Types ─────────────────────────── */

type TaskItem = {
  appointmentId: string
  itemId: string
  itemType: 'concern' | 'service' | 'stage'
  label: string
  vehicleReg: string
  customerName: string
  assignment: CWTechnicianAssignment
  appointmentStatus: string
  // For stages:
  serviceItemId?: string
  stageItemId?: string
}

/* ─────────────────── Helpers (outside component) ──── */

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good Morning'
  if (h < 17) return 'Good Afternoon'
  return 'Good Evening'
}

function chipColor(status: string): 'default' | 'primary' | 'success' | 'warning' {
  if (status === 'Completed') return 'success'
  if (status === 'In Progress') return 'primary'
  if (status === 'Paused') return 'warning'
  return 'default'
}

function typeLabel(itemType: 'concern' | 'service' | 'stage') {
  if (itemType === 'concern') return 'Diagnosis'
  if (itemType === 'stage') return 'Stage'
  return 'Service'
}

function typeChipColor(itemType: 'concern' | 'service' | 'stage'): 'warning' | 'info' | 'success' {
  if (itemType === 'concern') return 'warning'
  if (itemType === 'stage') return 'info'
  return 'success'
}

/* ─────────────── Stat Card (dark gradient) ────────── */

function DashStatCard({
  icon,
  title,
  value,
  gradient,
  details,
}: {
  icon: React.ReactNode
  title: string
  value: number
  gradient: string
  details?: { label: string; value: number }[]
}) {
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 200,
        borderRadius: radii.lg,
        background: gradient,
        color: '#fff',
        p: 2.5,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 28px rgba(0,0,0,0.2)',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          top: -20,
          right: -20,
          width: 100,
          height: 100,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
        },
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1 }}>
        <Box sx={{
          bgcolor: 'rgba(255,255,255,0.18)',
          borderRadius: '10px',
          p: 0.8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {icon}
        </Box>
        <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {title}
        </Typography>
      </Stack>
      <Typography sx={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.1, mb: details ? 1.5 : 0 }}>
        {value}
      </Typography>
      {details && (
        <Stack spacing={0.5} sx={{ mt: 'auto' }}>
          {details.map((d) => (
            <Stack key={d.label} direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography sx={{ fontSize: '0.75rem', opacity: 0.75 }}>{d.label}</Typography>
              <Typography sx={{ fontSize: '0.8rem', fontWeight: 700 }}>{d.value}</Typography>
            </Stack>
          ))}
        </Stack>
      )}
    </Box>
  )
}

/* ─────────────── Section / Table Styles ──────────────── */

const sectionSx = {
  borderRadius: radii.lg,
  border: `1px solid ${colors.border.default}`,
  background: colors.bg.card,
  boxShadow: shadows.card,
  overflow: 'hidden',
} as const

const headerCellSx = {
  background: colors.bg.subtle,
  borderBottom: `1px solid ${colors.border.default}`,
  color: colors.slate[600],
  fontSize: '0.7rem',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  py: 1.5,
  '&:first-of-type': { pl: 3 },
  '&:last-of-type': { pr: 3 },
} as const

const bodyCellSx = {
  borderBottom: `1px solid ${colors.border.subtle}`,
  py: 1.5,
  '&:first-of-type': { pl: 3 },
  '&:last-of-type': { pr: 3 },
} as const

/* ═══════════════════════ Main Component ═══════════════════ */

export function TechnicianDashboardPage() {
  const navigate = useNavigate()
  useBackendData()
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

  // Search filter
  const [searchQuery, setSearchQuery] = useState('')

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
        // Stage-level assignments
        if (service.stageItems && service.stageItems.length > 0) {
          for (const stage of service.stageItems) {
            for (const ta of stage.technicianAssignments) {
              if (ta.technicianUserId === currentUserId) {
                tasks.push({
                  appointmentId: appt.id,
                  itemId: stage.id,
                  itemType: 'stage',
                  label: `${stage.stageName} — ${service.serviceDescription}`,
                  vehicleReg: vReg,
                  customerName: cName,
                  assignment: ta,
                  appointmentStatus: appt.status,
                  serviceItemId: service.id,
                  stageItemId: stage.id,
                })
              }
            }
          }
        } else {
          // Non-staged: service-level assignments
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
    }

    return tasks
  }, [appointments, vehicles, customers, currentUserId])

  const active = myTasks.filter((t) => t.assignment.status !== 'Completed')
  const completed = myTasks.filter((t) => t.assignment.status === 'Completed')

  // Filtered lists for search
  const filteredActive = useMemo(() => {
    if (!searchQuery.trim()) return active
    const q = searchQuery.toLowerCase()
    return active.filter((t) =>
      t.label.toLowerCase().includes(q) ||
      t.vehicleReg.toLowerCase().includes(q) ||
      t.customerName.toLowerCase().includes(q) ||
      t.assignment.status.toLowerCase().includes(q) ||
      t.itemType.toLowerCase().includes(q),
    )
  }, [active, searchQuery])

  const filteredCompleted = useMemo(() => {
    if (!searchQuery.trim()) return completed
    const q = searchQuery.toLowerCase()
    return completed.filter((t) =>
      t.label.toLowerCase().includes(q) ||
      t.vehicleReg.toLowerCase().includes(q) ||
      t.customerName.toLowerCase().includes(q),
    )
  }, [completed, searchQuery])

  // Stat details
  const concernCount = active.filter((t) => t.itemType === 'concern').length
  const serviceCount = active.filter((t) => t.itemType === 'service').length
  const stageCount = active.filter((t) => t.itemType === 'stage').length

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <Box sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
      <Stack spacing={3.5}>
        {/* ── Greeting Header ── */}
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
              <WavingHand sx={{ color: '#f59e0b', fontSize: '1.5rem' }} />
              <Typography sx={{
                fontWeight: 800,
                fontSize: { xs: '1.5rem', md: '1.85rem' },
                color: colors.slate[900],
                letterSpacing: '-0.02em',
              }}>
                {getGreeting()}!
              </Typography>
            </Stack>
            <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>
              Technician Dashboard — your assigned tasks at a glance.
            </Typography>
          </Box>
          <Typography sx={{
            color: colors.slate[500],
            fontSize: '0.85rem',
            fontWeight: 500,
            textAlign: 'right',
            display: { xs: 'none', md: 'block' },
          }}>
            {todayFormatted}
          </Typography>
        </Stack>

        {/* ── Stat Cards ── */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <DashStatCard
            icon={<Engineering fontSize="small" />}
            title="Active Tasks"
            value={active.length}
            gradient="linear-gradient(135deg, #0F172A 0%, #1E293B 100%)"
            details={[
              { label: 'Diagnosis', value: concernCount },
              { label: 'Services', value: serviceCount },
              { label: 'Stages', value: stageCount },
            ]}
          />
          <DashStatCard
            icon={<CheckCircle fontSize="small" />}
            title="Completed"
            value={completed.length}
            gradient="linear-gradient(135deg, #047857 0%, #10B981 100%)"
          />
          <DashStatCard
            icon={<Assignment fontSize="small" />}
            title="Total Assigned"
            value={myTasks.length}
            gradient="linear-gradient(135deg, #334155 0%, #475569 100%)"
          />
        </Stack>

        {/* ── Technician Selector ── */}
        <Box sx={{
          borderRadius: radii.lg,
          border: `1px solid ${colors.border.default}`,
          background: colors.bg.card,
          boxShadow: shadows.card,
          p: 2.5,
        }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Engineering sx={{ color: colors.slate[500], fontSize: '1.1rem' }} />
              <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: colors.slate[700] }}>
                Viewing as:
              </Typography>
            </Stack>
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
              <Chip
                label={`${myTasks.length} task${myTasks.length !== 1 ? 's' : ''} assigned`}
                size="small"
                sx={{
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  bgcolor: colors.slate[100],
                  color: colors.slate[700],
                  border: `1px solid ${colors.border.default}`,
                }}
              />
            )}
          </Stack>
        </Box>

        {/* ── Active Tasks ── */}
        <Box sx={sectionSx}>
          <Box sx={{ px: 3, pt: 2.5, pb: 2 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' }, gap: 2 }}>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', color: colors.slate[900] }}>
                  Active Tasks ({active.length})
                </Typography>
                <Typography sx={{ color: colors.slate[500], fontSize: '0.8rem' }}>
                  Tasks awaiting completion
                </Typography>
              </Box>
              <TextField
                size="small"
                placeholder="Search tasks…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ fontSize: '1.1rem', color: colors.slate[400] }} />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{ minWidth: 220 }}
              />
            </Stack>
          </Box>

          {filteredActive.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>
                {searchQuery ? 'No active tasks match your search.' : 'No active tasks.'}
              </Typography>
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& .MuiTableCell-head': headerCellSx }}>
                  <TableCell>Type</TableCell>
                  <TableCell>Task</TableCell>
                  <TableCell>Vehicle</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredActive.map((t) => (
                  <TableRow
                    key={t.assignment.id}
                    hover
                    sx={{
                      cursor: 'pointer',
                      '& .MuiTableCell-body': bodyCellSx,
                      '&:hover': { background: colors.bg.cardHover },
                    }}
                    onClick={() => {
                      if (t.itemType === 'stage') {
                        navigate(`/technician/task/${t.appointmentId}/stage/${t.serviceItemId}?ta=${t.assignment.id}&stageId=${t.stageItemId}`)
                      } else {
                        navigate(`/technician/task/${t.appointmentId}/${t.itemType}/${t.itemId}?ta=${t.assignment.id}`)
                      }
                    }}
                  >
                    <TableCell>
                      <Chip
                        label={typeLabel(t.itemType)}
                        size="small"
                        color={typeChipColor(t.itemType)}
                        sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'capitalize' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: colors.slate[900] }}>
                        {t.label}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.85rem', color: colors.slate[700], fontFamily: 'monospace', fontWeight: 600 }}>
                        {t.vehicleReg}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.82rem', color: colors.slate[600] }}>
                        {t.customerName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={t.assignment.status} size="small" color={chipColor(t.assignment.status)} sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
                    </TableCell>
                    <TableCell align="right">
                      <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: colors.accent.blue }}>
                        Open →
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Box>

        {/* ── Completed Tasks ── */}
        {completed.length > 0 && (
          <Box sx={sectionSx}>
            <Box sx={{ px: 3, pt: 2.5, pb: 2 }}>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', color: colors.slate[900] }}>
                  Completed ({completed.length})
                </Typography>
                <Typography sx={{ color: colors.slate[500], fontSize: '0.8rem' }}>
                  Tasks marked as done
                </Typography>
              </Box>
            </Box>

            {filteredCompleted.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>
                  No completed tasks match your search.
                </Typography>
              </Box>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& .MuiTableCell-head': headerCellSx }}>
                    <TableCell>Type</TableCell>
                    <TableCell>Task</TableCell>
                    <TableCell>Vehicle</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredCompleted.map((t) => (
                    <TableRow
                      key={t.assignment.id}
                      sx={{
                        '& .MuiTableCell-body': bodyCellSx,
                      }}
                    >
                      <TableCell>
                        <Chip
                          label={typeLabel(t.itemType)}
                          size="small"
                          sx={{
                            fontWeight: 600,
                            fontSize: '0.72rem',
                            bgcolor: colors.slate[100],
                            color: colors.slate[600],
                            border: `1px solid ${colors.border.default}`,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.85rem', color: colors.slate[700] }}>
                          {t.label}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.85rem', color: colors.slate[600], fontFamily: 'monospace' }}>
                          {t.vehicleReg}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.82rem', color: colors.slate[500] }}>
                          {t.customerName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label="Completed" size="small" color="success" sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Box>
        )}
      </Stack>
    </Box>
  )
}
