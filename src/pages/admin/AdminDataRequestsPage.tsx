import { Assignment, CheckCircle, Close, Refresh, Send } from '@mui/icons-material'
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, Link, MenuItem, Select, Stack, Tab, Tabs, TextField, Typography } from '@mui/material'
import { useCallback, useEffect, useState } from 'react'
import { workshopApi, type CWMasterDataRequest } from '../../services/workshopApi'
import { useToast } from '../../hooks/useToast'
import { SectionCard } from '../../components/SectionCard'
import { colors, pageLayout } from '../../theme/tokens'

type RequestStatus = 'All' | 'Pending' | 'Accepted' | 'Accounts Review' | 'Approved' | 'Rejected'
type ReviewAction = 'approve' | 'reject' | 'edit' | 'accept' | 'requestAccounts'
type FieldDefinition = { fieldname: string; label: string; fieldtype: string; options?: string | null; choices?: string[]; required: boolean; default?: unknown }

function statusColor(status: string): 'default' | 'info' | 'warning' | 'success' | 'error' {
  if (status === 'Approved') return 'success'
  if (status === 'Rejected' || status === 'Cancelled') return 'error'
  if (status === 'Accepted') return 'info'
  if (status === 'Accounts Review') return 'warning'
  return 'default'
}

export function AdminDataRequestsPage() {
  const toast = useToast()
  const [rows, setRows] = useState<CWMasterDataRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [review, setReview] = useState<{ row: CWMasterDataRequest; action: ReviewAction } | null>(null)
  const [note, setNote] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [approvedValue, setApprovedValue] = useState('')
  const [fieldValuesJson, setFieldValuesJson] = useState('{}')
  const [fieldDefs, setFieldDefs] = useState<FieldDefinition[]>([])
  const [masterFieldValues, setMasterFieldValues] = useState<Record<string, unknown>>({})
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<RequestStatus>('Pending')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [result, categoryResult] = await Promise.all([
        workshopApi.listMasterDataRequests({ status: status === 'All' ? undefined : status, search: search.trim() || undefined, pageSize: 100 }),
        workshopApi.listConcernCategories({ status: 'Active', pageSize: 100 }),
      ])
      setRows(result.data)
      setCategories(categoryResult.data.map((item) => ({ id: item.id, name: item.name })))
    }
    catch (error) { toast.error(error, 'Could not load data requests.') }
    finally { setLoading(false) }
  }, [status, toast, search])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (!review || review.action !== 'approve' || review.row.requestType === 'Stock Entry') {
      setFieldDefs([])
      setMasterFieldValues({})
      return
    }
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
  }, [review, approvedValue])

  const openReview = (row: CWMasterDataRequest, action: ReviewAction) => {
    setReview({ row, action })
    setApprovedValue(row.requestedValue)
    setFieldValuesJson('{}')
    setMasterFieldValues({})
    setNote('')
    setCategoryId('')
  }

  const submit = async () => {
    if (!review) return
    const isStock = review.row.requestType === 'Stock Entry'
    try {
      let result: CWMasterDataRequest
      if (review.action === 'accept') result = await workshopApi.acceptMasterDataRequest(review.row.id, note.trim())
      else if (review.action === 'requestAccounts') result = await workshopApi.requestAccountsForMasterDataRequest(review.row.id, note.trim())
      else if (review.action === 'edit') result = await workshopApi.updateMasterDataRequest(review.row.id, { requestedValue: approvedValue.trim(), targetField: review.row.targetField })
      else if (review.action === 'reject') result = await workshopApi.rejectMasterDataRequest(review.row.id, note.trim())
      else if (isStock) result = await workshopApi.approveMasterDataRequest(review.row.id, note.trim())
      else {
        let fieldValues: Record<string, unknown> = {}
        if (fieldValuesJson.trim()) {
          try { fieldValues = JSON.parse(fieldValuesJson) as Record<string, unknown> } catch { toast.error('Use valid JSON for optional field values.'); return }
        }
        fieldValues = { ...fieldValues, ...masterFieldValues }
        result = await workshopApi.approveMasterDataRequest(review.row.id, note.trim(), categoryId || undefined, approvedValue.trim() || undefined, fieldValues)
      }
      setRows((current) => current.map((row) => row.id === result.id ? result : row))
      setReview(null)
      setNote('')
      setCategoryId('')
      setApprovedValue('')
      setFieldValuesJson('{}')
      if (review.action === 'accept') toast.success('Stock receipt accepted.')
      else if (review.action === 'requestAccounts') toast.success('Stock receipt sent to Accounts.')
      else if (review.action === 'approve' && isStock) toast.success('Stock receipt approved and posted to inventory.')
      else if (review.action === 'approve') toast.success(review.row.targetDoctype === 'CW Concern' && review.row.context?.appointmentId ? 'Concern approved and added to the appointment.' : 'Request approved. Add the master record from its administration screen.')
      else if (review.action === 'reject' && isStock) toast.success('Stock receipt rejected; the draft was discarded.')
      else if (review.action === 'reject') toast.success(review.row.targetDoctype === 'CW Concern' && review.row.context?.appointmentId ? 'Concern rejected and removed from the appointment.' : 'Request rejected.')
      else toast.success('Data request updated.')
    }
    catch (error) { toast.error(error, 'Could not update the request.') }
  }

  const reviewTitle = review?.action === 'accept' ? 'Accept stock receipt' : review?.action === 'requestAccounts' ? 'Request Accounts approval' : review?.action === 'approve' ? review.row.requestType === 'Stock Entry' ? 'Approve stock receipt' : 'Approve data request' : review?.action === 'edit' ? 'Edit data request' : 'Reject request'
  const isStockReview = review?.row.requestType === 'Stock Entry'

  return <Box sx={{ ...pageLayout, p: { xs: 2, md: 4 } }}>
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', gap: 2, mb: 3 }}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800, color: colors.slate[900] }}>Data Requests</Typography>
        <Typography color="text.secondary">Review master-data requests and stock receipts awaiting acceptance or Accounts approval.</Typography>
      </Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ minWidth: { sm: 420 } }}>
        <TextField size="small" fullWidth placeholder="Search request, item, warehouse or requester" value={search} onChange={(event) => setSearch(event.target.value)} />
        <Button variant="outlined" startIcon={<Refresh />} onClick={() => void load()}>Refresh</Button>
      </Stack>
    </Box>
    <Alert severity="info" sx={{ mb: 3 }}>
      Stock receipts remain drafts until a stock manager accepts them, the requester sends them to Accounts, and Accounts approves them. Approval posts the ERPNext Stock Entry and permanently changes inventory.
    </Alert>
    <SectionCard title={`${status === 'All' ? 'All' : status} requests (${rows.length})`} icon={<Assignment />}>
      <Tabs value={status} onChange={(_, value: RequestStatus) => setStatus(value)} variant="scrollable" allowScrollButtonsMobile sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab value="Pending" label="Pending" />
        <Tab value="Accepted" label="Accepted" />
        <Tab value="Accounts Review" label="Accounts Review" />
        <Tab value="Approved" label="Approved" />
        <Tab value="Rejected" label="Rejected" />
        <Tab value="All" label="All history" />
      </Tabs>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
      ) : rows.length === 0 ? (
        <Typography color="text.secondary">No requests in this view.</Typography>
      ) : (
        <Stack spacing={1.5}>
          {rows.map((row) => {
            const isStock = row.requestType === 'Stock Entry'
            const payload = row.stockPayload
            return <Box key={row.id} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'center' }, justifyContent: 'space-between', gap: 2 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Chip size="small" label={isStock ? 'Stock Receipt' : row.targetDoctype} color="primary" variant="outlined" />
                    <Chip size="small" label={row.status} color={statusColor(row.status)} />
                    <Typography sx={{ fontWeight: 800 }}>{row.requestedValue}</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {row.targetField} · Requested by {row.requestedBy} · {row.company || 'Shared context'}
                  </Typography>
                  {row.sourceRoute && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Source: {row.sourceRoute}</Typography>}
                  {isStock && payload && <Box sx={{ mt: 1 }}>
                    <Typography variant="body2">{payload.itemCode} · {payload.quantity} units · {payload.warehouseId}</Typography>
                    <Typography variant="body2" color="text.secondary">Reason: {payload.reason || '—'}</Typography>
                    <Typography variant="body2" color="text.secondary">Evidence: {Object.entries(payload.evidence || {}).map(([key, value]) => `${key} ${value}`).join(' · ') || 'None'}</Typography>
                    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
                      {(payload.attachments || []).map((attachment) => <Link key={attachment.id} href={attachment.fileUrl} target="_blank" rel="noreferrer" variant="caption">{attachment.fileName}</Link>)}
                    </Stack>
                  </Box>}
                  {row.sourceDetails?.appointmentId && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Appointment: {row.sourceDetails.appointmentId} · Customer: {row.sourceDetails.customerName || row.sourceDetails.customerId || '—'} · Vehicle: {row.sourceDetails.registrationNo || row.sourceDetails.vehicleId || '—'}
                  </Typography>}
                  {Boolean(row.context?.requesterNote) && <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>Note: {String(row.context?.requesterNote)}</Typography>}
                  {row.acceptedBy && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Accepted by {row.acceptedBy} · {row.acceptedAt ? new Date(row.acceptedAt).toLocaleString() : '—'} · {row.acceptNote || 'No note'}</Typography>}
                  {row.accountsRequestedBy && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Sent to Accounts by {row.accountsRequestedBy} · {row.accountsRequestedAt ? new Date(row.accountsRequestedAt).toLocaleString() : '—'} · {row.accountsRequestNote || 'No note'}</Typography>}
                  {row.reviewedBy && <Box sx={{ mt: 1, p: 1.25, bgcolor: row.status === 'Approved' ? 'success.50' : 'error.50', borderRadius: 1.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{row.status} by {row.reviewedBy} · {row.reviewedAt ? new Date(row.reviewedAt).toLocaleString() : '—'}</Typography>
                    <Typography variant="body2" color="text.secondary">Reason / review note: {row.reviewNote || 'No reason recorded.'}</Typography>
                  </Box>}
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                  {isStock && row.status === 'Pending' && <>
                    <Button size="small" variant="contained" color="success" startIcon={<CheckCircle />} onClick={() => openReview(row, 'accept')}>Accept</Button>
                    <Button size="small" variant="outlined" color="error" startIcon={<Close />} onClick={() => openReview(row, 'reject')}>Reject</Button>
                  </>}
                  {isStock && row.status === 'Accepted' && <>
                    <Button size="small" variant="contained" startIcon={<Send />} onClick={() => openReview(row, 'requestAccounts')}>Request Accounts</Button>
                    <Button size="small" variant="outlined" color="error" startIcon={<Close />} onClick={() => openReview(row, 'reject')}>Reject</Button>
                  </>}
                  {isStock && row.status === 'Accounts Review' && <>
                    <Button size="small" variant="contained" color="success" startIcon={<CheckCircle />} onClick={() => openReview(row, 'approve')}>Approve</Button>
                    <Button size="small" variant="outlined" color="error" startIcon={<Close />} onClick={() => openReview(row, 'reject')}>Reject</Button>
                  </>}
                  {!isStock && row.status === 'Pending' && <>
                    <Button size="small" variant="contained" color="success" startIcon={<CheckCircle />} onClick={() => openReview(row, 'approve')}>Approve</Button>
                    <Button size="small" variant="outlined" color="error" startIcon={<Close />} onClick={() => openReview(row, 'reject')}>Reject</Button>
                  </>}
                </Box>
              </Box>
            </Box>
          })}
        </Stack>
      )}
    </SectionCard>
    <Dialog open={Boolean(review)} onClose={() => setReview(null)} fullWidth maxWidth="sm">
      <DialogTitle>{reviewTitle}</DialogTitle>
      <DialogContent>
        <Typography sx={{ mb: 2 }}>{review?.row.requestType === 'Stock Entry' ? 'Stock Receipt' : review?.row.targetDoctype} · {review?.row.requestedValue}</Typography>
        {isStockReview && review?.row.stockPayload && <Alert severity="warning" sx={{ mb: 2 }}>
          {review.action === 'approve' ? 'Approval posts this draft Stock Entry and permanently changes inventory.' : 'Stock will not be added until Accounts approves this request.'}
        </Alert>}
        {review?.action === 'edit' && <TextField fullWidth autoFocus label="Corrected requested value" value={approvedValue} onChange={(event) => setApprovedValue(event.target.value)} helperText="Save the correction, then approve it when ready." />}
        {review?.action === 'approve' && !isStockReview && <>
          <TextField fullWidth label="Requested value" value={approvedValue} onChange={(event) => { setApprovedValue(event.target.value); setMasterFieldValues((current) => ({ ...current, [review.row.targetField]: event.target.value, ...(review.row.targetDoctype === 'CW Service' ? { description: event.target.value } : {}), ...(review.row.targetDoctype === 'CW Concern' ? { concern_name: event.target.value } : {}) })) }} helperText="You can correct the requested value before creating the master record." sx={{ mb: 2 }} />
          {review.row.targetDoctype === 'CW Concern' && <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Concern category</InputLabel>
            <Select label="Concern category" value={categoryId} onChange={(event) => setCategoryId(String(event.target.value))}>
              <MenuItem value=""><em>Keep pending category</em></MenuItem>
              {categories.map((category) => <MenuItem key={category.id} value={category.id}>{category.name}</MenuItem>)}
            </Select>
          </FormControl>}
          <Stack spacing={1.5} sx={{ mb: 2 }}>
            {fieldDefs.filter((field) => !(review.row.targetDoctype === 'CW Concern' && field.fieldname === 'category')).map((field) => field.choices?.length ? (
              <FormControl fullWidth size="small" key={field.fieldname} required={field.required}>
                <InputLabel>{field.label}</InputLabel>
                <Select label={field.label} value={String(masterFieldValues[field.fieldname] ?? '')} onChange={(event) => setMasterFieldValues((current) => ({ ...current, [field.fieldname]: event.target.value }))}>
                  {field.choices.map((choice) => <MenuItem key={choice} value={choice}>{choice}</MenuItem>)}
                </Select>
              </FormControl>
            ) : (
              <TextField key={field.fieldname} fullWidth size="small" type={['Int', 'Float', 'Currency'].includes(field.fieldtype) ? 'number' : 'text'} label={field.label} required={field.required} value={String(masterFieldValues[field.fieldname] ?? '')} onChange={(event) => setMasterFieldValues((current) => ({ ...current, [field.fieldname]: event.target.value }))} helperText={field.required ? 'Required' : undefined} />
            ))}
          </Stack>
          <TextField fullWidth multiline minRows={2} label="Advanced field values (JSON)" value={fieldValuesJson} onChange={(event) => setFieldValuesJson(event.target.value)} helperText="Optional overrides for fields not shown above." sx={{ mb: 2 }} />
        </>}
        <TextField fullWidth multiline minRows={3} label={review?.action === 'accept' ? 'Accept note' : review?.action === 'requestAccounts' ? 'Note to Accounts' : 'Review note'} value={note} onChange={(event) => setNote(event.target.value)} />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setReview(null)}>Cancel</Button>
        <Button variant="contained" color={review?.action === 'approve' || review?.action === 'accept' ? 'success' : review?.action === 'edit' ? 'primary' : 'error'} onClick={() => void submit()}>
          {review?.action === 'accept' ? 'Accept stock receipt' : review?.action === 'requestAccounts' ? 'Send to Accounts' : review?.action === 'approve' ? 'Approve request' : review?.action === 'edit' ? 'Save changes' : 'Reject request'}
        </Button>
      </DialogActions>
    </Dialog>
  </Box>
}
