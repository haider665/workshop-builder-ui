import { Add, DeleteOutlined, Edit, Refresh, Search, Send } from '@mui/icons-material'
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, InputAdornment, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useBackendData } from '../../hooks/useCREData'
import { useToast } from '../../hooks/useToast'
import { workshopApi } from '../../services/workshopApi'
import { useCwStore } from '../../store/cwStore'
import { colors, radii, shadows } from '../../theme/tokens'

type OrderLine = { id?: string; type: string; description: string; quantity: number; rate: number; discountPercent: number; taxRate: number; amount?: number }
type ServiceOrder = { id: string; companyId: string; shopId: string; appointmentId: string; customerId: string; vehicleId: string; status: string; jobId?: string; jobIds?: string[]; salesInvoiceId?: string; currency: string; promisedCompletionAt?: string; subtotal: number; discountAmount: number; taxAmount: number; grandTotal: number; lines: OrderLine[]; updatedAt: string }
type Draft = { appointmentId: string; shopId: string; promisedCompletionAt: string; discountAmount: number; taxAmount: number; lines: OrderLine[] }
const blankLine = (): OrderLine => ({ type: 'Labour', description: '', quantity: 1, rate: 0, discountPercent: 0, taxRate: 0 })
const blankDraft = (): Draft => ({ appointmentId: '', shopId: '', promisedCompletionAt: '', discountAmount: 0, taxAmount: 0, lines: [blankLine()] })

export function ServiceOrdersPage() {
  useBackendData()
  const toast = useToast()
  const shops = useCwStore((state) => state.shops)
  const appointments = useCwStore((state) => state.appointments)
  const customers = useCwStore((state) => state.customers)
  const vehicles = useCwStore((state) => state.vehicles)
  const companyShops = useMemo(() => shops.filter((shop) => shop.status === 'Active' && shop.companyId), [shops])
  const companies = useMemo(() => [...new Set(companyShops.map((shop) => shop.companyId!))], [companyShops])
  const [company, setCompany] = useState('')
  const [shopId, setShopId] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<ServiceOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState<Draft>(blankDraft)
  const [editing, setEditing] = useState<ServiceOrder | null>(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (!company && companies[0]) setCompany(companies[0]) }, [companies, company])
  useEffect(() => { if (shopId && !companyShops.some((shop) => shop.id === shopId && shop.companyId === company)) setShopId('') }, [company, companyShops, shopId])

  const load = useCallback(async () => {
    if (!company) { setRows([]); return }
    setLoading(true); setError('')
    try { const result = await workshopApi.listServiceOrders({ company, shopId: shopId || undefined, status: status || undefined, pageSize: 100 }); setRows(result.data as ServiceOrder[]) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load Service Orders.') }
    finally { setLoading(false) }
  }, [company, shopId, status])
  useEffect(() => { void load() }, [load])

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return rows
    return rows.filter((row) => [row.id, row.appointmentId, row.customerId, row.vehicleId, row.status].join(' ').toLowerCase().includes(query))
  }, [rows, search])

  function seedLines(appointmentId: string) {
    const appointment = appointments.find((item) => item.id === appointmentId)
    const lines: OrderLine[] = [
      ...(appointment?.serviceItems ?? []).map((item) => ({ type: 'Labour', description: item.serviceDescription || item.serviceCode || 'Workshop service', quantity: 1, rate: Number(item.price || 0), discountPercent: 0, taxRate: 0 })),
      ...(appointment?.concernItems ?? []).filter((item) => item.concernName || item.remark).map((item) => ({ type: 'Labour', description: item.concernName || item.remark, quantity: 1, rate: 0, discountPercent: 0, taxRate: 0 })),
    ]
    setDraft((current) => ({ ...current, appointmentId, lines: lines.length ? lines : [blankLine()] }))
  }

  function beginCreate() { setEditing(null); setDraft({ ...blankDraft(), shopId: companyShops.find((shop) => shop.companyId === company)?.id || '' }); setOpen(true) }
  function beginEdit(row: ServiceOrder) { setEditing(row); setDraft({ appointmentId: row.appointmentId, shopId: row.shopId, promisedCompletionAt: row.promisedCompletionAt?.slice(0, 16) || '', discountAmount: row.discountAmount, taxAmount: row.taxAmount, lines: row.lines.map((line) => ({ ...line })) }); setOpen(true) }
  function patchLine(index: number, patch: Partial<OrderLine>) { setDraft((current) => ({ ...current, lines: current.lines.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line) })) }

  async function save() {
    if (!draft.appointmentId || !draft.shopId || !draft.lines.length || draft.lines.some((line) => !line.description.trim() || line.quantity <= 0)) { toast.warning('Select an appointment and workshop, then complete every Service Order line.'); return }
    setSaving(true)
    try {
      const payload = { ...draft, promisedCompletionAt: draft.promisedCompletionAt || undefined }
      if (editing) await workshopApi.updateServiceOrder(editing.id, payload)
      else await workshopApi.createServiceOrder(payload)
      toast.success(editing ? 'Service Order updated.' : 'Service Order created and linked to the appointment.')
      setOpen(false); await load()
    } catch (cause) { toast.error(cause, 'Unable to save Service Order.') }
    finally { setSaving(false) }
  }
  async function submit(row: ServiceOrder) { try { await workshopApi.submitServiceOrder(row.id); toast.success('Service Order sent for customer approval.'); await load() } catch (cause) { toast.error(cause, 'Unable to submit Service Order.') } }
  async function requestClearance(row: ServiceOrder, type: 'Invoice Review' | 'Payment Confirmation' | 'Final Release') { try { await workshopApi.requestFinancialClearance({ appointmentId: row.appointmentId, serviceOrderId: row.id, type, requestedAmount: row.grandTotal, outstandingAmount: row.grandTotal, note: `${type} requested from Workshop Management.`, idempotencyKey: `${row.id}:${type}` }); toast.success(`${type} sent to The Accountant.`) } catch (cause) { toast.error(cause, `Unable to request ${type.toLowerCase()}.`) } }
  async function decide(row: ServiceOrder, decision: 'Approved' | 'Rejected') { try { await workshopApi.decideServiceOrder(row.id, decision); toast.success('Service Order ' + decision.toLowerCase() + '.'); await load() } catch (cause) { toast.error(cause, 'Unable to record the customer decision.') } }
  async function generateJobs(row: ServiceOrder) { try { const result = await workshopApi.createServiceOrderJobScope(row.id); const created = Array.isArray(result.createdJobIds) ? result.createdJobIds.length : 0; toast.success(created ? 'Created ' + created + ' Job Card' + (created === 1 ? '' : 's') + '.' : 'Job Cards are already synchronized.'); await load() } catch (cause) { toast.error(cause, 'Unable to synchronize Job Cards.') } }

  return <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1480, mx: 'auto', minWidth: 0 }}><Stack spacing={3}>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}><Box><Typography variant="h4" sx={{ fontWeight: 850, color: colors.slate[900] }}>Service Orders</Typography><Typography sx={{ color: colors.slate[500] }}>Company-aware commercial scope connecting inspection, approved work, parts, jobs, invoicing and financial clearance.</Typography></Box><Stack direction="row" spacing={1}><Button variant="outlined" startIcon={<Refresh/>} onClick={() => void load()} disabled={loading}>Refresh</Button><Button variant="contained" startIcon={<Add/>} onClick={beginCreate} disabled={!companyShops.length}>New</Button></Stack></Stack>
    {!companyShops.length ? <Alert severity="warning">No active company-owned workshop is available. Link a workshop to a company in the main system first.</Alert> : null}
    {error ? <Alert severity="error" action={<Button onClick={() => void load()}>Retry</Button>}>{error}</Alert> : null}
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}><TextField select size="small" label="Company" value={company} onChange={(event) => setCompany(event.target.value)} sx={{ minWidth: { md: 240 } }}>{companies.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</TextField><TextField select size="small" label="Workshop" value={shopId} onChange={(event) => setShopId(event.target.value)} sx={{ minWidth: { md: 220 } }}><MenuItem value="">All workshops</MenuItem>{companyShops.filter((shop) => shop.companyId === company).map((shop) => <MenuItem key={shop.id} value={shop.id}>{shop.name}</MenuItem>)}</TextField><TextField select size="small" label="Status" value={status} onChange={(event) => setStatus(event.target.value)} sx={{ minWidth: { md: 210 } }}><MenuItem value="">All statuses</MenuItem>{['Draft','Customer Approval Pending','Approved','Customer Rejected','In Execution','Completed','Invoiced','Closed'].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</TextField><TextField fullWidth size="small" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search order, appointment, customer or vehicle" slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search/></InputAdornment> } }}/></Stack>
    <Stack spacing={1.5}>{visible.map((row) => { const customer = customers.find((item) => item.id === row.customerId); const vehicle = vehicles.find((item) => item.id === row.vehicleId); return <Box key={row.id} sx={{ p: { xs: 1.75, sm: 2.25 }, border: `1px solid ${colors.border.default}`, borderRadius: radii.lg, bgcolor: colors.bg.card, boxShadow: shadows.card, minWidth: 0 }}><Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { lg: 'center' } }}><Box sx={{ minWidth: 0 }}><Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}><Typography sx={{ fontWeight: 850 }}>{row.id}</Typography><Chip size="small" label={row.status}/></Stack><Typography sx={{ color: colors.slate[600] }}>{vehicle?.registrationNo || row.vehicleId} · {customer?.fullName || row.customerId}</Typography><Typography sx={{ color: colors.slate[500], fontSize: '.78rem', overflowWrap: 'anywhere' }}>Appointment {row.appointmentId} · {row.lines.length} line(s) · {row.jobIds?.length || 0} Job Card(s) · {row.currency} {row.grandTotal.toLocaleString()}</Typography></Box><Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>{['Draft','Estimate Prepared','Revision Required'].includes(row.status) ? <Button size="small" variant="outlined" startIcon={<Edit/>} onClick={() => beginEdit(row)}>Edit</Button> : null}{['Draft','Estimate Prepared','Revision Required'].includes(row.status) ? <Button size="small" variant="contained" startIcon={<Send/>} onClick={() => void submit(row)}>Submit</Button> : null}{row.status === "Customer Approval Pending" ? <><Button size="small" variant="contained" color="success" onClick={() => void decide(row, "Approved")}>Customer approved</Button><Button size="small" color="error" onClick={() => void decide(row, "Rejected")}>Customer rejected</Button></> : null}{["Approved","In Execution","Partially Completed","Completed"].includes(row.status) ? <Button size="small" variant="outlined" onClick={() => void generateJobs(row)}>Sync Job Cards</Button> : null}{["Partially Completed","Completed"].includes(row.status) && !row.salesInvoiceId ? <Button size="small" variant="outlined" onClick={() => void requestClearance(row, "Invoice Review")}>Invoice review</Button> : null}{row.salesInvoiceId ? <Button size="small" variant="outlined" onClick={() => void requestClearance(row, "Payment Confirmation")}>Payment confirmation</Button> : null}{["Invoiced","Completed"].includes(row.status) ? <Button size="small" variant="outlined" color="success" onClick={() => void requestClearance(row, "Final Release")}>Release clearance</Button> : null}</Stack></Stack></Box>})}{!loading && !visible.length ? <Box sx={{ textAlign: 'center', py: 8 }}><Typography sx={{ fontWeight: 800 }}>No Service Orders found</Typography><Typography sx={{ color: colors.slate[500] }}>Create one from an appointment to establish the controlled commercial scope.</Typography></Box> : null}</Stack>
  </Stack>
  <Dialog open={open} onClose={() => !saving && setOpen(false)} fullWidth maxWidth="md" fullScreen={false} slotProps={{ paper: { sx: { borderRadius: { xs: 0, sm: 3 }, m: { xs: 1, sm: 4 }, width: { xs: 'calc(100% - 16px)', sm: '100%' }, maxHeight: 'calc(100dvh - 16px)' } } }}><DialogTitle sx={{ fontWeight: 850 }}>{editing ? 'Edit Service Order' : 'Create Service Order'}</DialogTitle><DialogContent dividers><Stack spacing={2} sx={{ pt: .5 }}><Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField select fullWidth label="Workshop" required value={draft.shopId} onChange={(event) => setDraft((current) => ({ ...current, shopId: event.target.value }))}>{companyShops.filter((shop) => shop.companyId === company).map((shop) => <MenuItem key={shop.id} value={shop.id}>{shop.name}</MenuItem>)}</TextField><TextField select fullWidth label="Appointment" required disabled={Boolean(editing)} value={draft.appointmentId} onChange={(event) => seedLines(event.target.value)}>{appointments.map((appointment) => { const vehicle = vehicles.find((item) => item.id === appointment.vehicleId); return <MenuItem key={appointment.id} value={appointment.id}>{vehicle?.registrationNo || appointment.vehicleId} · {appointment.id}</MenuItem> })}</TextField></Stack><TextField type="datetime-local" label="Promised completion" value={draft.promisedCompletionAt} onChange={(event) => setDraft((current) => ({ ...current, promisedCompletionAt: event.target.value }))} slotProps={{ inputLabel: { shrink: true } }}/><Typography sx={{ fontWeight: 800 }}>Commercial lines</Typography>{draft.lines.map((line, index) => <Stack key={index} direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ p: 1.5, border: `1px solid ${colors.border.default}`, borderRadius: 2 }}><TextField select label="Type" value={line.type} onChange={(event) => patchLine(index, { type: event.target.value })} sx={{ minWidth: 130 }}><MenuItem value="Labour">Labour</MenuItem><MenuItem value="Part">Part</MenuItem><MenuItem value="Sublet">Sublet</MenuItem><MenuItem value="Charge">Charge</MenuItem></TextField><TextField fullWidth label="Description" required value={line.description} onChange={(event) => patchLine(index, { description: event.target.value })}/><TextField label="Qty" type="number" value={line.quantity} onChange={(event) => patchLine(index, { quantity: Number(event.target.value) })} sx={{ width: { md: 95 } }}/><TextField label="Rate" type="number" value={line.rate} onChange={(event) => patchLine(index, { rate: Number(event.target.value) })} sx={{ width: { md: 130 } }}/><IconButton color="error" disabled={draft.lines.length === 1} onClick={() => setDraft((current) => ({ ...current, lines: current.lines.filter((_, lineIndex) => lineIndex !== index) }))}><DeleteOutlined/></IconButton></Stack>)}<Button variant="outlined" startIcon={<Add/>} onClick={() => setDraft((current) => ({ ...current, lines: [...current.lines, blankLine()] }))}>Add line</Button><Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField fullWidth label="Order discount" type="number" value={draft.discountAmount} onChange={(event) => setDraft((current) => ({ ...current, discountAmount: Number(event.target.value) }))}/><TextField fullWidth label="Additional tax" type="number" value={draft.taxAmount} onChange={(event) => setDraft((current) => ({ ...current, taxAmount: Number(event.target.value) }))}/></Stack></Stack></DialogContent><DialogActions sx={{ p: 2 }}><Button onClick={() => setOpen(false)} disabled={saving}>Cancel</Button><Button variant="contained" onClick={() => void save()} disabled={saving}>{saving ? 'Saving…' : 'Save Service Order'}</Button></DialogActions></Dialog>
  </Box>
}
