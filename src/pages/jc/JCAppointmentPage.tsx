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


function fmtBDT(n: number) {
  return `BDT ${n.toLocaleString('en-BD')}`
}


function fmtDateTime(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

type ConcernForm = Record<string, { saUserId: string; startLocal: string; endLocal: string }>
type ServiceForm = Record<string, { saUserId: string; bayId: string; startLocal: string; endLocal: string }>

export function JCAppointmentPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>()

  const appointments = useCwStore((s) => s.appointments)
  const vehicles = useCwStore((s) => s.vehicles)
  const customers = useCwStore((s) => s.customers)
  const users = useCwStore((s) => s.users)
  const bays = useCwStore((s) => s.bays)
  const assignConcernDiagnosis = useCwStore((s) => s.assignConcernDiagnosis)
  const assignServiceSA = useCwStore((s) => s.assignServiceSA)
  const setAppointmentStatus = useCwStore((s) => s.setAppointmentStatus)

  const appt = useMemo(
    () => appointments.find((a) => a.id === appointmentId) ?? null,
    [appointments, appointmentId],
  )

  const vehicle = useMemo(() => (appt ? vehicles.find((v) => v.id === appt.vehicleId) : null), [vehicles, appt])
  const customer = useMemo(() => (appt ? customers.find((c) => c.id === appt.customerId) : null), [customers, appt])

  const saUsers = useMemo(
    () => users.filter((u) => u.status === 'Active' && u.roleIds.length > 0),
    [users],
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

  const isDiagnosisPhase = ['New', 'JC Assigning Diagnosis'].includes(appt.status)
  const isServicePhase = ['Customer Approved', 'JC Assigning Services'].includes(appt.status)

  function getConcernFormVal(id: string) {
    return concernForm[id] ?? { saUserId: '', startLocal: '', endLocal: '' }
  }

  function getServiceFormVal(id: string) {
    return serviceForm[id] ?? { saUserId: '', bayId: '', startLocal: '', endLocal: '' }
  }

  function updateConcernForm(id: string, partial: Partial<ConcernForm[string]>) {
    setConcernForm((prev) => ({
      ...prev,
      [id]: { ...getConcernFormVal(id), ...partial },
    }))
  }

  function updateServiceForm(id: string, partial: Partial<ServiceForm[string]>) {
    setServiceForm((prev) => ({
      ...prev,
      [id]: { ...getServiceFormVal(id), ...partial },
    }))
  }

  function toIso(local: string) {
    if (!local) return ''
    const d = new Date(local)
    return Number.isNaN(d.getTime()) ? '' : d.toISOString()
  }

  function submitDiagnosisAssignments() {
    try {
      setError(null)
      for (const c of appt!.concernItems) {
        const form = getConcernFormVal(c.id)
        if (!form.saUserId) throw new Error(`Select SA for concern: ${c.concernName}`)
        const start = toIso(form.startLocal)
        const end = toIso(form.endLocal)
        if (!start || !end) throw new Error(`Set time window for concern: ${c.concernName}`)
        if (Date.parse(end) <= Date.parse(start)) throw new Error(`End must be after start for: ${c.concernName}`)

        assignConcernDiagnosis({
          appointmentId: appt!.id,
          concernItemId: c.id,
          saUserId: form.saUserId,
          startAt: start,
          endAt: end,
        })
      }
      setAppointmentStatus(appt!.id, 'Diagnosis In Progress')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function submitServiceAssignments() {
    try {
      setError(null)
      for (const s of appt!.serviceItems) {
        const form = getServiceFormVal(s.id)
        if (!form.saUserId) throw new Error(`Select SA for service: ${s.serviceDescription}`)
        const start = toIso(form.startLocal)
        const end = toIso(form.endLocal)

        assignServiceSA({
          appointmentId: appt!.id,
          serviceItemId: s.id,
          saUserId: form.saUserId,
          bayId: form.bayId || undefined,
          startAt: start || undefined,
          endAt: end || undefined,
        })
      }
      setAppointmentStatus(appt!.id, 'Service In Progress')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const totalBDT = appt.serviceItems.reduce((sum, s) => sum + s.price, 0)

  function statusColor(status: string): 'default' | 'info' | 'warning' | 'success' | 'primary' | 'error' {
    const map: Record<string, 'default' | 'info' | 'warning' | 'success' | 'primary' | 'error'> = {
      'New': 'info',
      'JC Assigning Diagnosis': 'info',
      'Diagnosis In Progress': 'primary',
      'Diagnosis Complete': 'warning',
      'Customer Notified': 'warning',
      'Customer Approved': 'success',
      'Customer Rejected': 'error',
      'JC Assigning Services': 'info',
      'Service In Progress': 'primary',
      'Closed': 'success',
    }
    return map[status] ?? 'default'
  }

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
              <Typography variant="body2" color="text.secondary">Status</Typography>
              <Chip label={appt.status} size="small" color={statusColor(appt.status)} sx={{ fontWeight: 700, mt: 0.5 }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" color="text.secondary">Total</Typography>
              <Typography sx={{ fontWeight: 700 }}>{fmtBDT(totalBDT)}</Typography>
            </Box>
          </Stack>
          {appt.concerns && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
              Notes: {appt.concerns}
            </Typography>
          )}
        </Paper>

        {/* ── Concerns List ── */}
        <Paper sx={{ border: '1px solid', borderColor: 'divider', p: 2.5 }}>
          <Typography sx={{ fontWeight: 900, mb: 1.5 }}>
            Concerns ({appt.concernItems.length})
          </Typography>
          {appt.concernItems.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No concerns listed.</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 800 }}>Concern</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Remark</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Assigned SA</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Time Window</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {appt.concernItems.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell><Typography variant="body2" sx={{ fontWeight: 700 }}>{c.concernName}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{c.remark || '—'}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{c.assignedSAUserId ? (userNameById.get(c.assignedSAUserId) ?? '—') : '—'}</Typography></TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {c.plannedStartAt ? `${fmtDateTime(c.plannedStartAt)} → ${fmtDateTime(c.plannedEndAt)}` : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {c.workStatus ? (
                        <Chip
                          label={c.workStatus}
                          size="small"
                          color={c.workStatus === 'Completed' ? 'success' : c.workStatus === 'In Progress' ? 'primary' : 'warning'}
                          sx={{ fontWeight: 700 }}
                        />
                      ) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>

        {/* ── Services List ── */}
        <Paper sx={{ border: '1px solid', borderColor: 'divider', p: 2.5 }}>
          <Typography sx={{ fontWeight: 900, mb: 1.5 }}>
            Services ({appt.serviceItems.length})
          </Typography>
          {appt.serviceItems.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No services listed.</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 800 }}>Service</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Price</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Assigned SA</TableCell>
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
                    <TableCell><Typography variant="body2">{s.assignedSAUserId ? (userNameById.get(s.assignedSAUserId) ?? '—') : '—'}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{s.bayId ? (bayNameById.get(s.bayId) ?? '—') : '—'}</Typography></TableCell>
                    <TableCell>
                      {s.workStatus ? (
                        <Chip
                          label={s.workStatus}
                          size="small"
                          color={s.workStatus === 'Completed' ? 'success' : s.workStatus === 'In Progress' ? 'primary' : 'warning'}
                          sx={{ fontWeight: 700 }}
                        />
                      ) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>

        {/* ── Phase 1: Diagnosis Assignment (JC assigns SA per concern) ── */}
        {isDiagnosisPhase && appt.concernItems.length > 0 && (
          <Paper sx={{ border: '2px solid', borderColor: 'info.main', p: 2.5 }}>
            <Typography sx={{ fontWeight: 900, mb: 0.5, color: 'info.main' }}>
              Phase 1 — Assign SA for Diagnosis
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Assign a Service Advisor and time window to each concern for diagnosis.
            </Typography>

            <Stack spacing={2}>
              {appt.concernItems.map((c) => {
                const form = getConcernFormVal(c.id)
                return (
                  <Box key={c.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, mb: 1.5 }}>
                      {c.concernName}
                      {c.remark && <Typography component="span" variant="caption" color="text.secondary"> — {c.remark}</Typography>}
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 1.5 }}>
                      <TextField
                        select
                        size="small"
                        label="Service Advisor"
                        value={form.saUserId}
                        onChange={(e) => updateConcernForm(c.id, { saUserId: e.target.value })}
                      >
                        <MenuItem value="">— Select SA —</MenuItem>
                        {saUsers.map((u) => (
                          <MenuItem key={u.id} value={u.id}>{u.fullName}</MenuItem>
                        ))}
                      </TextField>
                      <TextField
                        size="small"
                        label="Start Time"
                        type="datetime-local"
                        value={form.startLocal}
                        onChange={(e) => updateConcernForm(c.id, { startLocal: e.target.value })}
                        slotProps={{ inputLabel: { shrink: true } }}
                      />
                      <TextField
                        size="small"
                        label="End Time"
                        type="datetime-local"
                        value={form.endLocal}
                        onChange={(e) => updateConcernForm(c.id, { endLocal: e.target.value })}
                        slotProps={{ inputLabel: { shrink: true } }}
                      />
                    </Box>
                  </Box>
                )
              })}
            </Stack>

            <Box sx={{ mt: 2.5 }}>
              <Button
                variant="contained"
                color="info"
                size="large"
                onClick={submitDiagnosisAssignments}
                sx={{ fontWeight: 900 }}
              >
                Assign & Start Diagnosis
              </Button>
            </Box>
          </Paper>
        )}

        {/* ── Phase 2: Service Assignment (JC assigns SA + bay per service) ── */}
        {isServicePhase && appt.serviceItems.length > 0 && (
          <Paper sx={{ border: '2px solid', borderColor: 'success.main', p: 2.5 }}>
            <Typography sx={{ fontWeight: 900, mb: 0.5, color: 'success.main' }}>
              Phase 2 — Assign SA + Bay for Services
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Customer approved. Assign Service Advisor, bay, and optionally time to each service.
            </Typography>

            <Stack spacing={2}>
              {appt.serviceItems.map((s) => {
                const form = getServiceFormVal(s.id)
                return (
                  <Box key={s.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, mb: 1.5 }}>
                      {s.serviceDescription}
                      <Typography component="span" variant="caption" color="text.secondary"> — {s.serviceCode} · {fmtBDT(s.price)}</Typography>
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr 1fr' }, gap: 1.5 }}>
                      <TextField
                        select
                        size="small"
                        label="Service Advisor"
                        value={form.saUserId}
                        onChange={(e) => updateServiceForm(s.id, { saUserId: e.target.value })}
                      >
                        <MenuItem value="">— Select SA —</MenuItem>
                        {saUsers.map((u) => (
                          <MenuItem key={u.id} value={u.id}>{u.fullName}</MenuItem>
                        ))}
                      </TextField>
                      <TextField
                        select
                        size="small"
                        label="Bay"
                        value={form.bayId}
                        onChange={(e) => updateServiceForm(s.id, { bayId: e.target.value })}
                      >
                        <MenuItem value="">— None —</MenuItem>
                        {activeBays.map((b) => (
                          <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                        ))}
                      </TextField>
                      <TextField
                        size="small"
                        label="Start (optional)"
                        type="datetime-local"
                        value={form.startLocal}
                        onChange={(e) => updateServiceForm(s.id, { startLocal: e.target.value })}
                        slotProps={{ inputLabel: { shrink: true } }}
                      />
                      <TextField
                        size="small"
                        label="End (optional)"
                        type="datetime-local"
                        value={form.endLocal}
                        onChange={(e) => updateServiceForm(s.id, { endLocal: e.target.value })}
                        slotProps={{ inputLabel: { shrink: true } }}
                      />
                    </Box>
                  </Box>
                )
              })}
            </Stack>

            <Box sx={{ mt: 2.5 }}>
              <Button
                variant="contained"
                color="success"
                size="large"
                onClick={submitServiceAssignments}
                sx={{ fontWeight: 900 }}
              >
                Assign & Start Services
              </Button>
            </Box>
          </Paper>
        )}

        {/* ── Status messages for non-actionable states ── */}
        {appt.status === 'Diagnosis In Progress' && (
          <Paper sx={{ border: '1px solid', borderColor: 'primary.main', p: 2.5 }}>
            <Typography sx={{ fontWeight: 700, color: 'primary.main' }}>
              ⏳ Diagnosis is in progress — waiting for SA to complete and notify customer.
            </Typography>
          </Paper>
        )}
        {appt.status === 'Customer Notified' && (
          <Paper sx={{ border: '1px solid', borderColor: 'warning.main', p: 2.5 }}>
            <Typography sx={{ fontWeight: 700, color: 'warning.main' }}>
              📱 Customer has been notified — waiting for approval.
            </Typography>
          </Paper>
        )}
        {appt.status === 'Customer Rejected' && (
          <Paper sx={{ border: '1px solid', borderColor: 'error.main', p: 2.5 }}>
            <Typography sx={{ fontWeight: 700, color: 'error.main' }}>
              ❌ Customer rejected — SA may re-diagnose or revise.
            </Typography>
          </Paper>
        )}
        {appt.status === 'Service In Progress' && (
          <Paper sx={{ border: '1px solid', borderColor: 'primary.main', p: 2.5 }}>
            <Typography sx={{ fontWeight: 700, color: 'primary.main' }}>
              🔧 Services in progress — waiting for SA and technicians to complete all work.
            </Typography>
          </Paper>
        )}
        {appt.status === 'Closed' && (
          <Paper sx={{ border: '1px solid', borderColor: 'success.main', p: 2.5 }}>
            <Chip label="✓ Appointment Closed" color="success" sx={{ fontWeight: 700 }} />
          </Paper>
        )}
      </Stack>
    </Page>
  )
}
