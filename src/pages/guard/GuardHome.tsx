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
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import { Page } from '../../components/Page'
import { useCwStore } from '../../store/cwStore'
import type { CWJob, CWPendingVehicle } from '../../types/cw'

type Step = 'idle' | 'entry-confirm' | 'exit-result'

type ExitResult = {
  allowed: boolean
  reason: string
  job?: CWJob
  pending?: CWPendingVehicle
}

function normalizeKey(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function GuardHome() {
  const pendingVehicles = useCwStore((s) => s.pendingVehicles)
  const jobs = useCwStore((s) => s.jobs)
  const vehicles = useCwStore((s) => s.vehicles)
  const appointments = useCwStore((s) => s.appointments)
  const createPendingVehicle = useCwStore((s) => s.createPendingVehicle)
  const setAppointmentGateEntry = useCwStore((s) => s.setAppointmentGateEntry)

  const [step, setStep] = useState<Step>('idle')
  const [registrationNo, setRegistrationNo] = useState('')
  const [error, setError] = useState<string | null>(null)

  const [entryCreated, setEntryCreated] = useState<CWPendingVehicle | null>(null)
  const [exitResult, setExitResult] = useState<ExitResult | null>(null)
  const [successOpen, setSuccessOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const normalizedReg = useMemo(() => registrationNo.trim(), [registrationNo])
  const regKey = useMemo(() => normalizeKey(registrationNo), [registrationNo])

  const latestPending = useMemo(() => {
    if (!regKey) return null
    return pendingVehicles
      .filter((p) => normalizeKey(p.registrationNo) === regKey)
      .slice()
      .sort((a, b) => b.arrivedAt.localeCompare(a.arrivedAt))
      .at(0) ?? null
  }, [pendingVehicles, regKey])

  const latestJob = useMemo(() => {
    if (!regKey) return null
    return jobs
      .filter((j) => normalizeKey(j.registrationNo) === regKey)
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .at(0) ?? null
  }, [jobs, regKey])

  function reset() {
    setError(null)
    setStep('idle')
    setRegistrationNo('')
    setEntryCreated(null)
    setExitResult(null)
    setSuccessOpen(false)
    setSuccessMessage('')
  }

  function startEntry() {
    setError(null)
    if (!normalizedReg) {
      setError('Registration no is required')
      return
    }
    setStep('entry-confirm')
  }

  function confirmEntry() {
    try {
      setError(null)

      const reg = normalizedReg.toUpperCase()
      const vehicle = vehicles.find((v) => normalizeKey(v.registrationNo) === normalizeKey(reg))

      const appt = vehicle
        ? appointments
            .filter((a) => a.vehicleId === vehicle.id)
            .filter((a) => a.status !== 'Closed')
            .slice()
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
            .at(0) ?? null
        : null

      const created = createPendingVehicle({
        registrationNo: reg,
        customerId: appt?.customerId ?? vehicle?.customerId,
        vehicleId: appt?.vehicleId ?? vehicle?.id,
        appointmentId: appt?.id,
        isTemporary: !vehicle,
      })

      if (appt) {
        setAppointmentGateEntry(appt.id, created.id)
      }

      setEntryCreated(created)
      setRegistrationNo('')
      setStep('idle')

      if (created.isTemporary) setSuccessMessage(`Temporary entry logged: ${created.registrationNo}`)
      else if (created.appointmentId) setSuccessMessage(`Entry linked to appointment: ${created.registrationNo}`)
      else setSuccessMessage(`Entry logged: ${created.registrationNo}`)

      setSuccessOpen(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function runExitCheck() {
    setError(null)
    if (!normalizedReg) {
      setError('Registration no is required')
      return
    }

    const job = latestJob
    const pending = latestPending

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

      <Dialog open={step === 'entry-confirm'} onClose={() => setStep('idle')} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900 }}>Confirm entry</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Registration: <strong>{normalizedReg.toUpperCase()}</strong>
          </Typography>
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
            <Typography sx={{ fontWeight: 900 }}>Registration</Typography>
            <Typography variant="body2" color="text.secondary">
              Type registration number. Then press Entry or Exit Check.
            </Typography>
          </Box>

          {error ? <Alert severity="error">{error}</Alert> : null}

          <TextField
            label="Registration No"
            value={registrationNo}
            onChange={(e) => setRegistrationNo(e.target.value)}
            placeholder="e.g. KL 01 AB 1234"
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
                disabled={!normalizedReg}
                sx={{ py: 2, fontSize: 18, fontWeight: 900, flex: 1 }}
              >
                Entry
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={runExitCheck}
                disabled={!normalizedReg}
                sx={{ py: 2, fontSize: 18, fontWeight: 900, flex: 1 }}
              >
                Exit Check
              </Button>
            </Stack>
          ) : null}

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
              </Stack>
            </Paper>
          ) : null}

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
                    Registration: <strong>{normalizedReg.toUpperCase()}</strong>
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

                <Button variant="contained" size="large" onClick={reset} sx={{ py: 1.75, fontWeight: 900 }}>
                  New
                </Button>
              </Stack>
            </Paper>
          ) : null}
        </Stack>
      </Paper>
    </Page>
  )
}
