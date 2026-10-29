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
import { useState, useMemo } from 'react'
import { useMockProcurementStore } from '../../store/mockProcurementStore'
import { colors, radii } from '../../theme/tokens'
import { tableSectionSx, headerCellSx, bodyCellSx, tableHeaderSx, tableHeaderIconSx, tableHeaderTitleSx } from '../../theme/tableStyles'
import type { CustomerApprovalStatus, MockCustomerApproval } from '../../types/procurementWorkflow'

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
  const approvals = useMockProcurementStore((s) => s.customerApprovals)
  const setStatus = useMockProcurementStore((s) => s.setCustomerApprovalStatus)
  const procurementCases = useMockProcurementStore((s) => s.procurementCases)

  const [tab, setTab] = useState<CustomerApprovalStatus | 'all'>('all')
  const [snack, setSnack] = useState<string | null>(null)
  const [rejectDialog, setRejectDialog] = useState<MockCustomerApproval | null>(null)
  const [rejectNote, setRejectNote] = useState('')

  const filtered = useMemo(
    () => (tab === 'all' ? approvals : approvals.filter((a) => a.status === tab)),
    [approvals, tab],
  )

  const handleApprove = (approval: MockCustomerApproval) => {
    setStatus(approval.id, 'approved')
    setSnack(`Approved: ${approval.partName} — procurement case created`)
  }

  const handleRejectConfirm = () => {
    if (!rejectDialog) return
    setStatus(rejectDialog.id, 'rejected', rejectNote.trim() || undefined)
    setSnack(`Rejected: ${rejectDialog.partName}`)
    setRejectDialog(null)
    setRejectNote('')
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
          <Alert onClose={() => setSnack(null)} severity="success" variant="filled" sx={{ width: '100%' }}>
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
                    const hasCase = procurementCases.some((c) => c.customerApprovalIds?.includes(a.id))
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
                                onClick={() => handleApprove(a)}
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
                          ) : a.status === 'approved' && hasCase ? (
                            <Typography sx={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>
                              ✓ Case created
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
            <Button variant="contained" color="error" onClick={handleRejectConfirm}>
              Reject
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    </Box>
  )
}
