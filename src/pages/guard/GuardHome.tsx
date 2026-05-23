import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Snackbar,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import { Page } from '../../components/Page'
import { useCwStore } from '../../store/cwStore'
import type { CWAppointment, CWCustomer, CWJob, CWPendingVehicle, CWVehicle } from '../../types/cw'

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

  const normalizedValue = useMemo(() => searchValue.trim(), [searchValue])
  const searchKey = useMemo(() => normalizeKey(searchValue), [searchValue])

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
      const vehicle = matchResult?.vehicle ?? null
      const regNo = vehicle ? vehicle.registrationNo : normalizedValue.toUpperCase()
      const appt = matchResult?.appointment ?? null

      const created = createPendingVehicle({
        registrationNo: regNo,
        customerId: appt?.customerId ?? vehicle?.customerId,
        vehicleId: appt?.vehicleId ?? vehicle?.id,
        appointmentId: appt?.id,
        isTemporary: !vehicle,
      })

      if (appt) {
        setAppointmentGateEntry(appt.id, created.id)
      }

      setEntryCreated(created)
      setSearchValue('')
      setStep('idle')

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

  return (
    <Page title="Guard" subtitle="Gate entry & exit check (tablet-first).">
      <Snackbar
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        autoHideDuration={2500}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setSuccessOpen(false)} severity="success" variant="filled" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>

      {/* Re-entry warning dialog */}
      <Dialog open={step === 'reentry-confirm'} onClose={() => setStep('idle')} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900, color: 'warning.main' }}>⚠ Recent Exit Detected</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            {reentryInfo && (
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'warning.50' }}>
                <Stack spacing={1}>
                  <Typography variant="body1" sx={{ fontWeight: 700 }}>
                    This vehicle exited <strong>{formatDuration(reentryInfo.exitedMinsAgo)}</strong> ago.
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Registration: <strong>{reentryInfo.vehicle.registrationNo}</strong>
                  </Typography>
                  {reentryInfo.vehicle.vin && (
                    <Typography variant="body2" color="text.secondary">
                      VIN: <strong>{reentryInfo.vehicle.vin}</strong>
                    </Typography>
                  )}
                  {reentryInfo.customer && (
                    <Typography variant="body2" color="text.secondary">
                      Customer: <strong>{reentryInfo.customer.fullName}</strong> · {reentryInfo.customer.phone}
                    </Typography>
                  )}
                  <Typography variant="body2" color="text.secondary">
                    Vehicle: {[reentryInfo.vehicle.make, reentryInfo.vehicle.model].filter(Boolean).join(' ') || '—'}
                  </Typography>
                </Stack>
              </Paper>
            )}
            <Typography sx={{ fontWeight: 600 }}>
              Do you want to re-entry this vehicle?
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button variant="outlined" size="large" onClick={() => { setStep('idle'); setReentryInfo(null) }} sx={{ fontWeight: 900 }}>
            Cancel
          </Button>
          <Button variant="contained" color="warning" size="large" onClick={confirmReentry} sx={{ fontWeight: 900 }}>
            Yes, Re-entry
          </Button>
        </DialogActions>
      </Dialog>

      {/* Entry confirm dialog */}
      <Dialog open={step === 'entry-confirm'} onClose={() => setStep('idle')} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900 }}>Confirm Entry</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Typography color="text.secondary">
              {searchMode === 'registration' ? 'Registration' : 'VIN'}: <strong>{normalizedValue.toUpperCase()}</strong>
            </Typography>

            {matchResult?.vehicle ? (
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'success.50' }}>
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {matchResult.appointment ? (
                      <Box sx={{ px: 1.5, py: 0.25, bgcolor: 'success.main', borderRadius: 1, color: 'white', fontWeight: 800, fontSize: 12 }}>
                        PRE-BOOKED
                      </Box>
                    ) : (
                      <Box sx={{ px: 1.5, py: 0.25, bgcolor: 'warning.main', borderRadius: 1, color: 'white', fontWeight: 800, fontSize: 12 }}>
                        WALK-IN
                      </Box>
                    )}
                  </Box>
                  {matchResult.customer && (
                    <Typography variant="body2">
                      <strong>Customer:</strong> {matchResult.customer.fullName} · {matchResult.customer.phone}
                    </Typography>
                  )}
                  <Typography variant="body2">
                    <strong>Vehicle:</strong> {matchResult.vehicle.registrationNo} · {[matchResult.vehicle.make, matchResult.vehicle.model].filter(Boolean).join(' ') || '—'}
                  </Typography>
                  {matchResult.vehicle.vin && (
                    <Typography variant="body2">
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
                          <Typography variant="body2">
                            <strong>Service Advisor:</strong> {sa.fullName}
                          </Typography>
                        )}
                        <Typography variant="body2">
                          <strong>Slot:</strong> {matchResult.appointment!.slotDate ?? '—'} {matchResult.appointment!.slotTime ?? ''}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Appointment status: {matchResult.appointment!.status}
                        </Typography>
                      </>
                    )
                  })()}
                </Stack>
              </Paper>
            ) : (
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'warning.50' }}>
                <Stack spacing={1}>
                  <Box sx={{ px: 1.5, py: 0.25, bgcolor: 'error.main', borderRadius: 1, color: 'white', fontWeight: 800, fontSize: 12, alignSelf: 'flex-start' }}>
                    NO MATCH
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    No existing vehicle found. Will be logged as temporary entry for CRE to resolve.
                  </Typography>
                </Stack>
              </Paper>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button variant="outlined" size="large" onClick={() => setStep('idle')} sx={{ fontWeight: 900 }}>
            Cancel
          </Button>
          <Button variant="contained" size="large" onClick={confirmEntry} sx={{ fontWeight: 900 }}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      <Paper sx={{ p: { xs: 2, sm: 3 }, border: '1px solid', borderColor: 'divider' }}>
        <Stack spacing={2.5}>
          <Box>
            <Typography sx={{ fontWeight: 900 }}>Vehicle Lookup</Typography>
            <Typography variant="body2" color="text.secondary">
              Search by VIN or Registration number. Then press Entry or Exit Check.
            </Typography>
          </Box>

          {error ? <Alert severity="error">{error}</Alert> : null}

          {/* Search mode toggle */}
          <ToggleButtonGroup
            value={searchMode}
            exclusive
            onChange={(_, val) => { if (val) { setSearchMode(val); setSearchValue('') } }}
            size="large"
            sx={{ alignSelf: 'flex-start' }}
          >
            <ToggleButton value="registration" sx={{ fontWeight: 800, px: 3 }}>
              Registration No
            </ToggleButton>
            <ToggleButton value="vin" sx={{ fontWeight: 800, px: 3 }}>
              VIN
            </ToggleButton>
          </ToggleButtonGroup>

          {/* Search input */}
          <TextField
            label={searchMode === 'registration' ? 'Registration No' : 'VIN'}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder={searchMode === 'registration' ? 'e.g. KL 01 AB 1234' : 'e.g. 1HGCM82633A004352'}
            fullWidth
            slotProps={{
              input: {
                sx: { fontSize: 28, fontWeight: 900, letterSpacing: 0.5 },
              },
              inputLabel: { sx: { fontSize: 18, fontWeight: 700 } },
            }}
          />

          <Divider />

          {step === 'idle' ? (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button
                variant="contained"
                size="large"
                onClick={startEntry}
                disabled={!normalizedValue}
                sx={{ py: 2, fontSize: 18, fontWeight: 900, flex: 1 }}
              >
                Entry
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={runExitCheck}
                disabled={!normalizedValue}
                sx={{ py: 2, fontSize: 18, fontWeight: 900, flex: 1 }}
              >
                Exit Check
              </Button>
            </Stack>
          ) : null}

          {/* Entry logged confirmation */}
          {entryCreated ? (
            <Paper variant="outlined" sx={{ p: 2.5 }}>
              <Stack spacing={1}>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                  Entry logged
                </Typography>
                <Typography color="text.secondary">
                  Registration: <strong>{entryCreated.registrationNo}</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Arrived: {new Date(entryCreated.arrivedAt).toLocaleString()}
                </Typography>
                {entryCreated.isTemporary && (
                  <Typography variant="body2" color="warning.main" sx={{ fontWeight: 600 }}>
                    Temporary entry — CRE will resolve.
                  </Typography>
                )}
              </Stack>
            </Paper>
          ) : null}

          {/* Exit result */}
          {step === 'exit-result' && exitResult ? (
            <Paper variant="outlined" sx={{ p: 2.5 }}>
              <Stack spacing={2}>
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 900,
                    textAlign: 'center',
                    color: exitResult.allowed ? 'success.main' : 'error.main',
                  }}
                >
                  {exitResult.allowed ? 'ALLOWED' : 'BLOCKED'}
                </Typography>

                <Typography variant="h6" sx={{ fontWeight: 900, textAlign: 'center' }}>
                  {exitResult.reason}
                </Typography>

                <Divider />

                <Stack spacing={0.75}>
                  <Typography color="text.secondary">
                    {searchMode === 'registration' ? 'Registration' : 'VIN'}: <strong>{normalizedValue.toUpperCase()}</strong>
                  </Typography>
                  {exitResult.job ? (
                    <Typography variant="body2" color="text.secondary">
                      Job status: {exitResult.job.status}
                    </Typography>
                  ) : null}
                  {exitResult.pending ? (
                    <Typography variant="body2" color="text.secondary">
                      Pending status: {exitResult.pending.status}
                    </Typography>
                  ) : null}
                </Stack>

                {exitResult.job?.status === 'Test Drive Approved' ? (
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography sx={{ fontWeight: 900, mb: 1 }}>Test drive details</Typography>
                    <Stack spacing={0.75}>
                      <Typography variant="body2" color="text.secondary">
                        Driver: {exitResult.job.testDriveDriverName ?? '—'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        NID: {exitResult.job.testDriveDriverNid ?? '—'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Expected return: {exitResult.job.testDriveExpectedReturnAt ? new Date(exitResult.job.testDriveExpectedReturnAt).toLocaleString() : '—'}
                      </Typography>
                    </Stack>
                  </Paper>
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
                        sx={{ py: 1.75, fontWeight: 900, flex: 1 }}>
                        Release Vehicle
                      </Button>
                    ) : null
                  })()}
                  <Button variant="contained" size="large" onClick={reset} sx={{ py: 1.75, fontWeight: 900, flex: 1 }}>
                    New
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          ) : null}
        </Stack>
      </Paper>
    </Page>
  )
}
