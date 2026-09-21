import { Assignment, CheckCircle, Close, Refresh } from '@mui/icons-material'
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material'
import { useCallback, useEffect, useState } from 'react'
import { workshopApi, type CWMasterDataRequest } from '../../services/workshopApi'
import { useToast } from '../../hooks/useToast'
import { SectionCard } from '../../components/SectionCard'
import { colors, pageLayout } from '../../theme/tokens'

export function AdminDataRequestsPage() {
  const toast = useToast()
  const [rows, setRows] = useState<CWMasterDataRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [review, setReview] = useState<{ row: CWMasterDataRequest; action: 'approve' | 'reject' } | null>(null)
  const [note, setNote] = useState('')
  const load = useCallback(async () => {
    setLoading(true)
    try { const result = await workshopApi.listMasterDataRequests({ status: 'Pending', pageSize: 100 }); setRows(result.data) }
    catch (error) { toast.error(error, 'Could not load master-data requests.') }
    finally { setLoading(false) }
  }, [toast])
  useEffect(() => { void load() }, [load])
  const submit = async () => {
    if (!review) return
    try {
      const result = review.action === 'approve' ? await workshopApi.approveMasterDataRequest(review.row.id, note) : await workshopApi.rejectMasterDataRequest(review.row.id, note)
      setRows((current) => current.filter((row) => row.id !== result.id)); setReview(null); setNote('')
      toast.success(review.action === 'approve' ? 'Request approved. Add the master record from its administration screen.' : 'Request rejected.')
    } catch (error) { toast.error(error, 'Could not review the request.') }
  }
  return <Box sx={{ ...pageLayout, p: { xs: 2, md: 4 } }}>
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', gap: 2, mb: 3 }}>
      <Box><Typography variant="h4" sx={{ fontWeight: 800, color: colors.slate[900] }}>Data Requests</Typography><Typography color="text.secondary">Review requests for missing customers, vehicles, services, concerns, parts and other company masters.</Typography></Box>
      <Button variant="outlined" startIcon={<Refresh />} onClick={() => void load()}>Refresh</Button>
    </Box>
    <Alert severity="info" sx={{ mb: 3 }}>Approval authorizes the request. Create the master record with the correct company, branch, price, accounting and operational details, then the requester can refresh the original form.</Alert>
    <SectionCard title={`Pending requests (${rows.length})`} icon={<Assignment />}>
      {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box> : rows.length === 0 ? <Typography color="text.secondary">No pending requests.</Typography> : <Stack spacing={1.5}>{rows.map((row) => <Box key={row.id} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}><Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'center' }, justifyContent: 'space-between', gap: 2 }}><Box><Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}><Chip size="small" label={row.targetDoctype} color="primary" variant="outlined" /><Typography sx={{ fontWeight: 800 }}>{row.requestedValue}</Typography></Box><Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>{row.targetField} · Requested by {row.requestedBy} · {row.company || 'Shared context'}</Typography>{row.sourceRoute && <Typography variant="caption" color="text.secondary">Source: {row.sourceRoute}</Typography>}</Box><Box sx={{ display: 'flex', gap: 1 }}><Button size="small" variant="contained" color="success" startIcon={<CheckCircle />} onClick={() => { setReview({ row, action: 'approve' }); setNote('') }}>Approve</Button><Button size="small" variant="outlined" color="error" startIcon={<Close />} onClick={() => { setReview({ row, action: 'reject' }); setNote('') }}>Reject</Button></Box></Box></Box>)}</Stack>}
    </SectionCard>
    <Dialog open={Boolean(review)} onClose={() => setReview(null)} fullWidth maxWidth="sm"><DialogTitle>{review?.action === 'approve' ? 'Approve data request' : 'Reject data request'}</DialogTitle><DialogContent><Typography sx={{ mb: 2 }}> {review?.row.targetDoctype} · {review?.row.requestedValue}</Typography><TextField fullWidth multiline minRows={3} label="Review note" value={note} onChange={(event) => setNote(event.target.value)} /></DialogContent><DialogActions><Button onClick={() => setReview(null)}>Cancel</Button><Button variant="contained" color={review?.action === 'approve' ? 'success' : 'error'} onClick={() => void submit()}>{review?.action === 'approve' ? 'Approve request' : 'Reject request'}</Button></DialogActions></Dialog>
  </Box>
}
