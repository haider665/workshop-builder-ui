import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, InputAdornment, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { CameraAlt, DirectionsCar, Refresh, Search, VerifiedUser } from '@mui/icons-material'
import { workshopApi } from '../../services/workshopApi'
import { useSessionStore } from '../../store/sessionStore'
import { colors, radii, shadows } from '../../theme/tokens'
import { useToast } from '../../hooks/useToast'

type Drive = {
  id: string; appointmentId?: string; jobId?: string; registrationNo?: string; status: string
  requestReason?: string; plannedRoute?: string; driverName?: string; driverNid?: string
  expectedReturnAt?: string; requestedByUserId?: string; requestedAt?: string
  rejectionReason?: string; gatePassId?: string; outcomeNotes?: string
}

const statuses = ['All', 'Requested', 'Pass Issued', 'Guard Verified', 'Outside', 'Returned', 'Rejected', 'Cancelled', 'Closed']

function statusColor(status: string): 'default' | 'info' | 'warning' | 'success' | 'error' {
  if (['Closed', 'Returned'].includes(status)) return 'success'
  if (['Rejected', 'Cancelled', 'Expired', 'Incident Review'].includes(status)) return 'error'
  if (['Outside', 'Overdue'].includes(status)) return 'warning'
  if (['Pass Issued', 'Guard Verified'].includes(status)) return 'info'
  return 'default'
}

export function TestDrivesPage() {
  const toast = useToast()
  const user = useSessionStore((state) => state.user)
  const roles = new Set(user?.roles ?? [])
  const canApprove = roles.has('Admin') || roles.has('Job Creation')
  const isGuard = roles.has('Admin') || roles.has('Guard')
  const canClose = roles.has('Admin') || roles.has('Job Creation') || roles.has('CRE') || roles.has('Service Advisor') || roles.has('Service Engineer')
  const [rows, setRows] = useState<Drive[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All')
  const [selected, setSelected] = useState<Drive | null>(null)
  const [action, setAction] = useState<'approve' | 'reject' | 'verify' | 'depart' | 'return' | 'close' | 'cancel' | null>(null)
  const [note, setNote] = useState('')
  const [registrationNo, setRegistrationNo] = useState('')
  const [odometerKm, setOdometerKm] = useState('')
  const [fuelLevel, setFuelLevel] = useState('')
  const [meterPhotoUrl, setMeterPhotoUrl] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const result = await workshopApi.listTestDrives({ pageSize: 100, status: status === 'All' ? undefined : status })
      setRows(result.data as Drive[])
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load test drives.') }
    finally { setLoading(false) }
  }, [status])

  useEffect(() => { void load() }, [load])

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return rows
    return rows.filter((row) => [row.registrationNo, row.driverName, row.driverNid, row.status, row.requestReason, row.plannedRoute, row.gatePassId].filter(Boolean).join(' ').toLowerCase().includes(query))
  }, [rows, search])

  function begin(row: Drive, next: typeof action) {
    setSelected(row); setAction(next); setNote(''); setRegistrationNo(row.registrationNo ?? ''); setOdometerKm(''); setFuelLevel(''); setMeterPhotoUrl('')
  }

  async function uploadMeter(file?: File) {
    if (!file) return
    try { const uploaded = await workshopApi.uploadFile(file, { isPrivate: true }); setMeterPhotoUrl(uploaded.fileUrl); toast.success('Meter photo captured.') }
    catch (cause) { toast.error(cause instanceof Error ? cause.message : 'Photo upload failed.') }
  }

  async function runAction() {
    if (!selected || !action) return
    setSaving(true)
    try {
      if (action === 'approve') await workshopApi.approveTestDrive(selected.id, note)
      if (action === 'reject') await workshopApi.rejectTestDrive(selected.id, note)
      if (action === 'cancel') await workshopApi.cancelTestDrive(selected.id, note)
      if (action === 'close') await workshopApi.closeTestDrive(selected.id, note)
      if (action === 'verify') await workshopApi.verifyTemporaryGatePass({ gatePassId: selected.gatePassId, registrationNo })
      if (action === 'depart') await workshopApi.departTestDrive({ gatePassId: selected.gatePassId!, odometerKm: Number(odometerKm), meterPhotoUrl, fuelLevel })
      if (action === 'return') await workshopApi.returnTestDrive({ gatePassId: selected.gatePassId!, odometerKm: Number(odometerKm), meterPhotoUrl, fuelLevel, notes: note })
      toast.success(`Test drive ${action} completed.`)
      setAction(null); setSelected(null); await load()
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : `Unable to ${action} test drive.`) }
    finally { setSaving(false) }
  }

  const needsReason = action === 'reject' || action === 'cancel'
  const needsMovement = action === 'depart' || action === 'return'
  const blocked = saving || (needsReason && !note.trim()) || (action === 'verify' && !registrationNo.trim()) || (needsMovement && (!odometerKm || !meterPhotoUrl))

  return <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1440, mx: 'auto' }}>
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
        <Box><Typography variant="h4" sx={{ fontWeight: 850, color: colors.slate[900] }}>Test Drives & Temporary Passes</Typography><Typography sx={{ color: colors.slate[500] }}>Role-controlled request approval, gate verification, departure, return and technical closure.</Typography></Box>
        <Button startIcon={<Refresh />} onClick={() => void load()} disabled={loading} variant="outlined">Refresh</Button>
      </Stack>
      {error ? <Alert severity="error" action={<Button onClick={() => void load()}>Retry</Button>}>{error}</Alert> : null}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
        <TextField fullWidth size="small" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search vehicle, driver, pass, route or state" slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search /></InputAdornment> } }} />
        <TextField select size="small" value={status} onChange={(event) => setStatus(event.target.value)} sx={{ minWidth: { md: 210 } }}>{statuses.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</TextField>
      </Stack>
      <Stack spacing={1.5}>
        {visible.map((row) => <Box key={row.id} sx={{ p: { xs: 1.75, sm: 2.25 }, border: `1px solid ${colors.border.default}`, borderRadius: radii.lg, bgcolor: colors.bg.card, boxShadow: shadows.card }}>
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { lg: 'center' } }}>
            <Stack direction="row" spacing={1.5} sx={{ minWidth: 0 }}><Box sx={{ width: 48, height: 48, borderRadius: 2.5, bgcolor: 'rgba(37,99,235,.09)', color: colors.status.info, display: 'grid', placeItems: 'center', flexShrink: 0 }}><DirectionsCar /></Box><Box sx={{ minWidth: 0 }}><Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}><Typography sx={{ fontWeight: 850, color: colors.slate[900] }}>{row.registrationNo || 'Vehicle pending'}</Typography><Chip size="small" label={row.status} color={statusColor(row.status)} sx={{ fontWeight: 700 }} /></Stack><Typography sx={{ color: colors.slate[600], fontSize: '.85rem' }}>{row.driverName || 'Driver pending'} {row.plannedRoute ? `· ${row.plannedRoute}` : ''}</Typography><Typography sx={{ color: colors.slate[500], fontSize: '.76rem' }}>{row.gatePassId ? `Pass ${row.gatePassId} · ` : ''}{row.expectedReturnAt ? `Due ${new Date(row.expectedReturnAt).toLocaleString()}` : 'Return time pending'}</Typography></Box></Stack>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              {canApprove && row.status === 'Requested' ? <><Button size="small" variant="contained" onClick={() => begin(row, 'approve')}>Approve</Button><Button size="small" color="error" onClick={() => begin(row, 'reject')}>Reject</Button></> : null}
              {isGuard && row.status === 'Pass Issued' ? <Button size="small" variant="contained" startIcon={<VerifiedUser />} onClick={() => begin(row, 'verify')}>Verify pass</Button> : null}
              {isGuard && row.status === 'Guard Verified' ? <Button size="small" variant="contained" onClick={() => begin(row, 'depart')}>Record departure</Button> : null}
              {isGuard && ['Outside', 'Overdue'].includes(row.status) ? <Button size="small" variant="contained" color="success" onClick={() => begin(row, 'return')}>Record return</Button> : null}
              {canClose && row.status === 'Returned' ? <Button size="small" variant="contained" onClick={() => begin(row, 'close')}>Technical close</Button> : null}
              {canClose && ['Requested', 'Pass Issued', 'Guard Verified'].includes(row.status) ? <Button size="small" color="error" onClick={() => begin(row, 'cancel')}>Cancel</Button> : null}
            </Stack>
          </Stack>
          {row.rejectionReason ? <Alert severity="error" sx={{ mt: 1.5 }}>{row.rejectionReason}</Alert> : null}
        </Box>)}
        {!loading && !visible.length ? <Box sx={{ textAlign: 'center', py: 8 }}><DirectionsCar sx={{ fontSize: 48, color: colors.slate[300] }} /><Typography sx={{ fontWeight: 800, color: colors.slate[700] }}>No test drives found</Typography><Typography sx={{ color: colors.slate[500] }}>Requests created by CRE, SA or SE will appear here.</Typography></Box> : null}
      </Stack>
    </Stack>
    <Dialog open={Boolean(action)} onClose={() => !saving && setAction(null)} fullWidth maxWidth="sm" slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
      <DialogTitle sx={{ fontWeight: 850, textTransform: 'capitalize' }}>{action?.replace('_', ' ')} test drive</DialogTitle>
      <DialogContent dividers><Stack spacing={2} sx={{ pt: .5 }}>
        <Alert severity="info">{selected?.registrationNo} · {selected?.driverName || 'Driver pending'} · {selected?.gatePassId || selected?.id}</Alert>
        {action === 'verify' ? <TextField label="Registration number" required value={registrationNo} onChange={(event) => setRegistrationNo(event.target.value)} helperText="Must match the issued pass." /> : null}
        {needsMovement ? <><TextField label="Odometer (km)" type="number" required value={odometerKm} onChange={(event) => setOdometerKm(event.target.value)} /><TextField label="Fuel level" value={fuelLevel} onChange={(event) => setFuelLevel(event.target.value)} placeholder="e.g. 3/4" /><Button component="label" variant="outlined" startIcon={<CameraAlt />}>{meterPhotoUrl ? 'Retake meter photo' : 'Take meter photo'}<input hidden type="file" accept="image/*" capture="environment" onChange={(event) => void uploadMeter(event.target.files?.[0])} /></Button>{meterPhotoUrl ? <Alert severity="success">Meter evidence captured.</Alert> : null}</> : null}
        {action !== 'verify' && action !== 'depart' ? <TextField label={needsReason ? 'Reason' : 'Notes'} required={needsReason} multiline minRows={3} value={note} onChange={(event) => setNote(event.target.value)} /> : null}
      </Stack></DialogContent>
      <DialogActions sx={{ p: 2 }}><Button onClick={() => setAction(null)} disabled={saving}>Cancel</Button><Button variant="contained" onClick={() => void runAction()} disabled={blocked}>Confirm</Button></DialogActions>
    </Dialog>
  </Box>
}
