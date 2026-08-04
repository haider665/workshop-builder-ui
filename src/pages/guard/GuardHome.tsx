import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import {
  DoorFront,
  CloudUpload,
  DeleteOutlined,
  ExitToApp,
  Login,
  Security,
  WavingHand,
} from '@mui/icons-material'
import { useMemo, useState } from 'react'
import { useCwStore } from '../../store/cwStore'
import { colors, radii, shadows } from '../../theme/tokens'
import { workshopApi } from '../../services/workshopApi'
import type { CWAppointment, CWCustomer, CWGateVehicleDocument, CWIntakerType, CWJob, CWPendingVehicle, CWVehicle, CWVehicleDocumentType } from '../../types/cw'

/* ─────────────────────── Types ─────────────────────────── */

type SearchMode = 'registration' | 'vin'
type Step = 'idle' | 'entry-confirm' | 'exit-result' | 'reentry-confirm'

type ExitResult = {
  allowed: boolean
  reason: string
  job?: CWJob
  pending?: CWPendingVehicle
}

type MatchResult = {
  vehicle: CWVehicle
  customer: CWCustomer | null
  appointment: CWAppointment | null
} | null

type IntakeDocumentDraft = Omit<CWGateVehicleDocument, 'id' | 'verifiedByUserId' | 'verifiedAt'>

const documentTypes: CWVehicleDocumentType[] = ['Registration Certificate', 'Tax Token', 'Fitness Certificate', 'Insurance', 'Route Permit', 'Other']

/* ─────────────────────── Helpers ─────────────────────────── */

function normalizeKey(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

function minutesAgo(isoDate: string) {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 60_000)
}

function formatDuration(mins: number) {
  if (mins < 1) return 'less than a minute'
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'}`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h ${m}m`
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good Morning'
  if (h < 17) return 'Good Afternoon'
  return 'Good Evening'
}

/* ── Stat Card ── */

function DashStatCard({
  icon, title, value, gradient,
}: {
  icon: React.ReactNode; title: string; value: number; gradient: string
}) {
  return (
    <Box sx={{
      flex: 1, minWidth: 160, borderRadius: radii.lg, background: gradient,
      color: '#fff', p: 2.5, position: 'relative', overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 28px rgba(0,0,0,0.2)' },
      '&::after': { content: '""', position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' },
    }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1 }}>
        <Box sx={{ bgcolor: 'rgba(255,255,255,0.18)', borderRadius: '10px', p: 0.8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </Box>
        <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{title}</Typography>
      </Stack>
      <Typography sx={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.1 }}>{value}</Typography>
    </Box>
  )
}

/* ═══════════════════════ Main Component ═══════════════════ */

export function GuardHome() {
  const pendingVehicles = useCwStore((s) => s.pendingVehicles)
  const jobs = useCwStore((s) => s.jobs)
  const vehicles = useCwStore((s) => s.vehicles)
  const appointments = useCwStore((s) => s.appointments)
  const customers = useCwStore((s) => s.customers)
  const users = useCwStore((s) => s.users)
  const createPendingVehicle = useCwStore((s) => s.createPendingVehicle)
  const setAppointmentGateEntry = useCwStore((s) => s.setAppointmentGateEntry)
  const releaseVehicle = useCwStore((s) => s.releaseVehicle)

  const [searchMode, setSearchMode] = useState<SearchMode>('registration')
  const [searchValue, setSearchValue] = useState('')
  const [step, setStep] = useState<Step>('idle')
  const [error, setError] = useState<string | null>(null)

  const [matchResult, setMatchResult] = useState<MatchResult>(null)
  const [entryCreated, setEntryCreated] = useState<CWPendingVehicle | null>(null)
  const [exitResult, setExitResult] = useState<ExitResult | null>(null)
  const [reentryInfo, setReentryInfo] = useState<{ vehicle: CWVehicle; customer: CWCustomer | null; exitedMinsAgo: number; appointment: CWAppointment } | null>(null)
  const [successOpen, setSuccessOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [intakerType, setIntakerType] = useState<CWIntakerType>('Owner')
  const [intakerName, setIntakerName] = useState('')
  const [intakerPhone, setIntakerPhone] = useState('')
  const [intakerPhotoUrl, setIntakerPhotoUrl] = useState('')
  const [drivingLicensePhotoUrl, setDrivingLicensePhotoUrl] = useState('')
  const [vehicleDocuments, setVehicleDocuments] = useState<IntakeDocumentDraft[]>([])
  const [uploading, setUploading] = useState(false)

  const normalizedValue = useMemo(() => searchValue.trim(), [searchValue])
  const searchKey = useMemo(() => normalizeKey(searchValue), [searchValue])

  // Stats
  const pendingEntries = useMemo(() => pendingVehicles.filter((p) => p.status === 'Pending').length, [pendingVehicles])
  const todayEntries = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10)
    return pendingVehicles.filter((p) => p.arrivedAt.startsWith(todayStr)).length
  }, [pendingVehicles])
  const releasedToday = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10)
    return appointments.filter((a) => a.status === 'Released' && a.releasedAt?.startsWith(todayStr)).length
  }, [appointments])

  // Find vehicle by current search mode
  function findVehicle(): CWVehicle | undefined {
    if (!searchKey) return undefined
    if (searchMode === 'registration') {
      return vehicles.find((v) => normalizeKey(v.registrationNo) === searchKey)
    }
    return vehicles.find((v) => v.vin && normalizeKey(v.vin) === searchKey)
  }

  // Find latest pending entry by registration
  function findLatestPending(regKey: string) {
    return pendingVehicles
      .filter((p) => normalizeKey(p.registrationNo) === regKey)
      .slice()
      .sort((a, b) => b.arrivedAt.localeCompare(a.arrivedAt))
      .at(0) ?? null
  }

  // Find latest job by registration
  function findLatestJob(regKey: string) {
    return jobs
      .filter((j) => normalizeKey(j.registrationNo) === regKey)
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .at(0) ?? null
  }

  function reset() {
    setError(null)
    setStep('idle')
    setSearchValue('')
    setMatchResult(null)
    setEntryCreated(null)
    setExitResult(null)
    setReentryInfo(null)
    setSuccessOpen(false)
    setSuccessMessage('')
  }

  function resetIntakeForm() {
    setIntakerType('Owner')
    setIntakerName('')
    setIntakerPhone('')
    setIntakerPhotoUrl('')
    setDrivingLicensePhotoUrl('')
    setVehicleDocuments([])
  }

  async function uploadEvidence(file: File, onUploaded: (url: string) => void) {
    try {
      setUploading(true)
      setError(null)
      const uploaded = await workshopApi.uploadFile(file, { folder: 'Home/Workshop/Gate Intake', isPrivate: true })
      onUploaded(uploaded.fileUrl)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Unable to upload file')
    } finally {
      setUploading(false)
    }
  }

  function addVehicleDocument() {
    setVehicleDocuments((current) => [...current, {
      documentType: 'Registration Certificate', documentNumber: '', fileUrl: '', verificationStatus: 'Pending', verificationNote: '',
    }])
  }

  function startEntry() {
    setError(null)
    if (!normalizedValue) {
      setError(searchMode === 'registration' ? 'Registration number is required' : 'VIN is required')
      return
    }

    const vehicle = findVehicle()

    if (vehicle) {
      const customer = customers.find((c) => c.id === vehicle.customerId) ?? null
      const appt = appointments
        .filter((a) => a.vehicleId === vehicle.id)
        .filter((a) => a.status !== 'Released')
        .slice()
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .at(0) ?? null

      // Re-entry detection: check if vehicle released within 24h
      const recentRelease = appointments
        .filter((a) => a.vehicleId === vehicle.id && a.status === 'Released' && a.releasedAt)
        .slice()
        .sort((a, b) => (b.releasedAt ?? '').localeCompare(a.releasedAt ?? ''))
        .at(0)

      if (recentRelease && recentRelease.releasedAt) {
        const minsAgo = minutesAgo(recentRelease.releasedAt)
        if (minsAgo <= 24 * 60) {
          setReentryInfo({ vehicle, customer, exitedMinsAgo: minsAgo, appointment: recentRelease })
          setMatchResult({ vehicle, customer, appointment: appt })
          setStep('reentry-confirm')
          return
        }
      }

      setMatchResult({ vehicle, customer, appointment: appt })
    } else {
      setMatchResult(null)
    }

    setStep('entry-confirm')
  }

  function confirmEntry() {
    try {
      setError(null)
      if (!intakerName.trim() || !intakerPhone.trim() || !intakerPhotoUrl) {
        setError('Name, phone number, and a clear photo of the person bringing the vehicle are required.')
        return
      }
      if (vehicleDocuments.some((document) => !document.fileUrl)) {
        setError('Upload a file for every vehicle document row, or remove the incomplete row.')
        return
      }
      const vehicle = matchResult?.vehicle ?? null
      const regNo = vehicle ? vehicle.registrationNo : normalizedValue.toUpperCase()
      const appt = matchResult?.appointment ?? null

      const created = createPendingVehicle({
        registrationNo: regNo,
        customerId: appt?.customerId ?? vehicle?.customerId,
        vehicleId: appt?.vehicleId ?? vehicle?.id,
        appointmentId: appt?.id,
        intakerType,
        intakerName: intakerName.trim(),
        intakerPhone: intakerPhone.trim(),
        intakerPhotoUrl,
        drivingLicensePhotoUrl: drivingLicensePhotoUrl || undefined,
        vehicleDocuments,
        isTemporary: !vehicle,
      })

      if (appt) {
        setAppointmentGateEntry(appt.id, created.id)
      }

      setEntryCreated(created)
      setSearchValue('')
      setStep('idle')
      resetIntakeForm()

      if (!vehicle) {
        setSuccessMessage(`Temporary entry logged: ${created.registrationNo} — CRE will resolve.`)
      } else if (created.appointmentId) {
        setSuccessMessage(`Entry linked to appointment: ${created.registrationNo}`)
      } else {
        setSuccessMessage(`Walk-in entry logged: ${created.registrationNo}`)
      }

      setSuccessOpen(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function confirmReentry() {
    setStep('entry-confirm')
    setReentryInfo(null)
  }

  function runExitCheck() {
    setError(null)
    if (!normalizedValue) {
      setError(searchMode === 'registration' ? 'Registration number is required' : 'VIN is required')
      return
    }

    const vehicle = findVehicle()
    if (!vehicle) {
      setExitResult({ allowed: false, reason: 'No vehicle found' })
      setStep('exit-result')
      return
    }

    const regKey = normalizeKey(vehicle.registrationNo)
    const pending = findLatestPending(regKey)
    const job = findLatestJob(regKey)

    const appt = appointments
      .filter((a) => a.vehicleId === vehicle.id)
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .at(0) ?? null

    if (appt) {
      if (appt.status === 'Payment Done' || appt.status === 'Released') {
        setExitResult({
          allowed: true,
          reason: appt.status === 'Released' ? 'Already released' : `Payment done — Gate pass issued at ${appt.gatePassIssuedAt ? new Date(appt.gatePassIssuedAt).toLocaleString() : '—'}`,
          job: job ?? undefined,
          pending: pending ?? undefined,
        })
        setStep('exit-result')
        return
      }

      setExitResult({
        allowed: false,
        reason: `Appointment status: ${appt.status}`,
        job: job ?? undefined,
        pending: pending ?? undefined,
      })
      setStep('exit-result')
      return
    }

    if (!job) {
      setExitResult({
        allowed: false,
        reason: pending?.status === 'Pending' ? 'Pending job creation' : 'No job found',
        pending: pending ?? undefined,
      })
      setStep('exit-result')
      return
    }

    if (job.status === 'Job Finished') {
      setExitResult({ allowed: true, reason: 'Job finished', job, pending: pending ?? undefined })
      setStep('exit-result')
      return
    }

    if (job.status === 'Test Drive Approved') {
      setExitResult({ allowed: true, reason: 'Test drive approved', job, pending: pending ?? undefined })
      setStep('exit-result')
      return
    }

    setExitResult({ allowed: false, reason: 'Job still active', job, pending: pending ?? undefined })
    setStep('exit-result')
  }

  /* ─── Shared styles ─── */
  const dialogPaperSx = { borderRadius: radii.lg, boxShadow: shadows.dialog }
  const infoPanelSx = { p: 2, borderRadius: radii.md, border: `1px solid ${colors.border.default}`, background: colors.bg.subtle }

  return (
    <Box sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
      <Stack spacing={3.5}>
        {/* ── Greeting Header ── */}
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
              <WavingHand sx={{ color: '#f59e0b', fontSize: '1.5rem' }} />
              <Typography sx={{
                fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.85rem' },
                color: colors.slate[900], letterSpacing: '-0.02em',
              }}>
                {getGreeting()}!
              </Typography>
            </Stack>
            <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>
              Gate entry & exit control — scan vehicles to check in or out.
            </Typography>
          </Box>
          <Typography sx={{
            color: colors.slate[500], fontSize: '0.85rem', fontWeight: 500,
            textAlign: 'right', display: { xs: 'none', md: 'block' },
          }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </Typography>
        </Stack>

        {/* ── Stat Cards ── */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <DashStatCard icon={<Login fontSize="small" />} title="Today's Entries" value={todayEntries} gradient="linear-gradient(135deg, #0F172A 0%, #1E293B 100%)" />
          <DashStatCard icon={<Security fontSize="small" />} title="Pending In Yard" value={pendingEntries} gradient="linear-gradient(135deg, #B45309 0%, #F59E0B 100%)" />
          <DashStatCard icon={<ExitToApp fontSize="small" />} title="Released Today" value={releasedToday} gradient="linear-gradient(135deg, #047857 0%, #10B981 100%)" />
        </Stack>

        {/* ── Snackbar ── */}
        <Snackbar open={successOpen} onClose={() => setSuccessOpen(false)} autoHideDuration={2500} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
          <Alert onClose={() => setSuccessOpen(false)} severity="success" variant="filled" sx={{ width: '100%', borderRadius: '10px' }}>
            {successMessage}
          </Alert>
        </Snackbar>

        {/* ── Re-entry warning dialog ── */}
        <Dialog open={step === 'reentry-confirm'} onClose={() => setStep('idle')} fullWidth maxWidth="sm" slotProps={{ paper: { sx: dialogPaperSx } }}>
          <DialogTitle sx={{ fontWeight: 800, color: colors.status.warning }}>⚠ Recent Exit Detected</DialogTitle>
          <DialogContent>
            <Stack spacing={2}>
              {reentryInfo && (
                <Box sx={{ ...infoPanelSx, borderColor: colors.status.warning, background: 'rgba(245,158,11,0.06)' }}>
                  <Stack spacing={1}>
                    <Typography sx={{ fontWeight: 700, color: colors.slate[900] }}>
                      This vehicle exited <strong>{formatDuration(reentryInfo.exitedMinsAgo)}</strong> ago.
                    </Typography>
                    <Typography sx={{ fontSize: '0.85rem', color: colors.slate[500] }}>
                      Registration: <strong>{reentryInfo.vehicle.registrationNo}</strong>
                    </Typography>
                    {reentryInfo.vehicle.vin && (
                      <Typography sx={{ fontSize: '0.85rem', color: colors.slate[500] }}>
                        VIN: <strong>{reentryInfo.vehicle.vin}</strong>
                      </Typography>
                    )}
                    {reentryInfo.customer && (
                      <Typography sx={{ fontSize: '0.85rem', color: colors.slate[500] }}>
                        Customer: <strong>{reentryInfo.customer.fullName}</strong> · {reentryInfo.customer.phone}
                      </Typography>
                    )}
                    <Typography sx={{ fontSize: '0.85rem', color: colors.slate[500] }}>
                      Vehicle: {[reentryInfo.vehicle.make, reentryInfo.vehicle.model].filter(Boolean).join(' ') || '—'}
                    </Typography>
                  </Stack>
                </Box>
              )}
              <Typography sx={{ fontWeight: 600, color: colors.slate[900] }}>
                Do you want to re-entry this vehicle?
              </Typography>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2, pt: 0 }}>
            <Button variant="outlined" size="large" onClick={() => { setStep('idle'); setReentryInfo(null) }}
              sx={{ fontWeight: 700, borderRadius: '10px', borderColor: colors.slate[300], color: colors.slate[700] }}>
              Cancel
            </Button>
            <Button variant="contained" color="warning" size="large" onClick={confirmReentry}
              sx={{ fontWeight: 700, borderRadius: '10px' }}>
              Yes, Re-entry
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── Entry confirm dialog ── */}
        <Dialog open={step === 'entry-confirm'} onClose={() => setStep('idle')} fullWidth maxWidth="md" slotProps={{ paper: { sx: dialogPaperSx } }}>
          <DialogTitle sx={{ fontWeight: 800, color: colors.slate[900] }}>Confirm Entry</DialogTitle>
          <DialogContent>
            <Stack spacing={2}>
              <Typography sx={{ color: colors.slate[500], fontSize: '0.9rem' }}>
                {searchMode === 'registration' ? 'Registration' : 'VIN'}: <strong>{normalizedValue.toUpperCase()}</strong>
              </Typography>

              {matchResult?.vehicle ? (
                <Box sx={{ ...infoPanelSx, borderColor: colors.status.success, background: 'rgba(16,185,129,0.06)' }}>
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {matchResult.appointment ? (
                        <Box sx={{ px: 1.5, py: 0.25, bgcolor: colors.status.success, borderRadius: 1, color: 'white', fontWeight: 800, fontSize: 12 }}>
                          PRE-BOOKED
                        </Box>
                      ) : (
                        <Box sx={{ px: 1.5, py: 0.25, bgcolor: colors.status.warning, borderRadius: 1, color: 'white', fontWeight: 800, fontSize: 12 }}>
                          WALK-IN
                        </Box>
                      )}
                    </Box>
                    {matchResult.customer && (
                      <Typography sx={{ fontSize: '0.85rem', color: colors.slate[600] }}>
                        <strong>Customer:</strong> {matchResult.customer.fullName} · {matchResult.customer.phone}
                      </Typography>
                    )}
                    <Typography sx={{ fontSize: '0.85rem', color: colors.slate[600] }}>
                      <strong>Vehicle:</strong> {matchResult.vehicle.registrationNo} · {[matchResult.vehicle.make, matchResult.vehicle.model].filter(Boolean).join(' ') || '—'}
                    </Typography>
                    {matchResult.vehicle.vin && (
                      <Typography sx={{ fontSize: '0.85rem', color: colors.slate[600] }}>
                        <strong>VIN:</strong> {matchResult.vehicle.vin}
                      </Typography>
                    )}
                    {matchResult.appointment && (() => {
                      const sa = matchResult.appointment!.assignedSAUserId
                        ? users.find((u) => u.id === matchResult.appointment!.assignedSAUserId)
                        : null
                      return (
                        <>
                          {sa && (
                            <Typography sx={{ fontSize: '0.85rem', color: colors.slate[600] }}>
                              <strong>Service Advisor:</strong> {sa.fullName}
                            </Typography>
                          )}
                          <Typography sx={{ fontSize: '0.85rem', color: colors.slate[600] }}>
                            <strong>Slot:</strong> {matchResult.appointment!.slotDate ?? '—'} {matchResult.appointment!.slotTime ?? ''}
                          </Typography>
                          <Typography sx={{ fontSize: '0.85rem', color: colors.slate[500] }}>
                            Appointment status: {matchResult.appointment!.status}
                          </Typography>
                        </>
                      )
                    })()}
                  </Stack>
                </Box>
              ) : (
                <Box sx={{ ...infoPanelSx, borderColor: colors.status.warning, background: 'rgba(245,158,11,0.06)' }}>
                  <Stack spacing={1}>
                    <Box sx={{ px: 1.5, py: 0.25, bgcolor: colors.status.error, borderRadius: 1, color: 'white', fontWeight: 800, fontSize: 12, alignSelf: 'flex-start' }}>
                      NO MATCH
                    </Box>
                    <Typography sx={{ fontSize: '0.85rem', color: colors.slate[500] }}>
                      No existing vehicle found. Will be logged as temporary entry for CRE to resolve.
                    </Typography>
                  </Stack>
                </Box>
              )}

              <Divider />
              <Box>
                <Typography sx={{ fontWeight: 800, color: colors.slate[900], mb: 0.5 }}>Person handing over the vehicle</Typography>
                <Typography sx={{ color: colors.slate[500], fontSize: '0.82rem', mb: 2 }}>Record the person physically present at the gate. Fields marked * are required.</Typography>
                <Stack spacing={2}>
                  <TextField select required label="Person type" value={intakerType} onChange={(event) => setIntakerType(event.target.value as CWIntakerType)} fullWidth>
                    {(['Owner', 'Driver', 'Technician', 'Other'] as CWIntakerType[]).map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
                  </TextField>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField required label="Full name" value={intakerName} onChange={(event) => setIntakerName(event.target.value)} fullWidth />
                    <TextField required label="Phone number" value={intakerPhone} onChange={(event) => setIntakerPhone(event.target.value)} fullWidth inputMode="tel" />
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <Button component="label" variant={intakerPhotoUrl ? 'outlined' : 'contained'} startIcon={<CloudUpload />} disabled={uploading} sx={{ minHeight: 46 }}>
                      {intakerPhotoUrl ? 'Person photo added' : 'Add person photo *'}
                      <input hidden type="file" accept="image/*" capture="environment" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadEvidence(file, setIntakerPhotoUrl) }} />
                    </Button>
                    <Button component="label" variant="outlined" startIcon={<CloudUpload />} disabled={uploading} sx={{ minHeight: 46 }}>
                      {drivingLicensePhotoUrl ? 'License photo added' : 'Driving license photo (optional)'}
                      <input hidden type="file" accept="image/*,application/pdf" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadEvidence(file, setDrivingLicensePhotoUrl) }} />
                    </Button>
                  </Stack>
                </Stack>
              </Box>

              <Divider />
              <Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, mb: 1.5 }}>
                  <Box>
                    <Typography sx={{ fontWeight: 800, color: colors.slate[900] }}>Vehicle papers</Typography>
                    <Typography sx={{ color: colors.slate[500], fontSize: '0.82rem' }}>Upload available papers and record whether the original has been checked.</Typography>
                  </Box>
                  <Button variant="outlined" onClick={addVehicleDocument}>Add paper</Button>
                </Stack>
                <Stack spacing={1.5}>
                  {vehicleDocuments.length === 0 ? <Alert severity="info">No vehicle papers added yet. Add each available paper and verify it at the gate.</Alert> : null}
                  {vehicleDocuments.map((document, index) => (
                    <Box key={index} sx={{ ...infoPanelSx, p: 1.5 }}>
                      <Stack spacing={1.5}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                          <TextField select label="Paper type" value={document.documentType} onChange={(event) => setVehicleDocuments((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, documentType: event.target.value as CWVehicleDocumentType } : row))} fullWidth>
                            {documentTypes.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
                          </TextField>
                          <TextField label="Document number (optional)" value={document.documentNumber ?? ''} onChange={(event) => setVehicleDocuments((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, documentNumber: event.target.value } : row))} fullWidth />
                          <IconButton aria-label="Remove paper" onClick={() => setVehicleDocuments((rows) => rows.filter((_, rowIndex) => rowIndex !== index))}><DeleteOutlined /></IconButton>
                        </Stack>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
                          <Button component="label" variant={document.fileUrl ? 'outlined' : 'contained'} startIcon={<CloudUpload />} disabled={uploading}>
                            {document.fileUrl ? 'File added' : 'Upload paper *'}
                            <input hidden type="file" accept="image/*,application/pdf" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadEvidence(file, (fileUrl) => setVehicleDocuments((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, fileUrl } : row))) }} />
                          </Button>
                          <FormControlLabel control={<input type="checkbox" checked={document.verificationStatus === 'Verified'} onChange={(event) => setVehicleDocuments((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, verificationStatus: event.target.checked ? 'Verified' : 'Pending' } : row))} />} label="Original checked and verified" />
                        </Stack>
                        <TextField label="Verification note (optional)" value={document.verificationNote ?? ''} onChange={(event) => setVehicleDocuments((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, verificationNote: event.target.value } : row))} fullWidth multiline minRows={2} />
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2, pt: 0 }}>
            <Button variant="outlined" size="large" onClick={() => setStep('idle')}
              sx={{ fontWeight: 700, borderRadius: '10px', borderColor: colors.slate[300], color: colors.slate[700] }}>
              Cancel
            </Button>
            <Button variant="contained" size="large" onClick={confirmEntry} disabled={uploading || !intakerName.trim() || !intakerPhone.trim() || !intakerPhotoUrl}
              sx={{ fontWeight: 700, borderRadius: '10px', bgcolor: colors.slate[900], '&:hover': { bgcolor: colors.slate[800] } }}>
              Confirm
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── Vehicle Lookup Card ── */}
        <Box sx={{
          borderRadius: radii.lg, border: `1px solid ${colors.border.default}`,
          background: colors.bg.card, boxShadow: shadows.card, overflow: 'hidden',
        }}>
          <Box sx={{ px: 3, pt: 2.5, pb: 2 }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <DoorFront sx={{ color: colors.slate[900], fontSize: '1.3rem' }} />
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', color: colors.slate[900] }}>
                  Vehicle Lookup
                </Typography>
                <Typography sx={{ color: colors.slate[500], fontSize: '0.8rem' }}>
                  Search by VIN or Registration number. Then press Entry or Exit Check.
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Box sx={{ px: 3, pb: 3 }}>
            <Stack spacing={2.5}>
              {error ? <Alert severity="error" sx={{ borderRadius: '10px' }}>{error}</Alert> : null}

              {/* Search mode toggle */}
              <ToggleButtonGroup
                value={searchMode}
                exclusive
                onChange={(_, val) => { if (val) { setSearchMode(val); setSearchValue('') } }}
                size="large"
                sx={{ alignSelf: 'flex-start' }}
              >
                <ToggleButton value="registration" sx={{
                  fontWeight: 700, px: 3, borderRadius: '10px 0 0 10px',
                  '&.Mui-selected': { bgcolor: colors.slate[900], color: '#fff', '&:hover': { bgcolor: colors.slate[800] } },
                }}>
                  Registration No
                </ToggleButton>
                <ToggleButton value="vin" sx={{
                  fontWeight: 700, px: 3, borderRadius: '0 10px 10px 0',
                  '&.Mui-selected': { bgcolor: colors.slate[900], color: '#fff', '&:hover': { bgcolor: colors.slate[800] } },
                }}>
                  VIN
                </ToggleButton>
              </ToggleButtonGroup>

              {/* Search input */}
              <TextField
                label={searchMode === 'registration' ? 'Registration No' : 'VIN'}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder={searchMode === 'registration' ? 'e.g. ঢাকা-মেট্রো-ঘ-১২-৩৪৫৬ / Dhaka-Metro-Gha-12-3456' : 'e.g. 1HGCM82633A004352'}
                fullWidth
                slotProps={{
                  input: {
                    sx: { fontSize: 28, fontWeight: 900, letterSpacing: 0.5 },
                  },
                  inputLabel: { sx: { fontSize: 18, fontWeight: 700 } },
                }}
              />

              <Divider sx={{ borderColor: colors.border.default }} />

              {step === 'idle' ? (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Button
                    variant="contained" size="large" onClick={startEntry} disabled={!normalizedValue}
                    startIcon={<Login />}
                    sx={{
                      py: 2, fontSize: 18, fontWeight: 700, flex: 1, borderRadius: '12px',
                      bgcolor: colors.slate[900], '&:hover': { bgcolor: colors.slate[800] },
                    }}
                  >
                    Entry
                  </Button>
                  <Button
                    variant="outlined" size="large" onClick={runExitCheck} disabled={!normalizedValue}
                    startIcon={<ExitToApp />}
                    sx={{
                      py: 2, fontSize: 18, fontWeight: 700, flex: 1, borderRadius: '12px',
                      borderColor: colors.slate[300], color: colors.slate[700],
                      '&:hover': { borderColor: colors.slate[900], bgcolor: colors.slate[50] },
                    }}
                  >
                    Exit Check
                  </Button>
                </Stack>
              ) : null}

              {/* Entry logged confirmation */}
              {entryCreated ? (
                <Box sx={infoPanelSx}>
                  <Stack spacing={1}>
                    <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', color: colors.slate[900] }}>
                      Entry logged
                    </Typography>
                    <Typography sx={{ color: colors.slate[500], fontSize: '0.85rem' }}>
                      Registration: <strong>{entryCreated.registrationNo}</strong>
                    </Typography>
                    <Typography sx={{ color: colors.slate[500], fontSize: '0.82rem' }}>
                      Arrived: {new Date(entryCreated.arrivedAt).toLocaleString()}
                    </Typography>
                    {entryCreated.isTemporary && (
                      <Typography sx={{ color: colors.status.warning, fontWeight: 600, fontSize: '0.85rem' }}>
                        Temporary entry — CRE will resolve.
                      </Typography>
                    )}
                  </Stack>
                </Box>
              ) : null}

              {/* Exit result */}
              {step === 'exit-result' && exitResult ? (
                <Box sx={infoPanelSx}>
                  <Stack spacing={2}>
                    <Typography
                      sx={{
                        fontWeight: 800, textAlign: 'center',
                        fontSize: { xs: '2rem', sm: '2.5rem' },
                        color: exitResult.allowed ? colors.status.success : colors.status.error,
                      }}
                    >
                      {exitResult.allowed ? 'ALLOWED' : 'BLOCKED'}
                    </Typography>

                    <Typography sx={{ fontWeight: 700, textAlign: 'center', fontSize: '1.1rem', color: colors.slate[900] }}>
                      {exitResult.reason}
                    </Typography>

                    <Divider sx={{ borderColor: colors.border.default }} />

                    <Stack spacing={0.75}>
                      <Typography sx={{ color: colors.slate[500], fontSize: '0.85rem' }}>
                        {searchMode === 'registration' ? 'Registration' : 'VIN'}: <strong>{normalizedValue.toUpperCase()}</strong>
                      </Typography>
                      {exitResult.job ? (
                        <Typography sx={{ color: colors.slate[500], fontSize: '0.85rem' }}>
                          Job status: {exitResult.job.status}
                        </Typography>
                      ) : null}
                      {exitResult.pending ? (
                        <Typography sx={{ color: colors.slate[500], fontSize: '0.85rem' }}>
                          Pending status: {exitResult.pending.status}
                        </Typography>
                      ) : null}
                    </Stack>

                    {exitResult.job?.status === 'Test Drive Approved' ? (
                      <Box sx={infoPanelSx}>
                        <Typography sx={{ fontWeight: 700, mb: 1, color: colors.slate[900] }}>Test drive details</Typography>
                        <Stack spacing={0.75}>
                          <Typography sx={{ fontSize: '0.85rem', color: colors.slate[500] }}>
                            Driver: {exitResult.job.testDriveDriverName ?? '—'}
                          </Typography>
                          <Typography sx={{ fontSize: '0.85rem', color: colors.slate[500] }}>
                            NID: {exitResult.job.testDriveDriverNid ?? '—'}
                          </Typography>
                          <Typography sx={{ fontSize: '0.85rem', color: colors.slate[500] }}>
                            Expected return: {exitResult.job.testDriveExpectedReturnAt ? new Date(exitResult.job.testDriveExpectedReturnAt).toLocaleString() : '—'}
                          </Typography>
                        </Stack>
                      </Box>
                    ) : null}

                    <Stack direction="row" spacing={2}>
                      {exitResult.allowed && (() => {
                        const veh = findVehicle()
                        const relAppt = veh
                          ? appointments.find((a) => a.vehicleId === veh.id && a.status === 'Payment Done')
                          : null
                        return relAppt ? (
                          <Button variant="contained" color="success" size="large"
                            onClick={() => { releaseVehicle({ appointmentId: relAppt.id }); reset() }}
                            sx={{ py: 1.75, fontWeight: 700, flex: 1, borderRadius: '12px' }}>
                            Release Vehicle
                          </Button>
                        ) : null
                      })()}
                      <Button variant="contained" size="large" onClick={reset}
                        sx={{ py: 1.75, fontWeight: 700, flex: 1, borderRadius: '12px', bgcolor: colors.slate[900], '&:hover': { bgcolor: colors.slate[800] } }}>
                        New
                      </Button>
                    </Stack>
                  </Stack>
                </Box>
              ) : null}
            </Stack>
          </Box>
        </Box>
      </Stack>
    </Box>
  )
}
