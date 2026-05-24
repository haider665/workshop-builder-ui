import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { CheckCircle, Cancel } from '@mui/icons-material'
import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Page } from '../../components/Page'
import { useCwStore } from '../../store/cwStore'
import { WorkflowTimeline } from '../../components/WorkflowTimeline'
import { VehicleInfoBanner } from '../../components/VehicleInfoBanner'
import { SAInspectionTabs } from '../../components/SAInspectionTabs'
import type { QCItemVerification } from '../../store/cwStore'

function fmtBDT(n: number) {
  return `BDT ${n.toLocaleString('en-BD')}`
}

export function QCAppointmentDetailPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>()

  const appointments = useCwStore((s) => s.appointments)
  const vehicles = useCwStore((s) => s.vehicles)
  const customers = useCwStore((s) => s.customers)
  const users = useCwStore((s) => s.users)
  const services = useCwStore((s) => s.services)
  const partRequests = useCwStore((s) => s.partRequests)
  const qcApprove = useCwStore((s) => s.qcApprove)
  const qcReject = useCwStore((s) => s.qcReject)

  const appt = useMemo(
    () => appointments.find((a) => a.id === appointmentId) ?? null,
    [appointments, appointmentId],
  )

  const vehicle = useMemo(() => (appt ? vehicles.find((v) => v.id === appt.vehicleId) : null), [vehicles, appt])
  const customer = useMemo(() => (appt ? customers.find((c) => c.id === appt.customerId) : null), [customers, appt])

  const userNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const u of users) map.set(u.id, u.fullName)
    return map
  }, [users])

  // Per-item QC verification state (services only)
  const [itemStatuses, setItemStatuses] = useState<Record<string, 'Passed' | 'Failed'>>({})
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({})
  const [rejectionNote, setRejectionNote] = useState('')

  if (!appt) {
    return (
      <Page title="QC — Not Found">
        <Alert severity="error">Appointment not found.</Alert>
      </Page>
    )
  }

  const isQCAssigned = appt.status === 'QC Assigned'

  const allConcerns = appt.concernItems
  const allServices = appt.serviceItems

  // QC only verifies services, not concerns
  const totalItems = allServices.length
  const verifiedCount = Object.keys(itemStatuses).length
  const allVerified = verifiedCount === totalItems && totalItems > 0
  const hasFailedItems = Object.values(itemStatuses).some((s) => s === 'Failed')
  const allPassed = allVerified && !hasFailedItems

  function buildItems(): QCItemVerification[] {
    const items: QCItemVerification[] = []
    for (const s of allServices) {
      if (itemStatuses[s.id]) {
        items.push({ itemId: s.id, itemType: 'service', status: itemStatuses[s.id]!, note: itemNotes[s.id]?.trim() || undefined })
      }
    }
    return items
  }

  function handleApprove() {
    if (!allPassed) return
    qcApprove({ appointmentId: appt!.id, actorName: 'QC', items: buildItems() })
  }

  function handleReject() {
    if (!hasFailedItems || !rejectionNote.trim()) return
    qcReject({ appointmentId: appt!.id, actorName: 'QC', rejectionNote: rejectionNote.trim(), items: buildItems() })
  }

  return (
    <Page title={`QC — ${vehicle?.registrationNo ?? 'Appointment'}`} subtitle={customer?.fullName ?? ''}>
      <Stack spacing={2.5}>
        {/* Header */}
        <Paper sx={{ p: 2.5, border: '1px solid', borderColor: 'divider' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
            <Box>
              <Typography sx={{ fontWeight: 900, fontSize: '1.1rem' }}>
                {vehicle?.registrationNo} · {vehicle?.make} {vehicle?.model}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Customer: {customer?.fullName} · {customer?.phone}
              </Typography>
            </Box>
            <Box sx={{ flexGrow: 1 }} />
            <Chip label={appt.status} color="primary" sx={{ fontWeight: 800 }} />
          </Stack>
        </Paper>

        {/* Vehicle + Customer Info */}
        <VehicleInfoBanner appointmentId={appt.id} />

        {/* Timeline */}
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

        {/* ── Concerns (readonly — no QC marking) ── */}
        <Paper sx={{ border: '1px solid', borderColor: 'divider', p: 2.5 }}>
          <Typography sx={{ fontWeight: 900, mb: 1.5 }}>
            Concerns ({allConcerns.length})
          </Typography>
          <Stack spacing={2}>
            {allConcerns.map((c) => {
              const concernServices = (c.serviceIds ?? []).map((sid) => services.find((s) => s.id === sid)).filter(Boolean)
              const concernParts = partRequests.filter((pr) => pr.appointmentId === appointmentId && pr.concernItemId === c.id)
              return (
                <Box key={c.id} sx={{ p: 2, borderRadius: 1, border: '1px solid', borderColor: 'divider', bgcolor: 'grey.50' }}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Typography sx={{ fontWeight: 800 }}>{c.concernName}</Typography>
                      {typeof c.processTimeMins === 'number' && (
                        <Chip size="small" label={`${c.processTimeMins} mins`} color="info" sx={{ fontWeight: 700 }} />
                      )}
                    </Stack>
                    <Chip label={c.workStatus ?? 'Pending'} size="small"
                      color={c.workStatus === 'Completed' ? 'success' : c.workStatus === 'In Progress' ? 'primary' : 'warning'} />
                  </Stack>
                  {c.remark && <Typography variant="body2" color="text.secondary">{c.remark}</Typography>}
                  {c.diagnosisRemark && (
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      <strong>SE Diagnosis:</strong> {c.diagnosisRemark}
                    </Typography>
                  )}
                  {c.technicianAssignments.length > 0 && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      Technicians: {c.technicianAssignments.map((ta) => userNameById.get(ta.technicianUserId)).filter(Boolean).join(', ')}
                    </Typography>
                  )}
                  {/* Linked services from concern diagnosis */}
                  {concernServices.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'info.main' }}>Services linked to this concern:</Typography>
                      <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                        {concernServices.map((svc) => svc && (
                          <Chip key={svc.id} size="small" label={`${svc.code} · ${svc.description} · ${fmtBDT(svc.price)}`} color="info" variant="outlined" />
                        ))}
                      </Stack>
                    </Box>
                  )}
                  {concernParts.length > 0 && (
                    <Stack spacing={0.5} sx={{ mt: 1 }}>
                      {concernParts.map((pr) => (
                        <Typography key={pr.id} variant="caption" color="text.secondary">
                          Part: {pr.partName} x{pr.quantity ?? 1} — {pr.status}
                        </Typography>
                      ))}
                    </Stack>
                  )}
                </Box>
              )
            })}
          </Stack>
        </Paper>

        {/* ── Services (QC marking — Pass/Fail) ── */}
        <Paper sx={{ border: '2px solid', borderColor: 'success.main', p: 2.5 }}>
          <Typography sx={{ fontWeight: 900, mb: 1.5, color: 'success.main' }}>
            Services — QC Verification ({allServices.length})
          </Typography>
          {allServices.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No services.</Typography>
          ) : (
            <Stack spacing={2}>
              {allServices.map((s) => {
                const qcSt = itemStatuses[s.id]
                return (
                  <Box key={s.id} sx={{
                    p: 2, borderRadius: 1, border: '1px solid',
                    borderColor: qcSt === 'Passed' ? 'success.main' : qcSt === 'Failed' ? 'error.main' : 'divider',
                    bgcolor: qcSt === 'Passed' ? 'success.50' : qcSt === 'Failed' ? 'error.50' : 'grey.50',
                  }}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Box>
                        <Typography sx={{ fontWeight: 800 }}>
                          {s.serviceDescription} ({s.processTimeMins} mins)
                        </Typography>
                        <Typography variant="caption" color="text.secondary">{s.serviceCode} · {fmtBDT(s.price)}</Typography>
                      </Box>
                      <Chip label={s.workStatus ?? 'Pending'} size="small"
                        color={s.workStatus === 'Completed' ? 'success' : s.workStatus === 'In Progress' ? 'primary' : 'warning'} />
                    </Stack>
                    {s.technicianAssignments.length > 0 && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        Technicians: {s.technicianAssignments.map((ta) => userNameById.get(ta.technicianUserId)).filter(Boolean).join(', ')}
                      </Typography>
                    )}

                    {/* QC verification controls */}
                    {isQCAssigned && (
                      <Stack spacing={1} sx={{ mt: 1.5, pt: 1.5, borderTop: '1px dashed', borderColor: 'divider' }}>
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>QC Verdict:</Typography>
                          <ToggleButtonGroup
                            size="small"
                            exclusive
                            value={qcSt ?? null}
                            onChange={(_, val) => val && setItemStatuses((prev) => ({ ...prev, [s.id]: val }))}
                          >
                            <ToggleButton value="Passed" color="success">
                              <CheckCircle sx={{ mr: 0.5, fontSize: 16 }} /> Pass
                            </ToggleButton>
                            <ToggleButton value="Failed" color="error">
                              <Cancel sx={{ mr: 0.5, fontSize: 16 }} /> Fail
                            </ToggleButton>
                          </ToggleButtonGroup>
                        </Stack>
                        <TextField
                          size="small" label="QC Note" placeholder="Add notes..."
                          value={itemNotes[s.id] ?? ''}
                          onChange={(e) => setItemNotes((prev) => ({ ...prev, [s.id]: e.target.value }))}
                          fullWidth multiline rows={2}
                        />
                      </Stack>
                    )}

                    {/* Show existing QC status (readonly) */}
                    {!isQCAssigned && s.qcStatus && (
                      <Stack direction="row" spacing={1} sx={{ mt: 1, alignItems: 'center' }}>
                        <Chip size="small" label={`QC: ${s.qcStatus}`} color={s.qcStatus === 'Passed' ? 'success' : 'error'} />
                        {s.qcNote && <Typography variant="caption" color="text.secondary">{s.qcNote}</Typography>}
                      </Stack>
                    )}
                  </Box>
                )
              })}
            </Stack>
          )}
        </Paper>

        {/* ── QC Action Buttons ── */}
        {isQCAssigned && (
          <Paper sx={{ border: '2px solid', borderColor: 'primary.main', p: 2.5 }}>
            <Typography sx={{ fontWeight: 900, mb: 1, color: 'primary.main' }}>
              QC Verification Summary
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {verifiedCount} / {totalItems} services verified
              {hasFailedItems && ` · ${Object.values(itemStatuses).filter((s) => s === 'Failed').length} failed`}
            </Typography>

            {!allVerified && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                All services must be marked as Passed or Failed before submitting.
              </Alert>
            )}

            {hasFailedItems && (
              <TextField
                label="Rejection Note (required)"
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
                fullWidth multiline rows={3}
                placeholder="Describe the overall issues found..."
                sx={{ mb: 2 }}
              />
            )}

            <Stack direction="row" spacing={2}>
              {allPassed && (
                <Button
                  variant="contained" color="success" size="large"
                  sx={{ fontWeight: 900, flex: 1, py: 1.5 }}
                  onClick={handleApprove}
                  startIcon={<CheckCircle />}
                >
                  Approve — All Services Passed
                </Button>
              )}
              {hasFailedItems && (
                <Button
                  variant="contained" color="error" size="large"
                  sx={{ fontWeight: 900, flex: 1, py: 1.5 }}
                  onClick={handleReject}
                  disabled={!rejectionNote.trim()}
                  startIcon={<Cancel />}
                >
                  Reject — Send Back for Rework
                </Button>
              )}
            </Stack>
          </Paper>
        )}
      </Stack>
    </Page>
  )
}
