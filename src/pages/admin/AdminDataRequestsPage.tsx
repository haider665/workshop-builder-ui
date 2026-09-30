import { Assignment, CheckCircle, Close, Refresh } from '@mui/icons-material'
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select, Stack, TextField, Typography } from '@mui/material'
import { useCallback, useEffect, useState } from 'react'
import { workshopApi, type CWMasterDataRequest } from '../../services/workshopApi'
import { useToast } from '../../hooks/useToast'
import { SectionCard } from '../../components/SectionCard'
import { colors, pageLayout } from '../../theme/tokens'

export function AdminDataRequestsPage() {
  const toast = useToast()
  const [rows, setRows] = useState<CWMasterDataRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [review, setReview] = useState<{ row: CWMasterDataRequest; action: 'approve' | 'reject' | 'edit' } | null>(null)
  const [note, setNote] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [approvedValue, setApprovedValue] = useState('')
  const [fieldValuesJson, setFieldValuesJson] = useState('{}')
  const [fieldDefs, setFieldDefs] = useState<Array<{ fieldname: string; label: string; fieldtype: string; options?: string | null; choices?: string[]; required: boolean; default?: unknown }>>([])
  const [masterFieldValues, setMasterFieldValues] = useState<Record<string, unknown>>({})
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [search, setSearch] = useState('')
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [result, categoryResult] = await Promise.all([workshopApi.listMasterDataRequests({ status: 'Pending', search: search.trim() || undefined, pageSize: 100 }), workshopApi.listConcernCategories({ status: 'Active', pageSize: 100 })])
      setRows(result.data)
      setCategories(categoryResult.data.map((item) => ({ id: item.id, name: item.name })))
    }
    catch (error) { toast.error(error, 'Could not load master-data requests.') }
    finally { setLoading(false) }
  }, [toast, search])
  useEffect(() => { void load() }, [load])
  useEffect(() => {
    if (!review || review.action !== 'approve') { setFieldDefs([]); setMasterFieldValues({}); return }
    let cancelled = false
    void workshopApi.masterDataRequestFields(review.row.targetDoctype).then((result) => {
      if (cancelled) return
      setFieldDefs(result.data)
      const initial: Record<string, unknown> = {}
      for (const field of result.data) if (field.default !== undefined && field.default !== null) initial[field.fieldname] = field.default
      if (review.row.targetField) initial[review.row.targetField] = approvedValue || review.row.requestedValue
      if (review.row.targetDoctype === 'CW Service') {
        initial.service_code = `REQ-${review.row.id}`
        initial.description = approvedValue || review.row.requestedValue
        initial.category = 'General Service'
        initial.process_time_mins = 0
        initial.price = 0
        if (!initial.shop && result.data.find((field) => field.fieldname === 'shop')?.choices?.length) initial.shop = result.data.find((field) => field.fieldname === 'shop')?.choices?.[0]
      }
      if (review.row.targetDoctype === 'CW Concern') {
        initial.concern_code = `REQ-${review.row.id}`
        initial.concern_name = approvedValue || review.row.requestedValue
      }
      setMasterFieldValues(initial)
    }).catch(() => { if (!cancelled) setFieldDefs([]) })
    return () => { cancelled = true }
  }, [review])
  const submit = async () => {
    if (!review) return
    try {
      if (review.action === 'edit') {
        const result = await workshopApi.updateMasterDataRequest(review.row.id, { requestedValue: approvedValue.trim(), targetField: review.row.targetField })
        setRows((current) => current.map((row) => row.id === result.id ? result : row)); setReview(null); setApprovedValue(''); toast.success('Data request updated.')
        return
      }
      let fieldValues: Record<string, unknown> = {}
      if (review.action === 'approve' && fieldValuesJson.trim()) {
        try { fieldValues = JSON.parse(fieldValuesJson) as Record<string, unknown> } catch { toast.error('Use valid JSON for optional field values.'); return }
      }
      if (review.action === 'approve') fieldValues = { ...fieldValues, ...masterFieldValues }
      const result = review.action === 'approve' ? await workshopApi.approveMasterDataRequest(review.row.id, note, categoryId || undefined, approvedValue.trim() || undefined, fieldValues) : await workshopApi.rejectMasterDataRequest(review.row.id, note)
      setRows((current) => current.filter((row) => row.id !== result.id)); setReview(null); setNote(''); setCategoryId(''); setApprovedValue(''); setFieldValuesJson('{}')
      toast.success(review.action === 'approve' ? (review.row.targetDoctype === 'CW Concern' && review.row.context?.appointmentId ? 'Concern approved and added to the appointment.' : 'Request approved. Add the master record from its administration screen.') : (review.row.targetDoctype === 'CW Concern' && review.row.context?.appointmentId ? 'Concern rejected and removed from the appointment.' : 'Request rejected.'))
    } catch (error) { toast.error(error, 'Could not review the request.') }
  }
  return <Box sx={{ ...pageLayout, p: { xs: 2, md: 4 } }}>
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', gap: 2, mb: 3 }}>
      <Box><Typography variant="h4" sx={{ fontWeight: 800, color: colors.slate[900] }}>Data Requests</Typography><Typography color="text.secondary">Review requests for missing customers, vehicles, services, concerns, parts and other company masters.</Typography></Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ minWidth: { sm: 420 } }}><TextField size="small" fullWidth placeholder="Search request, appointment, customer, vehicle or requester" value={search} onChange={(event) => setSearch(event.target.value)} /><Button variant="outlined" startIcon={<Refresh />} onClick={() => void load()}>Refresh</Button></Stack>
    </Box>
    <Alert severity="info" sx={{ mb: 3 }}>Approval authorizes the request. Appointment-linked concerns appear as pending drafts immediately; approval activates them, while rejection removes them. Other requests can be completed from their administration screen.</Alert>
    <SectionCard title={`Pending requests (${rows.length})`} icon={<Assignment />}>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
      ) : rows.length === 0 ? (
        <Typography color="text.secondary">No pending requests.</Typography>
      ) : (
        <Stack spacing={1.5}>
          {rows.map((row) => (
            <Box key={row.id} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'center' }, justifyContent: 'space-between', gap: 2 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Chip size="small" label={row.targetDoctype} color="primary" variant="outlined" />
                    <Typography sx={{ fontWeight: 800 }}>{row.requestedValue}</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {row.targetField} · Requested by {row.requestedBy} · {row.company || 'Shared context'}
                  </Typography>
                  {row.sourceRoute && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Source: {row.sourceRoute}</Typography>}
                  {row.sourceDetails?.appointmentId && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Appointment: {row.sourceDetails.appointmentId} · Customer: {row.sourceDetails.customerName || row.sourceDetails.customerId || '—'} · Vehicle: {row.sourceDetails.registrationNo || row.sourceDetails.vehicleId || '—'}
                  </Typography>}
                  {Boolean(row.context?.requesterNote) && <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>Note: {String(row.context?.requesterNote)}</Typography>}
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                  <Button size="small" variant="contained" color="success" startIcon={<CheckCircle />} onClick={() => { setReview({ row, action: 'approve' }); setApprovedValue(row.requestedValue); setFieldValuesJson('{}'); setMasterFieldValues({}); setNote(''); setCategoryId('') }}>Approve</Button>
                  <Button size="small" variant="outlined" color="error" startIcon={<Close />} onClick={() => { setReview({ row, action: 'reject' }); setNote(''); setCategoryId('') }}>Reject</Button>
                </Box>
              </Box>
            </Box>
          ))}
        </Stack>
      )}
    </SectionCard>
    <Dialog open={Boolean(review)} onClose={() => setReview(null)} fullWidth maxWidth="sm"><DialogTitle>{review?.action === 'approve' ? 'Approve data request' : review?.action === 'edit' ? 'Edit data request' : 'Reject data request'}</DialogTitle><DialogContent><Typography sx={{ mb: 2 }}> {review?.row.targetDoctype} · {review?.row.requestedValue}</Typography>{review?.action === 'edit' ? <TextField fullWidth autoFocus label="Corrected requested value" value={approvedValue} onChange={(event) => setApprovedValue(event.target.value)} helperText="Save the correction, then approve it when ready." /> : review?.action === 'approve' ? <><TextField fullWidth label="Requested value" value={approvedValue} onChange={(event) => { setApprovedValue(event.target.value); setMasterFieldValues((current) => ({ ...current, [review.row.targetField]: event.target.value, ...(review.row.targetDoctype === 'CW Service' ? { description: event.target.value } : {}), ...(review.row.targetDoctype === 'CW Concern' ? { concern_name: event.target.value } : {}) })) }} helperText="You can correct the requested value before creating the master record." sx={{ mb: 2 }} />{review.row.targetDoctype === 'CW Concern' && <FormControl fullWidth sx={{ mb: 2 }}><InputLabel>Concern category</InputLabel><Select label="Concern category" value={categoryId} onChange={(event) => setCategoryId(String(event.target.value))}><MenuItem value=""><em>Keep pending category</em></MenuItem>{categories.map((category) => <MenuItem key={category.id} value={category.id}>{category.name}</MenuItem>)}</Select></FormControl>}<Stack spacing={1.5} sx={{ mb: 2 }}>{fieldDefs.filter((field) => !(review.row.targetDoctype === 'CW Concern' && field.fieldname === 'category')).map((field) => field.choices?.length ? <FormControl fullWidth size="small" key={field.fieldname} required={field.required}><InputLabel>{field.label}</InputLabel><Select label={field.label} value={String(masterFieldValues[field.fieldname] ?? '')} onChange={(event) => setMasterFieldValues((current) => ({ ...current, [field.fieldname]: event.target.value }))}>{field.choices.map((choice) => <MenuItem key={choice} value={choice}>{choice}</MenuItem>)}</Select></FormControl> : <TextField key={field.fieldname} fullWidth size="small" type={['Int', 'Float', 'Currency'].includes(field.fieldtype) ? 'number' : 'text'} label={field.label} required={field.required} value={String(masterFieldValues[field.fieldname] ?? '')} onChange={(event) => setMasterFieldValues((current) => ({ ...current, [field.fieldname]: event.target.value }))} helperText={field.required ? 'Required' : undefined} />)}</Stack><TextField fullWidth multiline minRows={2} label="Advanced field values (JSON)" value={fieldValuesJson} onChange={(event) => setFieldValuesJson(event.target.value)} helperText="Optional overrides for fields not shown above." sx={{ mb: 2 }} /></> : null}<TextField fullWidth multiline minRows={3} label="Review note" value={note} onChange={(event) => setNote(event.target.value)} /></DialogContent><DialogActions><Button onClick={() => setReview(null)}>Cancel</Button><Button variant="contained" color={review?.action === 'approve' ? 'success' : review?.action === 'edit' ? 'primary' : 'error'} onClick={() => void submit()}>{review?.action === 'approve' ? 'Approve request' : review?.action === 'edit' ? 'Save changes' : 'Reject request'}</Button></DialogActions></Dialog>
  </Box>
}
