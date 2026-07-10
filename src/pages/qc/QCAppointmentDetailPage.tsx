import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import {
  ArrowBack,
  CheckCircle,
  Cancel,
  ExpandMore,
  ReportProblem,
  Verified,
  Build,
} from '@mui/icons-material'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { SectionCard } from '../../components/SectionCard'
import { useCwStore } from '../../store/cwStore'
import { WorkflowTimeline } from '../../components/WorkflowTimeline'
import { VehicleInfoBanner } from '../../components/VehicleInfoBanner'
import { SAInspectionTabs } from '../../components/SAInspectionTabs'
import { colors, radii, shadows } from '../../theme/tokens'
import type { QCItemVerification } from '../../store/cwStore'

function fmtBDT(n: number) {
  return `BDT ${n.toLocaleString('en-BD')}`
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <Stack direction="row" sx={{ alignItems: 'center', py: 1.25, borderBottom: `1px solid ${colors.border.subtle}` }}>
      <Typography sx={{ width: 180, flexShrink: 0, fontSize: '0.82rem', color: colors.slate[500], fontWeight: 500 }}>{label}</Typography>
      <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: colors.slate[900], flex: 1 }}>{value ?? '—'}</Typography>
    </Stack>
  )
}

function workStatusColor(s?: string): 'default' | 'info' | 'warning' | 'success' | 'primary' | 'error' {
  if (s === 'Completed') return 'success'
  if (s === 'In Progress') return 'primary'
  return 'warning'
}

export function QCAppointmentDetailPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>()
  const navigate = useNavigate()

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
      <Box sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
        <Stack spacing={3.5}>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 2 }}>
            <Box onClick={() => navigate('/qc')} sx={{ cursor: 'pointer', border: `1px solid ${colors.border.default}`, borderRadius: '10px', p: 0.75, display: 'flex' }}>
              <ArrowBack sx={{ fontSize: '1.1rem', color: colors.slate[600] }} />
            </Box>
            <Typography sx={{ fontWeight: 800, fontSize: '1.5rem', color: colors.slate[900] }}>
              QC — Not Found
            </Typography>
          </Stack>
          <Alert severity="error">Appointment not found.</Alert>
        </Stack>
      </Box>
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
    <Box sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
      <Stack spacing={3.5}>
        {/* Header */}
        <Stack direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' }, gap: 2 }}>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 2 }}>
            <Box onClick={() => navigate('/qc')} sx={{ cursor: 'pointer', border: `1px solid ${colors.border.default}`, borderRadius: '10px', p: 0.75, display: 'flex' }}>
              <ArrowBack sx={{ fontSize: '1.1rem', color: colors.slate[600] }} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.85rem' }, color: colors.slate[900], letterSpacing: '-0.02em' }}>
                QC — {vehicle?.registrationNo ?? 'Appointment'}
              </Typography>
              <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>
                {customer?.fullName ?? ''}
              </Typography>
            </Box>
          </Stack>
          <Chip label={appt.status} color="primary" sx={{ fontWeight: 800, fontSize: '0.78rem', alignSelf: { xs: 'flex-start', md: 'center' } }} />
        </Stack>

        {/* Vehicle + Customer Info card */}
        <SectionCard title="Vehicle & Customer" icon={<Verified sx={{ fontSize: '1rem' }} />}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
            <Box sx={{ flex: 1 }}>
              <InfoRow label="Registration" value={vehicle?.registrationNo} />
              <InfoRow label="Vehicle" value={`${vehicle?.make ?? ''} ${vehicle?.model ?? ''}`.trim() || '—'} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <InfoRow label="Customer" value={customer?.fullName} />
              <InfoRow label="Phone" value={customer?.phone} />
            </Box>
          </Stack>
        </SectionCard>

        {/* Vehicle + Customer Info */}
        <VehicleInfoBanner appointmentId={appt.id} />

        {/* Timeline */}
        <WorkflowTimeline status={appt.status} timeline={appt.timeline} />

        {/* SA Health Check Report (readonly, collapsible) */}
        {appt.inspectionChecks.length > 0 && (
          <Accordion disableGutters sx={{
            border: `1px solid ${colors.border.default}`,
            '&:before': { display: 'none' },
            boxShadow: shadows.card,
            borderRadius: `${radii.lg} !important`,
            overflow: 'hidden',
          }}>
            <AccordionSummary expandIcon={<ExpandMore />} sx={{
              bgcolor: colors.slate[900], color: 'white',
              '& .MuiSvgIcon-root': { color: 'white' },
            }}>
              <Typography sx={{ fontWeight: 800, fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.01em' }}>
                SA Health Check Report
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 2.5 }}>
              <SAInspectionTabs checks={appt.inspectionChecks} onChange={() => {}} readonly />
            </AccordionDetails>
          </Accordion>
        )}

        {/* ── Concerns (readonly — no QC marking) ── */}
        <SectionCard title={`Concerns (${allConcerns.length})`} icon={<ReportProblem sx={{ fontSize: '1rem' }} />}>
          <Stack spacing={2}>
            {allConcerns.map((c) => {
              const concernServices = (c.serviceIds ?? []).map((sid) => services.find((s) => s.id === sid)).filter(Boolean)
              const concernParts = partRequests.filter((pr) => pr.appointmentId === appointmentId && pr.concernItemId === c.id)
              return (
                <Box key={c.id} sx={{
                  p: 2, borderRadius: radii.sm,
                  border: `1px solid ${colors.border.default}`,
                  bgcolor: colors.bg.subtle,
                }}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Typography sx={{ fontWeight: 800, fontSize: '0.88rem', color: colors.slate[900] }}>{c.concernName}</Typography>
                      {typeof c.processTimeMins === 'number' && (
                        <Chip size="small" label={`${c.processTimeMins} mins`} color="info" sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
                      )}
                    </Stack>
                    <Chip label={c.workStatus ?? 'Pending'} size="small"
                      color={workStatusColor(c.workStatus)} sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
                  </Stack>
                  {c.remark && <Typography sx={{ fontSize: '0.82rem', color: colors.slate[500] }}>{c.remark}</Typography>}
                  {c.diagnosisRemark && (
                    <Typography sx={{ fontSize: '0.82rem', mt: 0.5, color: colors.slate[700] }}>
                      <strong>SE Diagnosis:</strong> {c.diagnosisRemark}
                    </Typography>
                  )}
                  {c.technicianAssignments.length > 0 && (
                    <Typography sx={{ fontSize: '0.72rem', color: colors.slate[500], display: 'block', mt: 0.5 }}>
                      Technicians: {c.technicianAssignments.map((ta) => userNameById.get(ta.technicianUserId)).filter(Boolean).join(', ')}
                    </Typography>
                  )}
                  {/* Linked services from concern diagnosis */}
                  {concernServices.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.72rem', color: colors.status.info }}>Services linked to this concern:</Typography>
                      <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                        {concernServices.map((svc) => svc && (
                          <Chip key={svc.id} size="small" label={`${svc.code} · ${svc.description} · ${fmtBDT(svc.price)}`} color="info" variant="outlined" sx={{ fontWeight: 600, fontSize: '0.72rem' }} />
                        ))}
                      </Stack>
                    </Box>
                  )}
                  {concernParts.length > 0 && (
                    <Stack spacing={0.5} sx={{ mt: 1 }}>
                      {concernParts.map((pr) => (
                        <Typography key={pr.id} sx={{ fontSize: '0.72rem', color: colors.slate[500] }}>
                          Part: {pr.partName} x{pr.quantity ?? 1} — {pr.status}
                        </Typography>
                      ))}
                    </Stack>
                  )}
                </Box>
              )
            })}
          </Stack>
        </SectionCard>

        {/* ── Services (QC marking — Pass/Fail) ── */}
        <SectionCard title={`Services — QC Verification (${allServices.length})`} icon={<Build sx={{ fontSize: '1rem' }} />}>
          {allServices.length === 0 ? (
            <Typography sx={{ fontSize: '0.85rem', color: colors.slate[500] }}>No services.</Typography>
          ) : (
            <Stack spacing={2}>
              {allServices.map((s) => {
                const qcSt = itemStatuses[s.id]
                return (
                  <Box key={s.id} sx={{
                    p: 2, borderRadius: radii.sm,
                    border: `1px solid ${qcSt === 'Passed' ? colors.status.success : qcSt === 'Failed' ? colors.status.error : colors.border.default}`,
                    bgcolor: qcSt === 'Passed' ? 'rgba(16,185,129,0.04)' : qcSt === 'Failed' ? 'rgba(239,68,68,0.04)' : colors.bg.subtle,
                  }}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Box>
                        <Typography sx={{ fontWeight: 800, fontSize: '0.88rem', color: colors.slate[900] }}>
                          {s.serviceDescription} ({s.processTimeMins} mins)
                        </Typography>
                        <Typography sx={{ fontSize: '0.72rem', color: colors.slate[500] }}>{s.serviceCode} · {fmtBDT(s.price)}</Typography>
                      </Box>
                      <Chip label={s.workStatus ?? 'Pending'} size="small"
                        color={workStatusColor(s.workStatus)} sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
                    </Stack>
                    {s.technicianAssignments.length > 0 && (
                      <Typography sx={{ fontSize: '0.72rem', color: colors.slate[500], display: 'block' }}>
                        Technicians: {s.technicianAssignments.map((ta) => userNameById.get(ta.technicianUserId)).filter(Boolean).join(', ')}
                      </Typography>
                    )}

                    {/* QC verification controls */}
                    {isQCAssigned && (
                      <Stack spacing={1} sx={{ mt: 1.5, pt: 1.5, borderTop: `1px dashed ${colors.border.default}` }}>
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                          <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: colors.slate[700] }}>QC Verdict:</Typography>
                          <ToggleButtonGroup
                            size="small"
                            exclusive
                            value={qcSt ?? null}
                            onChange={(_, val) => val && setItemStatuses((prev) => ({ ...prev, [s.id]: val }))}
                          >
                            <ToggleButton value="Passed" color="success" sx={{ borderRadius: radii.sm, fontWeight: 700, fontSize: '0.78rem' }}>
                              <CheckCircle sx={{ mr: 0.5, fontSize: 16 }} /> Pass
                            </ToggleButton>
                            <ToggleButton value="Failed" color="error" sx={{ borderRadius: radii.sm, fontWeight: 700, fontSize: '0.78rem' }}>
                              <Cancel sx={{ mr: 0.5, fontSize: 16 }} /> Fail
                            </ToggleButton>
                          </ToggleButtonGroup>
                        </Stack>
                        <TextField
                          size="small" label="QC Note" placeholder="Add notes..."
                          value={itemNotes[s.id] ?? ''}
                          onChange={(e) => setItemNotes((prev) => ({ ...prev, [s.id]: e.target.value }))}
                          fullWidth multiline rows={2}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: radii.sm, fontSize: '0.85rem' } }}
                        />
                      </Stack>
                    )}

                    {/* Show existing QC status (readonly) */}
                    {!isQCAssigned && s.qcStatus && (
                      <Stack direction="row" spacing={1} sx={{ mt: 1, alignItems: 'center' }}>
                        <Chip size="small" label={`QC: ${s.qcStatus}`} color={s.qcStatus === 'Passed' ? 'success' : 'error'} sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
                        {s.qcNote && <Typography sx={{ fontSize: '0.72rem', color: colors.slate[500] }}>{s.qcNote}</Typography>}
                      </Stack>
                    )}
                  </Box>
                )
              })}
            </Stack>
          )}
        </SectionCard>

        {/* ── QC Action Buttons ── */}
        {isQCAssigned && (
          <SectionCard title="QC Verification Summary" icon={<Verified sx={{ fontSize: '1rem' }} />}>
            <Typography sx={{ fontSize: '0.85rem', color: colors.slate[500], mb: 2 }}>
              {verifiedCount} / {totalItems} services verified
              {hasFailedItems && ` · ${Object.values(itemStatuses).filter((s) => s === 'Failed').length} failed`}
            </Typography>

            {!allVerified && (
              <Alert severity="warning" sx={{ mb: 2, borderRadius: radii.sm }}>
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
                sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: radii.sm, fontSize: '0.85rem' } }}
              />
            )}

            <Stack direction="row" spacing={2}>
              {allPassed && (
                <Button
                  variant="contained" color="success" size="large"
                  sx={{ fontWeight: 800, flex: 1, py: 1.5, borderRadius: '10px' }}
                  onClick={handleApprove}
                  startIcon={<CheckCircle />}
                >
                  Approve — All Services Passed
                </Button>
              )}
              {hasFailedItems && (
                <Button
                  variant="contained" color="error" size="large"
                  sx={{ fontWeight: 800, flex: 1, py: 1.5, borderRadius: '10px' }}
                  onClick={handleReject}
                  disabled={!rejectionNote.trim()}
                  startIcon={<Cancel />}
                >
                  Reject — Send Back for Rework
                </Button>
              )}
            </Stack>
          </SectionCard>
        )}
      </Stack>
    </Box>
  )
}
