import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Snackbar,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import { TaskAlt } from '@mui/icons-material'
import { useEffect, useState, useMemo } from 'react'
import { workshopApi } from '../../services/workshopApi'
import { useCompanyStore } from '../../store/companyStore'
import { colors, radii } from '../../theme/tokens'
import { tableSectionSx, headerCellSx, bodyCellSx, tableHeaderSx, tableHeaderIconSx, tableHeaderTitleSx } from '../../theme/tableStyles'
import type { CustomerApprovalStatus, LivePartRequest, MockCustomerApproval } from '../../types/procurementWorkflow'

const STATUS_TABS: { label: string; value: CustomerApprovalStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
]

const statusChipSx: Record<CustomerApprovalStatus, { bgcolor: string; color: string }> = {
  pending: { bgcolor: '#fef3c7', color: '#92400e' },
  approved: { bgcolor: '#d1fae5', color: '#047857' },
  rejected: { bgcolor: '#fee2e2', color: '#b91c1c' },
}

export function MockCustomerApprovalPage() {
  const selectedCompanyId = useCompanyStore((s) => s.selectedCompanyId)
  const [approvals, setApprovals] = useState<MockCustomerApproval[]>([])
  const [tab, setTab] = useState<CustomerApprovalStatus | 'all'>('all')
  const [snack, setSnack] = useState<string | null>(null)
  const [snackError, setSnackError] = useState(false)
  const [rejectDialog, setRejectDialog] = useState<MockCustomerApproval | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!selectedCompanyId) return
    let cancelled = false
    void workshopApi.listPartRequests({ page: 1, pageSize: 100 }).then(async (response) => {
      if (cancelled) return
      const rows = (response.data as LivePartRequest[]).filter(
        (row) => row.triageCompleted && (row.disposition === 'local_vendor' || row.disposition === 'foreign_vendor'),
      )
      const appointmentIds = [...new Set(rows.map((row) => row.appointmentId))]
      const contexts = new Map<string, { customerName: string; customerPhone: string; vehicleName: string }>()
      await Promise.all(appointmentIds.map(async (appointmentId) => {
        const appointment = await workshopApi.getAppointment(appointmentId).catch(() => null)
        const [customer, vehicle] = appointment
          ? await Promise.all([
              appointment.customerId ? workshopApi.getCustomer(appointment.customerId).catch(() => null) : Promise.resolve(null),
              appointment.vehicleId ? workshopApi.getVehicle(appointment.vehicleId).catch(() => null) : Promise.resolve(null),
            ])
          : [null, null]
        contexts.set(appointmentId, {
          customerName: customer?.fullName || 'Workshop customer',
          customerPhone: customer?.phone || '',
          vehicleName: vehicle ? [vehicle.registrationNo, vehicle.make, vehicle.model].filter(Boolean).join(' · ') : 'Appointment vehicle',
        })
      }))
      const mapped: MockCustomerApproval[] = rows.map((row) => {
        const context = contexts.get(row.appointmentId)
        const decision = row.customerDecision || row.customerApprovalStatus || 'pending'
        const status: CustomerApprovalStatus = decision.toLowerCase() === 'approved'
          ? 'approved'
          : decision.toLowerCase() === 'rejected'
            ? 'rejected'
            : 'pending'
        return {
          id: row.id,
          partRequestId: row.id,
          lineItemId: row.id,
          partName: row.partName,
          partNumber: row.partNumber,
          quantity: row.quantity ?? 1,
          customerName: context?.customerName || 'Workshop customer',
          customerPhone: context?.customerPhone || '',
          vehicleName: context?.vehicleName || 'Appointment vehicle',
          disposition: row.disposition as 'local_vendor' | 'foreign_vendor',
          estimatedPrice: row.localPrice,
          estimatedDeliveryDays: row.localDeliveryDays,
          vendorName: row.localVendorName,
          foreignNote: row.foreignNote,
          status,
          customerQuotationId: row.customerQuotationId,
          customerQuotationGrandTotal: row.customerQuotationGrandTotal,
          customerQuotationValidTill: row.customerQuotationValidTill,
          customerDecision: row.customerDecision,
          approvedAt: status === 'approved' ? row.customerApprovalDecidedAt : undefined,
          rejectedAt: status === 'rejected' ? row.customerApprovalDecidedAt : undefined,
          rejectionNote: row.customerApprovalNote,
          createdAt: row.createdAt,
        }
      })
      if (!cancelled) setApprovals(mapped)
    }).catch(() => {
      if (!cancelled) setApprovals([])
    })
    return () => { cancelled = true }
  }, [selectedCompanyId, refreshKey])

  const filtered = useMemo(
    () => (tab === 'all' ? approvals : approvals.filter((a) => a.status === tab)),
    [approvals, tab],
  )

  const handleApprove = async (approval: MockCustomerApproval) => {
    try {
      if (approval.customerQuotationId) {
        await workshopApi.setCustomerQuotationDecision(approval.customerQuotationId, 'Approved')
      } else {
        await workshopApi.setPartRequestCustomerApproval(approval.id, { status: 'Approved' })
      }
      setSnackError(false)
      setSnack(`Approved: ${approval.partName}`)
      setRefreshKey((key) => key + 1)
    } catch (error) {
      setSnackError(true)
      setSnack(error instanceof Error ? error.message : 'Could not approve part request')
    }
  }

  const handleRejectConfirm = async () => {
    if (!rejectDialog) return
    if (rejectDialog.customerQuotationId && !rejectNote.trim()) {
      setSnackError(true)
      setSnack('A rejection note is required for a customer quotation.')
      return
    }
    try {
      if (rejectDialog.customerQuotationId) {
        await workshopApi.setCustomerQuotationDecision(rejectDialog.customerQuotationId, 'Rejected', rejectNote.trim())
      } else {
        await workshopApi.setPartRequestCustomerApproval(rejectDialog.id, {
          status: 'Rejected',
          note: rejectNote.trim() || undefined,
        })
      }
      setSnackError(false)
      setSnack(`Rejected: ${rejectDialog.partName}`)
      setRefreshKey((key) => key + 1)
      setRejectDialog(null)
      setRejectNote('')
    } catch (error) {
      setSnackError(true)
      setSnack(error instanceof Error ? error.message : 'Could not reject part request')
    }
  }

  return (
    <Box sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
      <Stack spacing={3}>
        {/* Header */}
        <Box>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: { xs: '1.5rem', md: '1.85rem' },
              color: colors.slate[900],
              letterSpacing: '-0.02em',
            }}
          >
            Customer Approval
          </Typography>
          <Typography sx={{ color: colors.slate[500], fontSize: '0.85rem' }}>
            Customer confirms whether they want the parts procured
          </Typography>
        </Box>

        <Snackbar
          open={Boolean(snack)}
          onClose={() => setSnack(null)}
          autoHideDuration={3000}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert onClose={() => setSnack(null)} severity={snackError ? 'error' : 'success'} variant="filled" sx={{ width: '100%' }}>
            {snack}
          </Alert>
        </Snackbar>

        {/* Tabs */}
        <Tabs
          value={tab}
          onChange={(_, v: CustomerApprovalStatus | 'all') => setTab(v)}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.82rem',
              minHeight: 40,
            },
          }}
        >
          {STATUS_TABS.map((t) => {
            const count =
              t.value === 'all'
                ? approvals.length
                : approvals.filter((a) => a.status === t.value).length
            return <Tab key={t.value} value={t.value} label={`${t.label} (${count})`} />
          })}
        </Tabs>

        {/* Table */}
        <Box sx={tableSectionSx}>
          <Box sx={tableHeaderSx}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Box sx={tableHeaderIconSx}>
                <TaskAlt sx={{ fontSize: '1rem' }} />
              </Box>
              <Typography sx={tableHeaderTitleSx}>CUSTOMER APPROVALS</Typography>
              <Box
                sx={{
                  bgcolor: colors.slate[100],
                  borderRadius: radii.full,
                  px: 1.2,
                  py: 0.15,
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: colors.slate[600],
                }}
              >
                {filtered.length}
              </Box>
            </Stack>
          </Box>

          {filtered.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography sx={{ color: colors.slate[400], fontSize: '0.85rem' }}>
                No approvals in this category.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 900 }}>
                <TableHead>
                  <TableRow sx={{ '& .MuiTableCell-head': headerCellSx }}>
                    <TableCell>Part</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Vehicle</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Details</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((a) => {
                    return (
                      <TableRow key={a.id} sx={{ '& .MuiTableCell-body': bodyCellSx }}>
                        <TableCell>
                          <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: colors.slate[900] }}>
                            {a.partName}
                          </Typography>
                          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', mt: 0.25 }}>
                            <Typography sx={{ fontSize: '0.72rem', color: colors.slate[500] }}>
                              {a.partNumber ? `#${a.partNumber} · ` : ''}× {a.quantity}
                            </Typography>
                            {a.brand ? (
                              <Chip
                                size="small"
                                label={a.brand}
                                sx={{
                                  fontWeight: 600,
                                  fontSize: '0.68rem',
                                  height: 18,
                                  bgcolor: colors.slate[100],
                                  color: colors.slate[700],
                                  borderRadius: radii.sm,
                                }}
                              />
                            ) : null}
                          </Stack>
                          {a.alternatePartNumbers && a.alternatePartNumbers.length > 0 ? (
                            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mt: 0.5, flexWrap: 'wrap' }}>
                              <Typography sx={{ fontSize: '0.68rem', color: colors.slate[400] }}>
                                Alt:
                              </Typography>
                              {a.alternatePartNumbers.map((alt) => (
                                <Chip
                                  key={alt}
                                  size="small"
                                  label={alt}
                                  sx={{
                                    fontSize: '0.65rem',
                                    height: 18,
                                    bgcolor: colors.slate[100],
                                    color: colors.slate[600],
                                    borderRadius: radii.sm,
                                  }}
                                />
                              ))}
                            </Stack>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: '0.82rem', fontWeight: 600 }}>
                            {a.customerName}
                          </Typography>
                          <Typography sx={{ fontSize: '0.72rem', color: colors.slate[500] }}>
                            {a.customerPhone}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: '0.8rem', color: colors.slate[600] }}>
                            {a.vehicleName}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={a.disposition === 'local_vendor' ? 'Local' : 'Foreign'}
                            sx={{
                              fontWeight: 700,
                              fontSize: '0.68rem',
                              bgcolor: a.disposition === 'local_vendor' ? '#dbeafe' : '#ffedd5',
                              color: a.disposition === 'local_vendor' ? '#1d4ed8' : '#c2410c',
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          {a.disposition === 'local_vendor' ? (
                            <Box>
                              <Typography sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                                ৳{a.estimatedPrice?.toLocaleString() ?? '—'}
                              </Typography>
                              <Typography sx={{ fontSize: '0.7rem', color: colors.slate[500] }}>
                                {a.vendorName} · {a.estimatedDeliveryDays ?? '?'} days
                              </Typography>
                            </Box>
                          ) : (
                            <Typography
                              sx={{
                                fontSize: '0.78rem',
                                color: colors.slate[600],
                                fontStyle: 'italic',
                                maxWidth: 200,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {a.foreignNote ?? 'Foreign vendor needed'}
                            </Typography>
                          )}
                          {a.customerQuotationId ? (
                            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
                              <Chip size="small" label={a.customerQuotationId} sx={{ fontSize: '0.65rem', height: 18, fontWeight: 700, bgcolor: '#dbeafe', color: '#1d4ed8' }} />
                              <Typography sx={{ fontSize: '0.7rem', color: colors.slate[600], fontWeight: 700 }}>
                                ৳{(a.customerQuotationGrandTotal || 0).toLocaleString()}
                              </Typography>
                              <Button
                                size="small"
                                onClick={() => window.open(workshopApi.customerQuotationPrintUrl(a.customerQuotationId || ''), '_blank', 'noopener,noreferrer')}
                                sx={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'none', minWidth: 0, px: 0.75 }}
                              >
                                PDF
                              </Button>
                            </Stack>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                            sx={{
                              fontWeight: 700,
                              fontSize: '0.68rem',
                              ...statusChipSx[a.status],
                            }}
                          />
                          {a.status === 'approved' && a.approvedAt ? (
                            <Typography sx={{ fontSize: '0.65rem', color: colors.slate[400], mt: 0.25 }}>
                              {new Date(a.approvedAt).toLocaleDateString()}
                            </Typography>
                          ) : null}
                          {a.status === 'rejected' && a.rejectedAt ? (
                            <Typography sx={{ fontSize: '0.65rem', color: '#b91c1c', mt: 0.25 }}>
                              {a.rejectionNote || 'Rejected'} · {new Date(a.rejectedAt).toLocaleDateString()}
                            </Typography>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          {a.status === 'pending' ? (
                            <Stack direction="row" spacing={0.75}>
                              <Button
                                size="small"
                                variant="contained"
                                onClick={() => { void handleApprove(a) }}
                                sx={{
                                  bgcolor: '#059669',
                                  fontWeight: 700,
                                  fontSize: '0.72rem',
                                  textTransform: 'none',
                                  borderRadius: radii.sm,
                                  minWidth: 0,
                                  px: 1.5,
                                  '&:hover': { bgcolor: '#047857' },
                                }}
                              >
                                Approve
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                onClick={() => setRejectDialog(a)}
                                sx={{
                                  fontWeight: 700,
                                  fontSize: '0.72rem',
                                  textTransform: 'none',
                                  borderRadius: radii.sm,
                                  minWidth: 0,
                                  px: 1.5,
                                }}
                              >
                                Reject
                              </Button>
                            </Stack>
                          ) : a.status === 'approved' ? (
                            <Typography sx={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>
                              ✓ Customer approved
                            </Typography>
                          ) : (
                            <Typography sx={{ fontSize: '0.72rem', color: colors.slate[400] }}>
                              —
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Box>
          )}
        </Box>

        {/* Reject Dialog */}
        <Dialog
          open={Boolean(rejectDialog)}
          onClose={() => setRejectDialog(null)}
          fullWidth
          maxWidth="xs"
        >
          <DialogTitle sx={{ fontWeight: 800 }}>Reject — {rejectDialog?.partName}</DialogTitle>
          <DialogContent>
            <TextField
              label="Rejection reason (optional)"
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              multiline
              minRows={2}
              fullWidth
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRejectDialog(null)}>Cancel</Button>
            <Button variant="contained" color="error" onClick={() => { void handleRejectConfirm() }}>
              Reject
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    </Box>
  )
}
