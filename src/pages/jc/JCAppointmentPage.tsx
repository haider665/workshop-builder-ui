import {
  Alert,
  Box,
  Button,
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
import { useParams } from 'react-router-dom'
import { Page } from '../../components/Page'
import { useCwStore } from '../../store/cwStore'
import { WorkflowTimeline } from '../../components/WorkflowTimeline'
import { VehicleInfoBanner } from '../../components/VehicleInfoBanner'
import { SAInspectionTabs } from '../../components/SAInspectionTabs'

function fmtBDT(n: number) {
  return `BDT ${n.toLocaleString('en-BD')}`
}

function fmtDateTime(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

type ConcernForm = Record<string, { teamId: string; seUserId: string; bayId: string; startLocal: string; endLocal: string; bufferMins: string }>
type ServiceForm = Record<string, { teamId: string; seUserId: string; bayId: string; startLocal: string; endLocal: string; bufferMins: string }>

function statusColor(status: string): 'default' | 'info' | 'warning' | 'success' | 'primary' | 'error' {
  const map: Record<string, 'default' | 'info' | 'warning' | 'success' | 'primary' | 'error'> = {
    'New': 'info',
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
    'Released': 'success',
  }
  return map[status] ?? 'default'
}

export function JCAppointmentPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>()

  const appointments = useCwStore((s) => s.appointments)
  const vehicles = useCwStore((s) => s.vehicles)
  const customers = useCwStore((s) => s.customers)
  const users = useCwStore((s) => s.users)
  const bays = useCwStore((s) => s.bays)
  const assignConcernDiagnosis = useCwStore((s) => s.assignConcernDiagnosis)
  const assignServiceSE = useCwStore((s) => s.assignServiceSE)
  const setAppointmentStatus = useCwStore((s) => s.setAppointmentStatus)
  const pushTimeline = useCwStore((s) => s.pushTimeline)
  const teams = useCwStore((s) => s.teams)
  const services = useCwStore((s) => s.services)
  const partRequests = useCwStore((s) => s.partRequests)

  const appt = useMemo(
    () => appointments.find((a) => a.id === appointmentId) ?? null,
    [appointments, appointmentId],
  )

  const vehicle = useMemo(() => (appt ? vehicles.find((v) => v.id === appt.vehicleId) : null), [vehicles, appt])
  const customer = useMemo(() => (appt ? customers.find((c) => c.id === appt.customerId) : null), [customers, appt])

  const roles = useCwStore((s) => s.roles)
  const seRoleId = useMemo(() => roles.find((r) => r.name === 'SE')?.id, [roles])
  const seUsers = useMemo(
    () => users.filter((u) => u.status === 'Active' && seRoleId && u.roleIds.includes(seRoleId)),
    [users, seRoleId],
  )

  const userNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const u of users) map.set(u.id, u.fullName)
    return map
  }, [users])

  const bayNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const b of bays) map.set(b.id, b.name)
    return map
  }, [bays])

  const activeBays = useMemo(() => bays.filter((b) => b.status !== 'Inactive'), [bays])

  const [concernForm, setConcernForm] = useState<ConcernForm>({})
  const [serviceForm, setServiceForm] = useState<ServiceForm>({})
  const [error, setError] = useState<string | null>(null)

  if (!appt) {
    return (
      <Page title="Appointment Not Found">
        <Alert severity="error">Appointment not found.</Alert>
      </Page>
    )
  }

  // Phase 1: Customer Approved → assign SE+bay to CONCERNS only → Diagnosis Assigned
  const isDiagnosisPhase = appt.status === 'Customer Approved'
  // Phase 2: Service Approved → assign SE+bay to SERVICES only → Service Assigned
  const isServicePhase = appt.status === 'Service Approved'

  function toIso(local: string) {
    if (!local) return ''
    const d = new Date(local)
    return Number.isNaN(d.getTime()) ? '' : d.toISOString()
  }

  function getConcernFormVal(id: string) {
    return concernForm[id] ?? { teamId: '', seUserId: '', bayId: '', startLocal: '', endLocal: '', bufferMins: '0' }
  }

  function getServiceFormVal(id: string) {
    return serviceForm[id] ?? { teamId: '', seUserId: '', bayId: '', startLocal: '', endLocal: '', bufferMins: '0' }
  }

  // ── Bay conflict detection ──────────────────────────────────────────
  function getBayBookings() {
    const bookings: { bayId: string; start: number; end: number; label: string }[] = []
    for (const a of appointments) {
      if (a.id === appointmentId) continue // skip current appointment
      for (const c of a.concernItems) {
        if (c.bayId && c.plannedStartAt && c.plannedEndAt) {
          bookings.push({ bayId: c.bayId, start: Date.parse(c.plannedStartAt), end: Date.parse(c.plannedEndAt), label: `Concern "${c.concernName}" in appt #${a.id.slice(0, 6)}` })
        }
      }
      for (const s of a.serviceItems) {
        if (s.bayId && s.plannedStartAt && s.plannedEndAt) {
          bookings.push({ bayId: s.bayId, start: Date.parse(s.plannedStartAt), end: Date.parse(s.plannedEndAt), label: `Service "${s.serviceDescription}" in appt #${a.id.slice(0, 6)}` })
        }
      }
    }
    return bookings
  }

  function checkBayConflict(bayId: string, startIso: string, endIso: string): string | null {
    if (!bayId || !startIso || !endIso) return null
    const start = Date.parse(startIso)
    const end = Date.parse(endIso)
    if (Number.isNaN(start) || Number.isNaN(end)) return null
    const bookings = getBayBookings()
    for (const b of bookings) {
      if (b.bayId !== bayId) continue
      if (start < b.end && end > b.start) {
        const bayName = bayNameById.get(bayId) ?? bayId
        return `Bay "${bayName}" conflict: overlaps with ${b.label}`
      }
    }
    return null
  }

  // ── Team conflict detection ──────────────────────────────────────────
  function getTeamBookings() {
    const bookings: { teamId: string; start: number; end: number; label: string }[] = []
    for (const a of appointments) {
      if (a.id === appointmentId) continue
      for (const c of a.concernItems) {
        if (c.plannedStartAt && c.plannedEndAt) {
          // Find which team this SE belongs to
          const team = teams.find((t) => t.seUserId === c.assignedSEUserId)
          if (team) {
            bookings.push({ teamId: team.id, start: Date.parse(c.plannedStartAt), end: Date.parse(c.plannedEndAt), label: `Concern "${c.concernName}" in appt #${a.id.slice(0, 6)}` })
          }
        }
      }
    }
    return bookings
  }

  function checkTeamConflict(teamId: string, startIso: string, endIso: string): string | null {
    if (!teamId || !startIso || !endIso) return null
    const start = Date.parse(startIso)
    const end = Date.parse(endIso)
    if (Number.isNaN(start) || Number.isNaN(end)) return null
    const bookings = getTeamBookings()
    for (const b of bookings) {
      if (b.teamId !== teamId) continue
      if (start < b.end && end > b.start) {
        const teamName = teams.find((t) => t.id === teamId)?.name ?? teamId
        return `Team "${teamName}" conflict: overlaps with ${b.label}`
      }
    }
    return null
  }

  function submitDiagnosisAssignment() {
    try {
      setError(null)
      for (const c of appt!.concernItems) {
        const form = getConcernFormVal(c.id)
        if (!form.seUserId) throw new Error(`Select SE for concern: ${c.concernName}`)
        if (!form.bayId) throw new Error(`Select Bay for concern: ${c.concernName}`)
        const start = toIso(form.startLocal)
        if (!start) throw new Error(`Set start time for concern: ${c.concernName}`)
        // End is auto-calculated (start + predefined hours + buffer). Fallback to start if no predefined hours.
        const end = toIso(form.endLocal) || start

        const bayConflict = checkBayConflict(form.bayId, start, end)
        if (bayConflict) throw new Error(bayConflict)

        if (form.teamId) {
          const teamConflict = checkTeamConflict(form.teamId, start, end)
          if (teamConflict) throw new Error(teamConflict)
        }

        assignConcernDiagnosis({
          appointmentId: appt!.id,
          concernItemId: c.id,
          seUserId: form.seUserId,
          bayId: form.bayId,
          startAt: start,
          endAt: end,
        })
      }

      setAppointmentStatus(appt!.id, 'Diagnosis Assigned')
      pushTimeline(appt!.id, { actor: 'JC', action: 'SE + Bay assigned to all concerns for diagnosis' })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function submitServiceAssignment() {
    try {
      setError(null)
      for (const s of appt!.serviceItems) {
        const form = getServiceFormVal(s.id)
        if (!form.seUserId) throw new Error(`Select SE for service: ${s.serviceDescription}`)
        if (!form.bayId) throw new Error(`Select Bay for service: ${s.serviceDescription}`)

        const startIso = toIso(form.startLocal)
        if (!startIso) throw new Error(`Set start time for service: ${s.serviceDescription}`)
        const endIso = toIso(form.endLocal) || startIso

        const bayConflict = checkBayConflict(form.bayId, startIso, endIso)
        if (bayConflict) throw new Error(bayConflict)

        if (form.teamId) {
          const teamConflict = checkTeamConflict(form.teamId, startIso, endIso)
          if (teamConflict) throw new Error(teamConflict)
        }

        assignServiceSE({
          appointmentId: appt!.id,
          serviceItemId: s.id,
          seUserId: form.seUserId,
          bayId: form.bayId,
          startAt: startIso,
          endAt: endIso,
        })
      }

      setAppointmentStatus(appt!.id, 'Service Assigned')
      pushTimeline(appt!.id, { actor: 'JC', action: 'SE + Bay assigned to all services' })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const totalBDT = appt.serviceItems.reduce((sum, s) => sum + s.price, 0)

  return (
    <Page title="JC — Appointment" subtitle={`#${appt.id.slice(0, 8)}`}>
      <Stack spacing={2.5}>
        {error && <Alert severity="error">{error}</Alert>}

        {/* ── Summary ── */}
        <Paper sx={{ border: '1px solid', borderColor: 'divider', p: 2.5 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" color="text.secondary">Vehicle</Typography>
              <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                {vehicle?.registrationNo ?? '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {[vehicle?.make, vehicle?.model].filter(Boolean).join(' ') || '—'}
              </Typography>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" color="text.secondary">Customer</Typography>
              <Typography sx={{ fontWeight: 700 }}>{customer?.fullName ?? '—'}</Typography>
              <Typography variant="caption" color="text.secondary">{customer?.phone ?? ''}</Typography>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" color="text.secondary">SA</Typography>
              <Typography sx={{ fontWeight: 700 }}>
                {appt.assignedSAUserId ? (userNameById.get(appt.assignedSAUserId) ?? '—') : '—'}
              </Typography>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" color="text.secondary">Status</Typography>
              <Chip label={appt.status} size="small" color={statusColor(appt.status)} sx={{ fontWeight: 700, mt: 0.5 }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" color="text.secondary">Total</Typography>
              <Typography sx={{ fontWeight: 700 }}>{fmtBDT(totalBDT)}</Typography>
            </Box>
          </Stack>
        </Paper>

        {/* ── Vehicle + Customer Info ── */}
        <VehicleInfoBanner appointmentId={appt.id} />

        {/* ── Workflow Timeline ── */}
        <WorkflowTimeline status={appt.status} timeline={appt.timeline} />

        {/* SA Health Check Report (readonly) */}
        {appt.inspectionChecks.length > 0 && (
          <Paper sx={{ border: '1px solid', borderColor: 'info.main', p: 2.5 }}>
            <Typography sx={{ fontWeight: 900, mb: 1.5, color: 'info.main' }}>
              SA Health Check Report
            </Typography>
            <SAInspectionTabs checks={appt.inspectionChecks} onChange={() => {}} readonly />
          </Paper>
        )}

        {/* ── Concerns Summary ── */}
        <Paper sx={{ border: '1px solid', borderColor: 'divider', p: 2.5 }}>
          <Typography sx={{ fontWeight: 900, mb: 1.5 }}>Concerns ({appt.concernItems.length})</Typography>
          {appt.concernItems.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No concerns listed.</Typography>
          ) : (
            <Stack spacing={2}>
              {appt.concernItems.map((c) => {
                const concernServices = (c.serviceIds ?? []).map((sid) => services.find((s) => s.id === sid)).filter(Boolean)
                const concernParts = partRequests.filter((pr) => pr.appointmentId === appointmentId && pr.concernItemId === c.id)
                return (
                  <Box key={c.id} sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: c.workStatus === 'Completed' ? 'success.main' : 'divider' }}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Typography sx={{ fontWeight: 800 }}>
                        {c.concernName}
                        {typeof c.processTimeMins === 'number' && (
                          <Typography component="span" variant="caption" sx={{ ml: 1, px: 1, py: 0.25, bgcolor: 'info.main', color: 'white', borderRadius: 1, fontWeight: 700 }}>
                            {c.processTimeMins}m
                          </Typography>
                        )}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        {c.assignedSEUserId && <Chip size="small" label={userNameById.get(c.assignedSEUserId) ?? '—'} variant="outlined" />}
                        {c.bayId && <Chip size="small" label={bayNameById.get(c.bayId) ?? '—'} variant="outlined" />}
                        {c.workStatus ? (
                          <Chip label={c.workStatus} size="small" color={c.workStatus === 'Completed' ? 'success' : c.workStatus === 'In Progress' ? 'primary' : 'warning'} sx={{ fontWeight: 700 }} />
                        ) : null}
                      </Stack>
                    </Stack>
                    {c.remark && <Typography variant="body2" color="text.secondary">{c.remark}</Typography>}
                    {c.diagnosisRemark && (
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        <strong>SE Diagnosis:</strong> {c.diagnosisRemark}
                      </Typography>
                    )}
                    {c.plannedStartAt && (
                      <Typography variant="caption" color="text.secondary">
                        {fmtDateTime(c.plannedStartAt)} → {fmtDateTime(c.plannedEndAt)}
                      </Typography>
                    )}

                    {/* Services linked to this concern */}
                    {concernServices.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'info.main' }}>Services:</Typography>
                        <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                          {concernServices.map((svc) => svc && (
                            <Chip key={svc.id} size="small" label={`${svc.code} · ${fmtBDT(svc.price)}`} color="info" variant="outlined" />
                          ))}
                        </Stack>
                      </Box>
                    )}

                    {/* Parts for this concern */}
                    {concernParts.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'secondary.main' }}>Parts:</Typography>
                        <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                          {concernParts.map((pr) => (
                            <Stack key={pr.id} direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', px: 1, py: 0.5, bgcolor: 'white', borderRadius: 0.5, border: '1px solid', borderColor: 'divider' }}>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{pr.partName}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Qty: {pr.quantity ?? 1}{pr.partNumber ? ` · #${pr.partNumber}` : ''}
                                  {typeof pr.price === 'number' ? ` · ${fmtBDT(pr.price)}` : ''}
                                  {pr.deliveryDate ? ` · ETA: ${pr.deliveryDate}` : ''}
                                </Typography>
                              </Box>
                              <Chip size="small" label={pr.status}
                                color={pr.status === 'Fulfilled' ? 'success' : pr.status === 'Labeled' ? 'info' : pr.status === 'Rejected' ? 'error' : 'warning'}
                              />
                            </Stack>
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </Box>
                )
              })}
            </Stack>
          )}
        </Paper>

        {/* ── Services Summary ── */}
        <Paper sx={{ border: '1px solid', borderColor: 'divider', p: 2.5 }}>
          <Typography sx={{ fontWeight: 900, mb: 1.5 }}>Services ({appt.serviceItems.length})</Typography>
          {appt.serviceItems.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No services listed.</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 800 }}>Service</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Price</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Assigned SE</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Bay</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {appt.serviceItems.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{s.serviceDescription}</Typography>
                      <Typography variant="caption" color="text.secondary">{s.serviceCode}</Typography>
                    </TableCell>
                    <TableCell><Typography variant="body2">{fmtBDT(s.price)}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{s.assignedSEUserId ? (userNameById.get(s.assignedSEUserId) ?? '—') : '—'}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{s.bayId ? (bayNameById.get(s.bayId) ?? '—') : '—'}</Typography></TableCell>
                    <TableCell>
                      {s.workStatus ? (
                        <Chip label={s.workStatus} size="small" color={s.workStatus === 'Completed' ? 'success' : s.workStatus === 'In Progress' ? 'primary' : 'warning'} sx={{ fontWeight: 700 }} />
                      ) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>

        {/* ── Phase 1: Assign SE + Bay to CONCERNS (Diagnosis) ── */}
        {isDiagnosisPhase && appt.concernItems.length > 0 && (
          <Paper sx={{ border: '2px solid', borderColor: 'warning.main', p: 2.5 }}>
            <Typography sx={{ fontWeight: 900, mb: 0.5, color: 'warning.main' }}>
              Assign SE + Bay for Diagnosis
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Customer approved. Assign SE and Bay to each concern for diagnosis.
            </Typography>

            <Stack spacing={2}>
              {appt.concernItems.map((c) => {
                const form = getConcernFormVal(c.id)
                return (
                  <Box key={c.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, mb: 1.5 }}>
                      {c.concernName}
                      {typeof c.processTimeMins === 'number' && (
                        <Typography component="span" variant="caption" sx={{ ml: 1, px: 1, py: 0.25, bgcolor: 'info.main', color: 'white', borderRadius: 1, fontWeight: 700 }}>
                          {c.processTimeMins}m
                        </Typography>
                      )}
                      {c.remark && <Typography component="span" variant="caption" color="text.secondary"> — {c.remark}</Typography>}
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr 1fr 1fr 1fr' }, gap: 1.5 }}>
                      <TextField
                        select size="small" label="Team"
                        value={form.teamId}
                        onChange={(e) => {
                          const teamId = e.target.value
                          setConcernForm((prev) => ({ ...prev, [c.id]: { ...getConcernFormVal(c.id), teamId, seUserId: '' } }))
                        }}
                      >
                        <MenuItem value="">— Select Team —</MenuItem>
                        {teams.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                      </TextField>
                      <TextField
                        select size="small" label="Service Engineer"
                        value={form.seUserId}
                        onChange={(e) => setConcernForm((prev) => ({ ...prev, [c.id]: { ...getConcernFormVal(c.id), seUserId: e.target.value } }))}
                      >
                        <MenuItem value="">— Select SE —</MenuItem>
                        {(() => {
                          const team = teams.find((t) => t.id === form.teamId)
                          const filteredSEs = team
                            ? seUsers.filter((u) => u.id === team.seUserId)
                            : seUsers
                          return filteredSEs.map((u) => <MenuItem key={u.id} value={u.id}>{u.fullName}</MenuItem>)
                        })()}
                      </TextField>
                      <TextField
                        select size="small" label="Bay"
                        value={form.bayId}
                        onChange={(e) => setConcernForm((prev) => ({ ...prev, [c.id]: { ...getConcernFormVal(c.id), bayId: e.target.value } }))}
                      >
                        <MenuItem value="">— Select Bay —</MenuItem>
                        {activeBays.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
                      </TextField>
                      <TextField size="small" label="Start Time" type="datetime-local" value={form.startLocal}
                        onChange={(e) => {
                          const startVal = e.target.value
                          const updates: Partial<typeof form> = { startLocal: startVal }
                          const mins = typeof c.processTimeMins === 'number' ? c.processTimeMins : 0
                          if (startVal && mins > 0) {
                            const d = new Date(startVal)
                            d.setMinutes(d.getMinutes() + mins)
                            updates.endLocal = d.toISOString().slice(0, 16)
                          }
                          setConcernForm((prev) => ({ ...prev, [c.id]: { ...getConcernFormVal(c.id), ...updates } }))
                        }}
                        slotProps={{ inputLabel: { shrink: true } }}
                      />
                      {form.endLocal && (
                        <Typography variant="caption" sx={{ alignSelf: 'center', fontWeight: 700, color: 'success.main', whiteSpace: 'nowrap' }}>
                          End: {new Date(form.endLocal).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                )
              })}
            </Stack>

            <Box sx={{ mt: 2.5 }}>
              <Button variant="contained" color="warning" size="large" onClick={submitDiagnosisAssignment} sx={{ fontWeight: 900 }}>
                Assign SE & Start Diagnosis
              </Button>
            </Box>
          </Paper>
        )}

        {/* ── Phase 2: Assign SE + Bay to SERVICES ── */}
        {isServicePhase && appt.serviceItems.length > 0 && (
          <Paper sx={{ border: '2px solid', borderColor: 'success.main', p: 2.5 }}>
            <Typography sx={{ fontWeight: 900, mb: 0.5, color: 'success.main' }}>
              Assign SE + Bay for Services
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Services approved. Assign SE and Bay to each service.
            </Typography>

            <Stack spacing={2}>
              {appt.serviceItems.map((s) => {
                const form = getServiceFormVal(s.id)
                return (
                  <Box key={s.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, mb: 1.5 }}>
                      {s.serviceDescription}
                      {typeof s.processTimeMins === 'number' && s.processTimeMins > 0 && (
                        <Typography component="span" variant="caption" sx={{ ml: 1, px: 1, py: 0.25, bgcolor: 'success.main', color: 'white', borderRadius: 1, fontWeight: 700 }}>
                          {s.processTimeMins}m
                        </Typography>
                      )}
                      <Typography component="span" variant="caption" color="text.secondary"> — {s.serviceCode} · {fmtBDT(s.price)}</Typography>
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr 1fr 1fr 1fr' }, gap: 1.5 }}>
                      <TextField
                        select size="small" label="Team"
                        value={form.teamId}
                        onChange={(e) => {
                          const teamId = e.target.value
                          setServiceForm((prev) => ({ ...prev, [s.id]: { ...getServiceFormVal(s.id), teamId, seUserId: '' } }))
                        }}
                      >
                        <MenuItem value="">— Select Team —</MenuItem>
                        {teams.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                      </TextField>
                      <TextField
                        select size="small" label="Service Engineer"
                        value={form.seUserId}
                        onChange={(e) => setServiceForm((prev) => ({ ...prev, [s.id]: { ...getServiceFormVal(s.id), seUserId: e.target.value } }))}
                      >
                        <MenuItem value="">— Select SE —</MenuItem>
                        {(() => {
                          const team = teams.find((t) => t.id === form.teamId)
                          const filteredSEs = team
                            ? seUsers.filter((u) => u.id === team.seUserId)
                            : seUsers
                          return filteredSEs.map((u) => <MenuItem key={u.id} value={u.id}>{u.fullName}</MenuItem>)
                        })()}
                      </TextField>
                      <TextField
                        select size="small" label="Bay"
                        value={form.bayId}
                        onChange={(e) => setServiceForm((prev) => ({ ...prev, [s.id]: { ...getServiceFormVal(s.id), bayId: e.target.value } }))}
                      >
                        <MenuItem value="">— Select Bay —</MenuItem>
                        {activeBays.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
                      </TextField>
                      <TextField size="small" label="Start Time" type="datetime-local" value={form.startLocal}
                        onChange={(e) => {
                          const startVal = e.target.value
                          const updates: Partial<typeof form> = { startLocal: startVal }
                          const mins = typeof s.processTimeMins === 'number' ? s.processTimeMins : 0
                          if (startVal && mins > 0) {
                            const d = new Date(startVal)
                            d.setMinutes(d.getMinutes() + mins)
                            updates.endLocal = d.toISOString().slice(0, 16)
                          }
                          setServiceForm((prev) => ({ ...prev, [s.id]: { ...getServiceFormVal(s.id), ...updates } }))
                        }}
                        slotProps={{ inputLabel: { shrink: true } }}
                      />
                      {form.endLocal && (
                        <Typography variant="caption" sx={{ alignSelf: 'center', fontWeight: 700, color: 'success.main', whiteSpace: 'nowrap' }}>
                          End: {new Date(form.endLocal).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                )
              })}
            </Stack>

            <Box sx={{ mt: 2.5 }}>
              <Button variant="contained" color="success" size="large" onClick={submitServiceAssignment} sx={{ fontWeight: 900 }}>
                Assign SE & Start Services
              </Button>
            </Box>
          </Paper>
        )}

        {/* ── Status info ── */}
        {appt.status === 'SA Inspection' && (
          <Alert severity="info">SA is performing vehicle inspection.</Alert>
        )}
        {appt.status === 'SA Reviewed' && (
          <Alert severity="info">SA reviewed — awaiting customer communication.</Alert>
        )}
        {appt.status === 'Customer Notified' && (
          <Alert severity="warning">Customer notified — waiting for approval.</Alert>
        )}
        {appt.status === 'Customer Rejected' && (
          <Alert severity="error">Customer rejected. SA may re-negotiate.</Alert>
        )}
        {appt.status === 'Diagnosis Assigned' && (
          <Alert severity="info">SE assigned for diagnosis — waiting for technicians.</Alert>
        )}
        {appt.status === 'Diagnosis In Progress' && (
          <Alert severity="info">Diagnosis in progress — technicians working.</Alert>
        )}
        {appt.status === 'Diagnosis Complete' && (
          <Alert severity="success">Diagnosis complete — SA reviewing services.</Alert>
        )}
        {appt.status === 'Service Approval Pending' && (
          <Alert severity="warning">Service approval sent to customer.</Alert>
        )}
        {appt.status === 'Service Assigned' && (
          <Alert severity="info">SE assigned for services — waiting for technicians.</Alert>
        )}
        {appt.status === 'Service In Progress' && (
          <Alert severity="info">Services in progress — technicians working.</Alert>
        )}
        {appt.status === 'Service Complete' && (
          <Alert severity="success">Services complete — SA handling payment.</Alert>
        )}
        {appt.status === 'Payment Pending' && (
          <Alert severity="warning">Payment pending.</Alert>
        )}
        {appt.status === 'Payment Done' && (
          <Alert severity="success">Payment done — gate pass issued.</Alert>
        )}
        {appt.status === 'Released' && (
          <Alert severity="success">Vehicle released.</Alert>
        )}
      </Stack>
    </Page>
  )
}
