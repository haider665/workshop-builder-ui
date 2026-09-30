import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
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
  ArrowBack,
  Build,
  DirectionsCar,
  Payment,
  Person,
  ReportProblem,
  Send,
  Verified,
} from '@mui/icons-material'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { SectionCard } from '../../components/SectionCard'
import { StatCard } from '../../components/StatCard'
import { WorkflowTimeline } from '../../components/WorkflowTimeline'
import { VehicleInfoBanner } from '../../components/VehicleInfoBanner'
import { WhatsAppHistory } from '../../components/WhatsAppHistory'
import { RequestMasterDataButton } from '../../components/RequestMasterDataButton'
import { useCwStore } from '../../store/cwStore'
import { useCREData } from '../../hooks/useCREData'
import { workshopApi } from '../../services/workshopApi'
import { useToast } from '../../hooks/useToast'
import type { CWAppointmentComment, CWAppointmentFeedback } from '../../types/cw'
import { headerCellSx, bodyCellSx } from '../../theme/tableStyles'
import { colors, radii, shadows } from '../../theme/tokens'

function fmtBDT(n: number) {
  return `BDT ${n.toLocaleString('en-BD')}`
}

function fmtDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtDateTime(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}


function statusColor(status: string): 'default' | 'info' | 'warning' | 'success' | 'primary' | 'error' {
  const map: Record<string, 'default' | 'info' | 'warning' | 'success' | 'primary' | 'error'> = {
    'Draft': 'default',
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
    'QC Assigned': 'info',
    'QC Approved': 'success',
    'QC Rejected': 'error',
    'Payment Pending': 'warning',
    'Payment Done': 'success',
    Released: 'success',
  }
  return map[status] ?? 'default'
}

/** InfoRow — reusable key-value display inside SectionCard */
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Stack direction="row" sx={{ alignItems: 'center', py: 1.25, borderBottom: `1px solid ${colors.border.subtle}` }}>
      <Typography sx={{ width: 180, flexShrink: 0, fontSize: '0.82rem', color: colors.slate[500], fontWeight: 500 }}>{label}</Typography>
      <Typography component="div" sx={{ fontSize: '0.85rem', fontWeight: 600, color: colors.slate[900], flex: 1 }}>{value}</Typography>
    </Stack>
  )
}

/** Action card — styled wrapper for workflow action sections */
function ActionCard({ borderColor, children }: { borderColor: string; children: React.ReactNode }) {
  return (
    <Box sx={{
      borderRadius: radii.lg,
      border: `2px solid ${borderColor}`,
      background: colors.bg.card,
      boxShadow: shadows.card,
      overflow: 'hidden',
      p: 2.5,
    }}>
      {children}
    </Box>
  )
}

export function AppointmentDetailPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>()
  useCREData()
  const navigate = useNavigate()

  const appointments = useCwStore((s) => s.appointments)
  const vehicles = useCwStore((s) => s.vehicles)
  const customers = useCwStore((s) => s.customers)
  const users = useCwStore((s) => s.users)
  const bays = useCwStore((s) => s.bays)
  const catalogServices = useCwStore((s) => s.services)
  const partRequests = useCwStore((s) => s.partRequests)
  const shops = useCwStore((s) => s.shops)
  const allConcerns = useCwStore((s) => s.concerns)
  const concernCategories = useCwStore((s) => s.concernCategories)
  const addWhatsappLog = useCwStore((s) => s.addWhatsappLog)
  const setAppointmentStatus = useCwStore((s) => s.setAppointmentStatus)
  const setCustomerApproval = useCwStore((s) => s.setCustomerApproval)
  const pushTimeline = useCwStore((s) => s.pushTimeline)
  const confirmPayment = useCwStore((s) => s.confirmPayment)
  const assignQC = useCwStore((s) => s.assignQC)
  const assignSA = useCwStore((s) => s.assignSA)
  const roles = useCwStore((s) => s.roles)
  const toast = useToast()

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

  const bayNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const b of bays) map.set(b.id, b.name)
    return map
  }, [bays])

  const shopById = useMemo(() => new Map(shops.map((s) => [s.id, s])), [shops])

  // Concern → shop name lookup: concernId → concern → categoryId → category → shopId → shop
  const getConcernShopName = useMemo(() => {
    const cMap = new Map(allConcerns.map((c) => [c.id, c]))
    const catMap = new Map(concernCategories.map((c) => [c.id, c]))
    return (concernId: string) => {
      const concern = cMap.get(concernId)
      if (!concern) return ''
      const shopId = catMap.get(concern.categoryId)?.shopId ?? ''
      return shopById.get(shopId)?.name ?? ''
    }
  }, [allConcerns, concernCategories, shopById])

  // Service → shop name lookup: serviceId → service → shopId → shop
  const getServiceShopName = useMemo(() => {
    const sMap = new Map(catalogServices.map((s) => [s.id, s]))
    return (serviceId: string) => {
      const svc = sMap.get(serviceId)
      return svc ? shopById.get(svc.shopId)?.name ?? '' : ''
    }
  }, [catalogServices, shopById])

  const [waDialogOpen, setWaDialogOpen] = useState(false)
  const [waMessage, setWaMessage] = useState('')
  const [waDialogPurpose, setWaDialogPurpose] = useState<'concern-approval' | 'service-approval' | 'payment' | 'reply'>('concern-approval')
  const [approvalNote, setApprovalNote] = useState('')
  const qcRoleId = useMemo(() => roles.find((r) => r.name === 'QC')?.id, [roles])
  const activeQCUsers = useMemo(() => users.filter((u) => u.status === 'Active' && qcRoleId && u.roleIds.includes(qcRoleId)), [users, qcRoleId])
  const [selectedQCUserId, setSelectedQCUserId] = useState('')
  const [selectedSAUserId, setSelectedSAUserId] = useState('')
  const [appointmentComments, setAppointmentComments] = useState<CWAppointmentComment[]>([])
  const [appointmentFeedback, setAppointmentFeedback] = useState<CWAppointmentFeedback[]>([])
  const [commentText, setCommentText] = useState('')
  const [mentionText, setMentionText] = useState('')
  const [noteText, setNoteText] = useState('')
  const [feedbackFormOpen, setFeedbackFormOpen] = useState(false)
  const [feedbackForm, setFeedbackForm] = useState({
    customerName: '', serviceNo: '', overallRating: '', serviceAdvisorRating: '', serviceQualityRating: '',
    deliveryTimeRating: '', vehicleConditionRating: '', facilityRating: '', recommendation: '', comments: '',
  })
  const saRoleId = useMemo(() => roles.find((r) => r.name === 'Service Advisor' || r.name === 'SA')?.id, [roles])
  const activeSAUsers = useMemo(() => users.filter((u) => u.status === 'Active' && saRoleId && u.roleIds.includes(saRoleId)), [users, saRoleId])
  const assignedSA = useMemo(() => (appt ? users.find((u) => u.id === appt.assignedSAUserId) : null), [users, appt])

  useEffect(() => {
    if (!appt?.id) return
    setNoteText(appt.notes || '')
    void Promise.all([
      workshopApi.listAppointmentComments(appt.id),
      workshopApi.listAppointmentFeedback(appt.id),
    ]).then(([commentsResponse, feedbackResponse]) => {
      setAppointmentComments(commentsResponse.data)
      setAppointmentFeedback(feedbackResponse.data)
    }).catch((error) => toast.error(error, 'Could not load appointment comments and feedback.'))
  }, [appt?.id, appt?.notes, toast])

  async function submitAppointmentComment() {
    if (!appt || !commentText.trim()) return
    try {
      const mentions = mentionText.split(',').map((value) => value.trim()).filter(Boolean)
      const created = await workshopApi.addAppointmentComment(appt.id, { comment: commentText.trim(), mentions })
      setAppointmentComments((current) => [created, ...current])
      setCommentText('')
      setMentionText('')
      toast.success('Comment added and mentioned users notified.')
    } catch (error) { toast.error(error, 'Could not add comment.') }
  }

  async function saveAppointmentNotes() {
    if (!appt) return
    try {
      await workshopApi.updateAppointment(appt.id, { notes: noteText })
      toast.success('Appointment notes saved.')
    } catch (error) { toast.error(error, 'Could not save notes.') }
  }

  async function submitAppointmentFeedback() {
    if (!appt) return
    try {
      const numeric = (value: string) => value ? Number(value) : undefined
      const created = await workshopApi.addAppointmentFeedback(appt.id, {
        feedbackSource: 'Customer',
        customerName: feedbackForm.customerName || customer?.fullName || '',
        serviceNo: feedbackForm.serviceNo,
        overallRating: numeric(feedbackForm.overallRating),
        serviceAdvisorRating: numeric(feedbackForm.serviceAdvisorRating),
        serviceQualityRating: numeric(feedbackForm.serviceQualityRating),
        deliveryTimeRating: numeric(feedbackForm.deliveryTimeRating),
        vehicleConditionRating: numeric(feedbackForm.vehicleConditionRating),
        facilityRating: numeric(feedbackForm.facilityRating),
        recommendation: feedbackForm.recommendation,
        comments: feedbackForm.comments,
      })
      setAppointmentFeedback((current) => [created, ...current])
      setFeedbackFormOpen(false)
      setFeedbackForm({ customerName: '', serviceNo: '', overallRating: '', serviceAdvisorRating: '', serviceQualityRating: '', deliveryTimeRating: '', vehicleConditionRating: '', facilityRating: '', recommendation: '', comments: '' })
      toast.success('Customer feedback recorded.')
    } catch (error) { toast.error(error, 'Could not save customer feedback.') }
  }

  if (!appt) {
    return (
      <Box sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
        <Alert severity="error">Appointment not found.</Alert>
      </Box>
    )
  }

  const totalBDT = (appt.serviceItems ?? []).reduce((sum, s) => sum + s.price, 0)

  // ── Workflow flags ──
  const isReviewed = appt.status === 'SA Reviewed'
  const isCustomerNotified = appt.status === 'Customer Notified'
  const isDiagnosisComplete = appt.status === 'Diagnosis Complete'
  const isServiceApprovalPending = appt.status === 'Service Approval Pending'
  const isServiceComplete = appt.status === 'Service Complete'
  const isQCApproved = appt.status === 'QC Approved'
  const isPaymentPending = appt.status === 'Payment Pending'

  const canSendConcernWA = isReviewed
  const canSendServiceWA = isDiagnosisComplete
  const canApprove = isCustomerNotified || isServiceApprovalPending
  const canAssignQC = isServiceComplete
  const canSendPaymentWA = isQCApproved
  const canConfirmPayment = isPaymentPending

  function openWhatsApp(purpose: 'concern-approval' | 'service-approval' | 'payment') {
    setWaDialogPurpose(purpose)
    const name = customer?.fullName ?? 'Customer'
    const reg = vehicle?.registrationNo ?? ''

    if (purpose === 'concern-approval') {
      const concernBlock = (appt!.concernItems ?? []).map((c) => {
        let block = `• ${c.concernName}`
        if (c.remark) block += `\n  Note: ${c.remark}`
        return block
      }).join('\n')
      const serviceList = (appt!.serviceItems ?? []).map((s) => `• ${s.serviceDescription} — ${fmtBDT(s.price)}`).join('\n')
      const total = (appt!.serviceItems ?? []).reduce((sum, s) => sum + s.price, 0)
      setWaMessage(`Dear ${name},\n\nVehicle: ${reg}\n\nConcerns:\n${concernBlock}\n\nProposed Services:\n${serviceList}\n\nEstimated Total: ${fmtBDT(total)}\n\nPlease confirm.`)
    } else if (purpose === 'service-approval') {
      const allParts = partRequests.filter((pr) => pr.appointmentId === appt!.id)
      const concernBlock = (appt!.concernItems ?? []).map((c) => {
        const lines: string[] = [`• ${c.concernName}`]
        if (c.diagnosisRemark) lines.push(`  Diagnosis: ${c.diagnosisRemark}`)
        const cServices = (c.serviceIds ?? []).map((sid) => catalogServices.find((s) => s.id === sid)).filter(Boolean)
        if (cServices.length > 0) {
          lines.push(`  Services: ${cServices.map((s) => s ? `${s.code} (${fmtBDT(s.price)})` : '').join(', ')}`)
        }
        const cParts = allParts.filter((pr) => pr.concernItemId === c.id)
        if (cParts.length > 0) {
          lines.push(`  Parts: ${cParts.map((pr) => `${pr.partName} x${pr.quantity ?? 1}${typeof pr.price === 'number' ? ` (${fmtBDT(pr.price)})` : ''}${pr.deliveryDate ? ` ETA: ${pr.deliveryDate}` : ''}`).join(', ')}`)
        }
        return lines.join('\n')
      }).join('\n\n')
      const globalServices = (appt!.serviceItems ?? []).map((s) => `• ${s.serviceDescription} — ${fmtBDT(s.price)}`).join('\n')
      const partsTotal = allParts.filter((pr) => typeof pr.price === 'number').reduce((sum, pr) => sum + (pr.price! * (pr.quantity ?? 1)), 0)
      const serviceTotal = (appt!.serviceItems ?? []).reduce((sum, s) => sum + s.price, 0)
      const grandTotal = serviceTotal + partsTotal
      setWaMessage(`Dear ${name},\n\nVehicle: ${reg}\n\nDiagnosis Report:\n${concernBlock}\n\nAll Services:\n${globalServices}\n\nServices Total: ${fmtBDT(serviceTotal)}${partsTotal > 0 ? `\nParts Total: ${fmtBDT(partsTotal)}` : ''}\nGrand Total: ${fmtBDT(grandTotal)}\n\nPlease confirm to proceed.`)
    } else if (waDialogPurpose === 'payment') {
      const allParts = partRequests.filter((pr) => pr.appointmentId === appt!.id)
      const serviceList = (appt!.serviceItems ?? []).map((s) => `• ${s.serviceDescription} — ${fmtBDT(s.price)}`).join('\n')
      const partsTotal = allParts.filter((pr) => typeof pr.price === 'number').reduce((sum, pr) => sum + (pr.price! * (pr.quantity ?? 1)), 0)
      const serviceTotal = (appt!.serviceItems ?? []).reduce((sum, s) => sum + s.price, 0)
      const grandTotal = serviceTotal + partsTotal
      let partBlock = ''
      if (allParts.length > 0) {
        partBlock = `\n\nParts Used:\n${allParts.map((pr) => `• ${pr.partName} x${pr.quantity ?? 1}${typeof pr.price === 'number' ? ` — ${fmtBDT(pr.price * (pr.quantity ?? 1))}` : ''}`).join('\n')}`
      }
      setWaMessage(`Dear ${name},\n\nGreat news! Your vehicle ${reg} is ready for pickup.\n\nCompleted Services:\n${serviceList}${partBlock}\n\nServices: ${fmtBDT(serviceTotal)}${partsTotal > 0 ? `\nParts: ${fmtBDT(partsTotal)}` : ''}\nTotal Due: ${fmtBDT(grandTotal)}\n\nPickup Hours: 9:00 AM - 6:00 PM (Sat-Thu)\n\nPlease make payment at the cashier counter to collect your vehicle. We accept Cash, Card, and Mobile Banking.\n\nThank you for choosing Continental Workshop!`)
    }
    setWaDialogOpen(true)
  }

  function sendWhatsapp() {
    addWhatsappLog({
      appointmentId: appt!.id,
      direction: 'outbound',
      authorName: 'CRE',
      message: waMessage.trim(),
    })
    if (waDialogPurpose === 'concern-approval') {
      setAppointmentStatus(appt!.id, 'Customer Notified')
      pushTimeline(appt!.id, { actor: 'CRE', action: 'WhatsApp sent for concern/service approval' })
    } else if (waDialogPurpose === 'service-approval') {
      setAppointmentStatus(appt!.id, 'Service Approval Pending')
      pushTimeline(appt!.id, { actor: 'CRE', action: 'WhatsApp sent for service approval (post-diagnosis)' })
    } else if (waDialogPurpose === 'payment') {
      setAppointmentStatus(appt!.id, 'Payment Pending')
      pushTimeline(appt!.id, { actor: 'CRE', action: 'WhatsApp sent for payment' })
    }
    setWaDialogOpen(false)
    setWaMessage('')
  }

  function handleApproval(status: 'Approved' | 'Rejected') {
    setCustomerApproval({ appointmentId: appt!.id, status, note: approvalNote.trim() || undefined })
    if (status === 'Approved') {
      if (isCustomerNotified) {
        setAppointmentStatus(appt!.id, 'Customer Approved')
        pushTimeline(appt!.id, { actor: 'CRE', action: 'Customer approved concerns — ready for JC diagnosis assignment' })
      } else if (isServiceApprovalPending) {
        setAppointmentStatus(appt!.id, 'Service Approved')
        pushTimeline(appt!.id, { actor: 'CRE', action: 'Customer approved services — ready for JC service assignment' })
      }
    } else {
      setAppointmentStatus(appt!.id, 'Customer Rejected')
      pushTimeline(appt!.id, { actor: 'CRE', action: `Customer rejected${approvalNote.trim() ? `: ${approvalNote.trim()}` : ''}` })
    }
    setApprovalNote('')
  }

  return (
    <Box sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
      <Stack spacing={3.5}>
        {/* ── Page Header ── */}
        <Stack direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' }, gap: 2 }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <IconButton onClick={() => navigate('/cro/appointments')} sx={{ border: `1px solid ${colors.border.default}`, borderRadius: '10px' }}>
              <ArrowBack sx={{ fontSize: '1.1rem', color: colors.slate[600] }} />
            </IconButton>
            <Box>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.85rem' }, color: colors.slate[900], letterSpacing: '-0.02em' }}>
                  Appointment
                </Typography>
                <Typography sx={{ fontWeight: 600, fontSize: { xs: '1rem', md: '1.2rem' }, color: colors.slate[400], fontFamily: 'monospace' }}>
                  #{appt.id.slice(0, 8)}
                </Typography>
              </Stack>
              <Chip label={appt.status} color={statusColor(appt.status)} size="small" sx={{ fontWeight: 700, fontSize: '0.72rem', mt: 0.5 }} />
              {appt.status === 'Draft' && (
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Button size="small" variant="outlined" onClick={() => navigate(`/cre/appointments/new?appointmentId=${encodeURIComponent(appt.id)}`)} sx={{ fontWeight: 800, borderRadius: radii.sm }}>Edit Draft</Button>
                  <Button size="small" variant="contained" onClick={() => void setAppointmentStatus(appt.id, 'New')} sx={{ fontWeight: 800, borderRadius: radii.sm }}>Submit Appointment</Button>
                </Stack>
              )}
            </Box>
          </Stack>
        </Stack>

        {/* ── Workflow Timeline ── */}
        <WorkflowTimeline status={appt.status} timeline={appt.timeline} />

        {/* ── Vehicle & Customer Info (collapsible) ── */}
        <VehicleInfoBanner appointmentId={appt.id} />

        {/* ── Summary Stat Cards ── */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <StatCard
            icon={<DirectionsCar fontSize="small" />}
            title="VEHICLE"
            value={vehicle?.registrationNo ?? '—'}
            gradient="linear-gradient(135deg, #0F172A 0%, #1E293B 100%)"
            details={[{ label: 'Make / Model', value: [vehicle?.make, vehicle?.model].filter(Boolean).join(' ') || '—' }]}
          />
          <StatCard
            icon={<Person fontSize="small" />}
            title="CUSTOMER"
            value={customer?.fullName ?? '—'}
            gradient="linear-gradient(135deg, #1E293B 0%, #334155 100%)"
            details={[{ label: 'Phone', value: customer?.phone ?? '—' }]}
          />
          <StatCard
            icon={<Payment fontSize="small" />}
            title="TOTAL"
            value={fmtBDT(totalBDT)}
            gradient="linear-gradient(135deg, #065F46 0%, #059669 100%)"
            details={[
              { label: 'Created', value: fmtDate(appt.createdAt) },
              ...(appt.slotDate ? [{ label: 'Slot', value: `${fmtDate(appt.slotDate)} ${appt.slotTime ?? ''}` }] : []),
            ]}
          />
        </Stack>

        {/* ── Notes and feedbacks ── */}
        <SectionCard title="Notes and Feedbacks" icon={<ReportProblem sx={{ fontSize: '1rem' }} />}>
          <Stack spacing={2}>
            <Box>
              <Typography sx={{ fontWeight: 800, color: colors.slate[800], mb: 1 }}>Appointment Notes</Typography>
              <TextField value={noteText} onChange={(event) => setNoteText(event.target.value)} fullWidth multiline minRows={3}
                placeholder="Internal notes, follow-up instructions, or handover details"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: radii.sm, fontSize: '0.85rem' } }} />
              <Button size="small" variant="outlined" onClick={() => void saveAppointmentNotes()} sx={{ mt: 1, fontWeight: 700 }}>Save Notes</Button>
            </Box>
            {appt.concerns && <Typography sx={{ fontSize: '0.82rem', color: colors.slate[600] }}>Customer concern summary: {appt.concerns}</Typography>}

            <Box sx={{ pt: 1.5, borderTop: `1px solid ${colors.border.subtle}` }}>
              <Typography sx={{ fontWeight: 800, color: colors.slate[800], mb: 1 }}>Comments and Mentions</Typography>
              <Stack spacing={1}>
                <TextField value={commentText} onChange={(event) => setCommentText(event.target.value)} fullWidth multiline minRows={2}
                  label="Add a comment" placeholder="Pass an update to the appointment team"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: radii.sm, fontSize: '0.85rem' } }} />
                <TextField value={mentionText} onChange={(event) => setMentionText(event.target.value)} fullWidth size="small"
                  label="Tag users (emails or user IDs, comma-separated)" helperText="Mentioned users receive an in-app notification immediately."
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: radii.sm, fontSize: '0.82rem' } }} />
                <Button variant="contained" onClick={() => void submitAppointmentComment()} disabled={!commentText.trim()} sx={{ alignSelf: 'flex-start', fontWeight: 700, borderRadius: radii.sm }}>Post Comment</Button>
              </Stack>
              {appointmentComments.length === 0 ? <Typography sx={{ mt: 1.5, fontSize: '0.82rem', color: colors.slate[500] }}>No comments yet.</Typography> : (
                <Stack spacing={1} sx={{ mt: 1.5 }}>
                  {appointmentComments.map((comment) => <Box key={comment.id} sx={{ p: 1.25, bgcolor: colors.bg.page, borderRadius: radii.sm }}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1 }}><Typography sx={{ fontWeight: 700, fontSize: '0.78rem' }}>{comment.author}</Typography><Typography sx={{ color: colors.slate[500], fontSize: '0.72rem' }}>{fmtDateTime(comment.createdAt)}</Typography></Stack>
                    <Typography sx={{ mt: 0.4, fontSize: '0.84rem', whiteSpace: 'pre-wrap' }}>{comment.comment}</Typography>
                    {comment.mentions.length > 0 && <Typography sx={{ mt: 0.4, fontSize: '0.72rem', color: colors.status.info }}>Mentioned: {comment.mentions.join(', ')}</Typography>}
                  </Box>)}
                </Stack>
              )}
            </Box>

            <Box sx={{ pt: 1.5, borderTop: `1px solid ${colors.border.subtle}` }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 1 }}>
                <Box><Typography sx={{ fontWeight: 800, color: colors.slate[800] }}>Customer Feedback</Typography><Typography sx={{ fontSize: '0.78rem', color: colors.slate[500] }}>Record the feedback form repeatedly as the appointment progresses.</Typography></Box>
                <Button variant="outlined" onClick={() => setFeedbackFormOpen(true)} sx={{ fontWeight: 700, borderRadius: radii.sm }}>Add Feedback</Button>
              </Stack>
              {appointmentFeedback.length === 0 ? <Typography sx={{ mt: 1.5, fontSize: '0.82rem', color: colors.slate[500] }}>No feedback submitted.</Typography> : (
                <Stack spacing={1} sx={{ mt: 1.5 }}>
                  {appointmentFeedback.map((entry) => <Box key={entry.id} sx={{ p: 1.25, bgcolor: colors.bg.page, borderRadius: radii.sm }}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1 }}><Typography sx={{ fontWeight: 700, fontSize: '0.78rem' }}>{entry.feedbackSource} · {entry.customerName || 'Customer'}</Typography><Typography sx={{ color: colors.slate[500], fontSize: '0.72rem' }}>{fmtDateTime(entry.submittedAt)}</Typography></Stack>
                    <Typography sx={{ mt: 0.4, fontSize: '0.8rem' }}>Overall: {entry.overallRating ?? '—'} / 5 · Recommend: {entry.recommendation || '—'}</Typography>
                    {entry.comments && <Typography sx={{ mt: 0.4, fontSize: '0.82rem', whiteSpace: 'pre-wrap' }}>{entry.comments}</Typography>}
                  </Box>)}
                </Stack>
              )}
            </Box>
          </Stack>
        </SectionCard>

        {/* ── Service Advisor Assignment ── */}
        {!appt.assignedSAUserId ? (
          <ActionCard borderColor={colors.status.warning}>
            <Typography sx={{ fontWeight: 800, mb: 1, color: colors.status.warning, fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              No Service Advisor Assigned
            </Typography>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <TextField select size="small" label="Assign Service Advisor" value={selectedSAUserId}
                onChange={(e) => setSelectedSAUserId(e.target.value)} sx={{ minWidth: 280, '& .MuiOutlinedInput-root': { borderRadius: radii.sm, fontSize: '0.85rem' } }}>
                <MenuItem value="">— Select SA —</MenuItem>
                {activeSAUsers.map((u) => <MenuItem key={u.id} value={u.id}>{u.fullName} {u.online ? '• Online' : '• Offline'}</MenuItem>)}
              </TextField>
              <Button variant="contained" disabled={!selectedSAUserId}
                onClick={() => { assignSA(appt.id, selectedSAUserId); setSelectedSAUserId('') }}
                sx={{ bgcolor: colors.status.warning, fontWeight: 600, borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: '#d97706' } }}>
                Assign SA
              </Button>
            </Stack>
          </ActionCard>
        ) : (
          <SectionCard title="Service Advisor" icon={<Person sx={{ fontSize: '1rem' }} />}>
            <InfoRow label="Assigned SA" value={<strong>{assignedSA?.fullName ?? appt.assignedSAUserId}</strong>} />
          </SectionCard>
        )}

        {/* ── Concerns ── */}
        <SectionCard title="Concerns" icon={<ReportProblem sx={{ fontSize: '1rem' }} />} defaultCollapsed
          actions={
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <RequestMasterDataButton targetDoctype="CW Concern" targetField="Concern" compact context={{ appointmentId: appt.id }} />
              <Box sx={{ bgcolor: colors.slate[100], borderRadius: radii.full, px: 1.2, py: 0.15, fontSize: '0.72rem', fontWeight: 700, color: colors.slate[600] }}>
                {(appt.concernItems ?? []).length}
              </Box>
            </Stack>
          }>
          {(appt.concernItems ?? []).length === 0 ? (
            <Typography sx={{ fontSize: '0.85rem', color: colors.slate[500] }}>No concerns listed.</Typography>
          ) : (
            <Stack spacing={2}>
              {(appt.concernItems ?? []).map((c) => {
                const concernServices = (c.serviceIds ?? []).map((sid) => catalogServices.find((s) => s.id === sid)).filter(Boolean)
                const concernParts = partRequests.filter((pr) => pr.appointmentId === appointmentId && pr.concernItemId === c.id)
                const shopName = getConcernShopName(c.concernId)
                return (
                  <Box key={c.id} sx={{
                    p: 2, bgcolor: colors.bg.page, borderRadius: radii.md,
                    border: `1px solid ${c.workStatus === 'Completed' ? colors.status.success : colors.border.default}`,
                  }}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Typography sx={{ fontWeight: 800, fontSize: '0.88rem', color: colors.slate[900] }}>
                        {c.concernName}
                        {c.isDraft && <Chip size="small" label="Pending admin approval" color="warning" sx={{ ml: 1, fontSize: '0.68rem', fontWeight: 700 }} />}
                        {typeof c.processTimeMins === 'number' && (
                          <Typography component="span" sx={{ ml: 1, px: 1, py: 0.25, bgcolor: colors.status.info, color: 'white', borderRadius: radii.sm, fontWeight: 700, fontSize: '0.7rem' }}>
                            {c.processTimeMins}m
                          </Typography>
                        )}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        {shopName && <Chip size="small" label={shopName} color="secondary" variant="outlined" sx={{ fontWeight: 700, fontSize: '0.72rem' }} />}
                        {c.assignedSEUserId && <Chip size="small" label={userNameById.get(c.assignedSEUserId) ?? '—'} variant="outlined" sx={{ fontSize: '0.72rem' }} />}
                        {c.bayId && <Chip size="small" label={bayNameById.get(c.bayId) ?? '—'} variant="outlined" sx={{ fontSize: '0.72rem' }} />}
                        {c.workStatus ? (
                          <Chip label={c.workStatus} size="small" color={c.workStatus === 'Completed' ? 'success' : c.workStatus === 'In Progress' ? 'primary' : 'warning'} sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
                        ) : null}
                      </Stack>
                    </Stack>
                    {c.remark && <Typography sx={{ fontSize: '0.82rem', color: colors.slate[500] }}>{c.remark}</Typography>}
                    {c.diagnosisRemark && (
                      <Typography sx={{ mt: 0.5, fontSize: '0.82rem', color: colors.slate[700] }}>
                        <strong>SE Diagnosis:</strong> {c.diagnosisRemark}
                      </Typography>
                    )}
                    {c.plannedStartAt && (
                      <Typography sx={{ fontSize: '0.75rem', color: colors.slate[400] }}>
                        {fmtDateTime(c.plannedStartAt)} → {fmtDateTime(c.plannedEndAt)}
                      </Typography>
                    )}
                    {(c.technicianAssignments ?? []).length > 0 && (
                      <Typography sx={{ display: 'block', mt: 0.5, fontSize: '0.75rem', color: colors.slate[400] }}>
                        Technicians: {(c.technicianAssignments ?? []).map((ta) => userNameById.get(ta.technicianUserId)).filter(Boolean).join(', ')}
                      </Typography>
                    )}

                    {/* Services linked to this concern */}
                    {concernServices.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography sx={{ fontWeight: 700, color: colors.status.info, fontSize: '0.75rem' }}>Services:</Typography>
                        <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                          {concernServices.map((svc) => svc && (
                            <Chip key={svc.id} size="small" label={`${svc.code} · ${svc.description} · ${fmtBDT(svc.price)}`} color="info" variant="outlined" sx={{ fontSize: '0.72rem' }} />
                          ))}
                        </Stack>
                      </Box>
                    )}

                    {/* Parts for this concern */}
                    {concernParts.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography sx={{ fontWeight: 700, color: colors.accent.purple, fontSize: '0.75rem' }}>Parts:</Typography>
                        <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                          {concernParts.map((pr) => (
                            <Stack key={pr.id} direction="row" sx={{
                              justifyContent: 'space-between', alignItems: 'center', px: 1.5, py: 0.75,
                              bgcolor: colors.bg.card, borderRadius: radii.sm, border: `1px solid ${colors.border.default}`,
                            }}>
                              <Box>
                                <Typography sx={{ fontWeight: 600, fontSize: '0.82rem', color: colors.slate[900] }}>{pr.partName}</Typography>
                                <Typography sx={{ fontSize: '0.72rem', color: colors.slate[500] }}>
                                  Qty: {pr.quantity ?? 1}{pr.partNumber ? ` · #${pr.partNumber}` : ''}
                                  {typeof pr.price === 'number' ? ` · ${fmtBDT(pr.price)}` : ''}
                                  {pr.deliveryDate ? ` · ETA: ${pr.deliveryDate}` : ''}
                                </Typography>
                              </Box>
                              <Chip size="small" label={pr.status} sx={{ fontWeight: 700, fontSize: '0.72rem' }}
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
        </SectionCard>

        {false && <>
        {/* ── Services ── */}
        <SectionCard title={'Services (' + (appt?.serviceItems ?? []).length + ')'} icon={<Build sx={{ fontSize: '1rem' }} />} defaultCollapsed>
          {(appt?.serviceItems ?? []).length === 0 ? (
            <Box sx={{ px: 3, py: 2 }}>
              <Typography sx={{ fontSize: '0.85rem', color: colors.slate[500] }}>No services listed.</Typography>
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& .MuiTableCell-head': headerCellSx }}>
                  <TableCell>Service</TableCell>
                  <TableCell>Shop</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>SA</TableCell>
                  <TableCell>Bay</TableCell>
                  <TableCell>Technicians</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(appt?.serviceItems ?? []).map((s) => {
                  const svcShopName = getServiceShopName(s.serviceId)
                  return (
                  <TableRow key={s.id} sx={{ '& .MuiTableCell-body': bodyCellSx }}>
                    <TableCell>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: colors.slate[900] }}>{s.serviceDescription}</Typography>
                      <Typography sx={{ fontSize: '0.72rem', color: colors.slate[400] }}>{s.serviceCode}</Typography>
                    </TableCell>
                    <TableCell>
                      {svcShopName ? <Chip size="small" label={svcShopName} color="secondary" variant="outlined" sx={{ fontWeight: 700, fontSize: '0.72rem' }} /> : '—'}
                    </TableCell>
                    <TableCell><Typography sx={{ fontSize: '0.82rem', color: colors.slate[700] }}>{fmtBDT(s.price)}</Typography></TableCell>
                    <TableCell><Typography sx={{ fontSize: '0.82rem', color: colors.slate[700] }}>{s.assignedSEUserId ? (userNameById.get(s.assignedSEUserId) ?? '—') : '—'}</Typography></TableCell>
                    <TableCell><Typography sx={{ fontSize: '0.82rem', color: colors.slate[700] }}>{s.bayId ? (bayNameById.get(s.bayId) ?? '—') : '—'}</Typography></TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.82rem', color: colors.slate[700] }}>
                        {s.technicianAssignments.map((ta) => userNameById.get(ta.technicianUserId)).filter(Boolean).join(', ') || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {s.workStatus ? (
                        <Chip
                          label={s.workStatus}
                          size="small"
                          color={s.workStatus === 'Completed' ? 'success' : s.workStatus === 'In Progress' ? 'primary' : 'warning'}
                          sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                        />
                      ) : '—'}
                    </TableCell>
                  </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </SectionCard>
        </>}

        {/* ── WhatsApp: Concern Approval (1st round) ── */}
        {canSendConcernWA && (
          <ActionCard borderColor={colors.status.info}>
            <Typography sx={{ fontWeight: 800, mb: 1, color: colors.status.info, fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              Send WhatsApp for Customer Approval
            </Typography>
            <Typography sx={{ fontSize: '0.82rem', color: colors.slate[500], mb: 1.5 }}>
              Review complete. Send concerns and services to customer for approval.
            </Typography>
            <Button variant="contained" startIcon={<Send />}
              onClick={() => openWhatsApp('concern-approval')}
              sx={{ bgcolor: colors.status.success, fontWeight: 600, borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: '#059669' } }}>
              Compose WhatsApp
            </Button>
          </ActionCard>
        )}

        {/* ── WhatsApp: Service Approval (2nd round, after diagnosis) ── */}
        {canSendServiceWA && (
          <ActionCard borderColor={colors.status.warning}>
            <Typography sx={{ fontWeight: 800, mb: 1, color: colors.status.warning, fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              Diagnosis Complete — Send Service Approval
            </Typography>
            <Typography sx={{ fontSize: '0.82rem', color: colors.slate[500], mb: 1.5 }}>
              SE completed diagnosis and may have added services. Send updated list to customer.
            </Typography>
            <Button variant="contained" startIcon={<Send />}
              onClick={() => openWhatsApp('service-approval')}
              sx={{ bgcolor: colors.status.success, fontWeight: 600, borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: '#059669' } }}>
              Compose WhatsApp (Services)
            </Button>
          </ActionCard>
        )}

        {/* ── Customer Approval (both rounds) ── */}
        {canApprove && (
          <ActionCard borderColor={colors.status.success}>
            <Typography sx={{ fontWeight: 800, mb: 1.5, color: colors.status.success, fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              {isCustomerNotified ? 'Record Customer Approval (Concerns)' : 'Record Customer Approval (Services)'}
            </Typography>
            <TextField label="Customer Note (optional)" value={approvalNote}
              onChange={(e) => setApprovalNote(e.target.value)} fullWidth multiline minRows={2}
              sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { borderRadius: radii.sm, fontSize: '0.85rem' } }} />
            <Stack direction="row" spacing={1.5}>
              <Button variant="contained" onClick={() => handleApproval('Approved')}
                sx={{ bgcolor: colors.status.success, fontWeight: 600, borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: '#059669' } }}>
                Approve
              </Button>
              <Button variant="outlined" color="error" onClick={() => handleApproval('Rejected')}
                sx={{ fontWeight: 600, borderRadius: '10px', px: 2.5 }}>
                Reject
              </Button>
            </Stack>
          </ActionCard>
        )}

        {/* ── Assign QC ── */}
        {canAssignQC && (
          <ActionCard borderColor={colors.status.info}>
            <Typography sx={{ fontWeight: 800, mb: 1, color: colors.status.info, fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              Services Complete — Assign QC
            </Typography>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <TextField select size="small" label="QC Inspector" value={selectedQCUserId}
                onChange={(e) => setSelectedQCUserId(e.target.value)}
                sx={{ minWidth: 250, '& .MuiOutlinedInput-root': { borderRadius: radii.sm, fontSize: '0.85rem' } }}>
                <MenuItem value="">— Select QC —</MenuItem>
                {activeQCUsers.map((u) => <MenuItem key={u.id} value={u.id}>{u.fullName} {u.online ? '• Online' : '• Offline'}</MenuItem>)}
              </TextField>
              <Button variant="contained" disabled={!selectedQCUserId}
                onClick={() => { assignQC({ appointmentId: appt.id, qcUserId: selectedQCUserId }); setSelectedQCUserId('') }}
                sx={{ bgcolor: colors.status.info, fontWeight: 600, borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: '#2563eb' } }}>
                Assign QC
              </Button>
            </Stack>
          </ActionCard>
        )}

        {/* ── WhatsApp: Payment ── */}
        {canSendPaymentWA && (
          <ActionCard borderColor={colors.status.warning}>
            <Typography sx={{ fontWeight: 800, mb: 1, color: colors.status.warning, fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              QC Approved — Send Payment Request
            </Typography>
            <Button variant="contained" startIcon={<Send />}
              onClick={() => openWhatsApp('payment')}
              sx={{ bgcolor: colors.status.success, fontWeight: 600, borderRadius: '10px', px: 2.5, '&:hover': { bgcolor: '#059669' } }}>
              Compose WhatsApp (Payment)
            </Button>
          </ActionCard>
        )}

        {/* ── Confirm Payment ── */}
        {canConfirmPayment && (
          <ActionCard borderColor={colors.status.success}>
            <Typography sx={{ fontWeight: 800, mb: 1, color: colors.status.success, fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              Confirm Payment Received
            </Typography>
            <Button variant="contained" size="large"
              onClick={() => confirmPayment({ appointmentId: appt.id, actorName: 'CRE' })}
              sx={{ bgcolor: colors.status.success, fontWeight: 800, borderRadius: '10px', px: 3, '&:hover': { bgcolor: '#059669' } }}>
              Payment Received — Issue Gate Pass
            </Button>
          </ActionCard>
        )}

        {/* ── WhatsApp Log ── */}
        <WhatsAppHistory
          logs={appt.whatsappLogs}
          onReply={(log) => {
            setWaDialogPurpose('reply')
            setWaMessage(`Regarding your message:\n“${log.message}”\n\n`)
            setWaDialogOpen(true)
          }}
        />

        {/* ── Customer Approval Status ── */}
        {appt.customerApprovalStatus !== 'Pending' && (
          <SectionCard title="Customer Approval" icon={<Verified sx={{ fontSize: '1rem' }} />}>
            <Stack spacing={1.5} sx={{ py: 0.5 }}>
              <Chip
                label={appt.customerApprovalStatus}
                color={appt.customerApprovalStatus === 'Approved' ? 'success' : 'error'}
                sx={{ fontWeight: 700, fontSize: '0.72rem', alignSelf: 'flex-start' }}
              />
              {appt.customerApprovalNote && (
                <Typography sx={{ fontSize: '0.85rem', color: colors.slate[700] }}>Note: {appt.customerApprovalNote}</Typography>
              )}
            </Stack>
          </SectionCard>
        )}
      </Stack>

      <Dialog open={feedbackFormOpen} onClose={() => setFeedbackFormOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Customer Feedback Form</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField label="Customer name" value={feedbackForm.customerName || customer?.fullName || ''} onChange={(e) => setFeedbackForm((f) => ({ ...f, customerName: e.target.value }))} fullWidth />
              <TextField label="Service no." value={feedbackForm.serviceNo} onChange={(e) => setFeedbackForm((f) => ({ ...f, serviceNo: e.target.value }))} fullWidth />
            </Stack>
            <Typography sx={{ fontWeight: 800, fontSize: '0.85rem', color: colors.slate[700] }}>Please rate each area (1 = poor, 5 = excellent)</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ flexWrap: 'wrap' }} useFlexGap>
              {([
                ['overallRating', 'Overall experience'], ['serviceAdvisorRating', 'Service advisor'], ['serviceQualityRating', 'Service quality'],
                ['deliveryTimeRating', 'Delivery time'], ['vehicleConditionRating', 'Vehicle condition'], ['facilityRating', 'Facility'],
              ] as const).map(([key, label]) => <TextField key={key} select label={label} value={feedbackForm[key]} onChange={(e) => setFeedbackForm((f) => ({ ...f, [key]: e.target.value }))} sx={{ minWidth: { xs: '100%', sm: 190 } }}>
                <MenuItem value="">Not rated</MenuItem>{[1, 2, 3, 4, 5].map((value) => <MenuItem key={value} value={String(value)}>{value} / 5</MenuItem>)}
              </TextField>)}
            </Stack>
            <TextField select label="Would you recommend us?" value={feedbackForm.recommendation} onChange={(e) => setFeedbackForm((f) => ({ ...f, recommendation: e.target.value }))}>
              <MenuItem value="">Not answered</MenuItem><MenuItem value="Yes">Yes</MenuItem><MenuItem value="No">No</MenuItem><MenuItem value="Maybe">Maybe</MenuItem>
            </TextField>
            <TextField label="Comments / suggestions" value={feedbackForm.comments} onChange={(e) => setFeedbackForm((f) => ({ ...f, comments: e.target.value }))} fullWidth multiline minRows={4} />
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setFeedbackFormOpen(false)}>Cancel</Button><Button variant="contained" onClick={() => void submitAppointmentFeedback()}>Save Feedback</Button></DialogActions>
      </Dialog>

      {/* WhatsApp Dialog */}
      <Dialog open={waDialogOpen} onClose={() => setWaDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Compose WhatsApp Message</DialogTitle>
        <DialogContent>
          <TextField value={waMessage} onChange={(e) => setWaMessage(e.target.value)}
            fullWidth multiline minRows={8} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWaDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="success" startIcon={<Send />} onClick={sendWhatsapp} disabled={!waMessage.trim()}>
            Send
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
