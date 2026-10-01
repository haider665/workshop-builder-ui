import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, Tab, Tabs, TextField, Typography } from '@mui/material'
import { AccountBalance, AssignmentTurnedIn, Refresh, ShoppingCart } from '@mui/icons-material'
import { workshopApi } from '../../services/workshopApi'
import { useCompanyStore } from '../../store/companyStore'
import { colors, pageLayout, radii, shadows } from '../../theme/tokens'

type TabId = 'procurement' | 'requisitions' | 'quotations' | 'compare' | 'orders' | 'receipts' | 'invoices' | 'payments' | 'journals' | 'accounting'
type AccountingModule = 'requisitions' | 'quotations' | 'compare_sheets' | 'purchase_orders' | 'receipts' | 'invoices' | 'payments' | 'journals'

const cardSx = { background: colors.bg.card, border: `1px solid ${colors.border.default}`, borderRadius: radii.lg, boxShadow: shadows.card, p: 2.5 } as const

function statusColor(status?: string): 'default' | 'success' | 'warning' | 'error' | 'info' {
  const value = (status || '').toLowerCase()
  if (value.includes('approved') || value.includes('paid') || value.includes('complete')) return 'success'
  if (value.includes('reject') || value.includes('cancel')) return 'error'
  if (value.includes('pending') || value.includes('review') || value.includes('draft')) return 'warning'
  return 'info'
}

export function FinanceWorkspacePage({ initialTab = 'procurement' }: { initialTab?: TabId }) {
  const { selectedCompanyId, companies } = useCompanyStore()
  const company = companies.find((item) => item.id === selectedCompanyId)
  const [tab, setTab] = useState<TabId>(initialTab)
  const [dashboard, setDashboard] = useState<{ counts: Record<string, number>; attention?: Array<{ id: string; title: string; count: number; severity?: string; description?: string }> } | null>(null)
  const [cases, setCases] = useState<Array<{ id: string; title?: string; stage?: string; status?: string; owner?: string; updatedAt?: string }>>([])
  const [inbox, setInbox] = useState<Array<{ id: string; title?: string; stage?: string; status?: string; owner?: string; updatedAt?: string; checklist?: Array<{ label?: string; ready?: boolean }> }>>([])
  const [clearances, setClearances] = useState<Array<{ id: string; type?: string; status?: string; appointmentId?: string; requestedAmount?: number; outstandingAmount?: number; requestedByUserId?: string; requestedAt?: string; reviewedByUserId?: string; reviewedAt?: string; reviewNote?: string }>>([])
  const [documents, setDocuments] = useState<Record<AccountingModule, Array<Record<string, unknown>>>>({ requisitions: [], quotations: [], compare_sheets: [], purchase_orders: [], receipts: [], invoices: [], payments: [], journals: [] })
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [selectedRecord, setSelectedRecord] = useState<Record<string, unknown> | null>(null)
  const [selectedModule, setSelectedModule] = useState<AccountingModule | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [createItemCode, setCreateItemCode] = useState('')
  const [createSupplier, setCreateSupplier] = useState('')
  const [createQty, setCreateQty] = useState('1')
  const [createRate, setCreateRate] = useState('0')
  const [createRemarks, setCreateRemarks] = useState('')
  const [createBusy, setCreateBusy] = useState(false)

  async function openDocument(module: AccountingModule, row: Record<string, unknown>) {
    const id = String(row.name || row.id || '')
    if (!id) return
    setSelectedRecord(row)
    setSelectedModule(module)
    setDetailLoading(true)
    try {
      const detail = await workshopApi.accountingGet(module, id)
      setSelectedRecord(detail)
    } catch {
      // The list DTO is still useful when a legacy document cannot be read.
    } finally { setDetailLoading(false) }
  }

  const load = useCallback(async () => {
    if (!selectedCompanyId) return
    setLoading(true); setError(null)
    try {
      const [summary, queue, caseList, clearanceList] = await Promise.all([
        workshopApi.accountingDashboard(selectedCompanyId),
        workshopApi.procurementInbox(selectedCompanyId).catch(() => ({ data: [] })),
        workshopApi.procurementCases(selectedCompanyId).catch(() => ({ data: [], meta: { page: 1, pageSize: 100, total: 0 } })),
        workshopApi.financialClearances(selectedCompanyId).catch(() => ({ data: [], meta: { page: 1, pageSize: 100, total: 0 } })),
      ])
      setDashboard(summary)
      setInbox(queue.data || [])
      setCases(caseList.data || [])
      setClearances(clearanceList.data || [])
      const modules: AccountingModule[] = ['requisitions', 'quotations', 'compare_sheets', 'purchase_orders', 'receipts', 'invoices', 'payments', 'journals']
      const results = await Promise.all(modules.map((module) => workshopApi.accountingList(module, selectedCompanyId).catch(() => ({ data: [] }))))
      setDocuments(Object.fromEntries(modules.map((module, index) => [module, results[index].data || []])) as Record<AccountingModule, Array<Record<string, unknown>>>)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load company finance workspace')
    } finally { setLoading(false) }
  }, [selectedCompanyId])

  useEffect(() => { void load() }, [load])
  useEffect(() => { const handler = () => void load(); window.addEventListener('cw:company-changed', handler); return () => window.removeEventListener('cw:company-changed', handler) }, [load])

  const filteredCases = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return cases
    return cases.filter((item) => [item.id, item.title, item.stage, item.status, item.owner].some((value) => String(value || '').toLowerCase().includes(term)))
  }, [cases, query])
  const filteredClearances = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return clearances
    return clearances.filter((item) => [item.id, item.type, item.status, item.appointmentId, item.requestedByUserId].some((value) => String(value || '').toLowerCase().includes(term)))
  }, [clearances, query])
  const tabModule: Record<string, AccountingModule> = { requisitions: 'requisitions', quotations: 'quotations', compare: 'compare_sheets', orders: 'purchase_orders', receipts: 'receipts', invoices: 'invoices', payments: 'payments', journals: 'journals' }
  const activeModule = tabModule[tab]
  const filteredDocuments = useMemo(() => {
    if (!activeModule) return []
    const term = query.trim().toLowerCase()
    const rows = documents[activeModule] || []
    return term ? rows.filter((row) => Object.values(row).some((value) => String(value ?? '').toLowerCase().includes(term))) : rows
  }, [activeModule, documents, query])

  async function review(id: string, action: 'approve' | 'reject' | 'return') {
    const note = window.prompt(action === 'approve' ? 'Approval note (optional)' : 'Reason for this decision')
    if (action !== 'approve' && !note?.trim()) return
    setBusyId(id)
    try {
      if (action === 'approve') await workshopApi.approveFinancialClearance(id, note || undefined)
      else if (action === 'reject') await workshopApi.rejectFinancialClearance(id, note!.trim())
      else await workshopApi.returnFinancialClearance(id, note!.trim())
      await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Review failed') }
    finally { setBusyId(null) }
  }

  async function submitDocument(module: AccountingModule, id: string) {
    setBusyId(id); setError(null)
    try { await workshopApi.accountingSubmit(module, id); await load() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to submit document') }
    finally { setBusyId(null) }
  }

  async function createDocument() {
    if (!selectedCompanyId || !createItemCode.trim()) return
    setCreateBusy(true); setError(null)
    try {
      const data: Record<string, unknown> = { company: selectedCompanyId, items: [{ itemCode: createItemCode.trim(), qty: Number(createQty) || 1, rate: Number(createRate) || 0, description: createRemarks.trim() || undefined }] }
      if (tab === 'quotations') data.supplierId = createSupplier.trim()
      if (tab === 'requisitions') data.remarks = createRemarks.trim() || undefined
      await workshopApi.accountingCreate(tab === 'quotations' ? 'quotations' : 'requisitions', data)
      setCreateOpen(false); setCreateItemCode(''); setCreateSupplier(''); setCreateQty('1'); setCreateRate('0'); setCreateRemarks('')
      await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to create document') }
    finally { setCreateBusy(false) }
  }

  return <Box sx={{ ...pageLayout, p: { xs: 2, md: 3 } }}>
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2.5, justifyContent: 'space-between' }}>
      <Box><Typography variant="overline" sx={{ color: colors.slate[500], fontWeight: 800 }}>WORKSHOP OPERATIONS</Typography><Typography variant="h4" sx={{ fontWeight: 800 }}>Procurement & Accounting</Typography><Typography sx={{ color: colors.slate[600], mt: .5 }}>Company-scoped purchasing, approvals, receipts, invoices, payments and audit status in the Workshop workspace.</Typography></Box>
      <Button startIcon={<Refresh />} variant="outlined" onClick={() => void load()} disabled={loading}>Refresh</Button>
    </Stack>
    {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2.5 }}>
      <Box sx={{ ...cardSx, flex: 1 }}><Typography variant="caption">Company</Typography><Typography variant="h6" sx={{ fontWeight: 800 }}>{company?.name || selectedCompanyId || 'Select a company'}</Typography></Box>
      {Object.entries(dashboard?.counts || {}).slice(0, 4).map(([key, value]) => <Box key={key} sx={{ ...cardSx, flex: 1 }}><Typography variant="caption">{key.replace(/([A-Z])/g, ' $1')}</Typography><Typography variant="h5" sx={{ fontWeight: 800 }}>{Number(value || 0).toLocaleString()}</Typography></Box>)}
    </Stack>
    <Box sx={cardSx}>
      <Tabs value={tab} variant="scrollable" allowScrollButtonsMobile onChange={(_, value: TabId) => { setTab(value); setQuery('') }}><Tab value="procurement" icon={<ShoppingCart />} iconPosition="start" label="Cases" /><Tab value="requisitions" label="Requisitions" /><Tab value="quotations" label="Quotations" /><Tab value="compare" label="Compare sheets" /><Tab value="orders" label="Purchase orders" /><Tab value="receipts" label="Receipts" /><Tab value="invoices" label="Supplier invoices" /><Tab value="payments" label="Payments" /><Tab value="journals" label="Journals" /><Tab value="accounting" icon={<AccountBalance />} iconPosition="start" label="Clearances" /></Tabs>
      <Divider sx={{ mb: 2 }} />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}><TextField fullWidth size="small" label="Search permitted records" value={query} onChange={(event) => setQuery(event.target.value)} /><Button variant="contained" disabled={!['requisitions', 'quotations'].includes(tab)} onClick={() => setCreateOpen(true)}>New {tab === 'quotations' ? 'quotation' : 'requisition'}</Button></Stack>
      {loading ? <Stack sx={{ py: 6, alignItems: 'center' }}><CircularProgress size={28} /></Stack> : activeModule ? <Stack spacing={1}>
        {filteredDocuments.map((row) => { const id = String(row.name || row.id || ''); const status = String(row.status || (Number(row.docstatus) === 1 ? 'Submitted' : 'Draft')); const party = String(row.supplierName || row.supplierId || row.partyName || row.partyId || ''); const amount = row.grandTotal ?? row.totalAmount ?? row.paidAmount ?? row.total ?? null; return <Box key={id} role="button" tabIndex={0} onClick={() => void openDocument(activeModule, row)} onKeyDown={(event) => { if (event.key === 'Enter') void openDocument(activeModule, row) }} sx={{ border: `1px solid ${colors.border.default}`, borderRadius: radii.md, p: 1.75, cursor: 'pointer', '&:hover': { borderColor: colors.slate[500] } }}><Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ alignItems: { md: 'center' } }}><Box sx={{ flex: 1 }}><Typography sx={{ fontWeight: 800 }}>{id || 'Unnamed document'}</Typography><Typography variant="caption">{party || 'No party'}{amount !== null ? ` · ${Number(amount).toLocaleString()} · ` : ' · '}{String(row.company || selectedCompanyId || '')}</Typography></Box><Chip size="small" label={status} color={statusColor(status)} />{['Draft', '0', 'Open'].includes(status) ? <Button size="small" variant="outlined" disabled={!id || busyId === id} onClick={(event) => { event.stopPropagation(); void submitDocument(activeModule, id) }}>Submit</Button> : null}</Stack></Box> })}
        {!filteredDocuments.length ? <Typography sx={{ color: colors.slate[500], py: 4, textAlign: 'center' }}>No records found for this company.</Typography> : null}
      </Stack> : tab === 'procurement' ? <Stack spacing={1}>
        {filteredCases.map((item) => <Box key={item.id} sx={{ border: `1px solid ${colors.border.default}`, borderRadius: radii.md, p: 1.75 }}><Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ alignItems: { md: 'center' } }}><Box sx={{ flex: 1 }}><Typography sx={{ fontWeight: 800 }}>{item.title || item.id}</Typography><Typography variant="caption">{item.id} · {item.stage || 'Unstaged'} · Owner: {item.owner || 'Unassigned'}</Typography></Box><Chip size="small" label={item.status || 'Open'} color={statusColor(item.status)} /></Stack></Box>)}
        {!filteredCases.length ? <Typography sx={{ color: colors.slate[500], py: 4, textAlign: 'center' }}>No procurement cases found for this company.</Typography> : null}
        {inbox.length ? <Alert icon={<AssignmentTurnedIn />} severity="info">{inbox.length} assigned procurement task{inbox.length === 1 ? '' : 's'} are visible in your queue. Open the case in the Workshop workflow to continue its audited transition.</Alert> : null}
      </Stack> : <Stack spacing={1}>
        {filteredClearances.map((item) => <Box key={item.id} sx={{ border: `1px solid ${colors.border.default}`, borderRadius: radii.md, p: 1.75 }}><Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'center' } }}><Box sx={{ flex: 1 }}><Typography sx={{ fontWeight: 800 }}>{item.type || 'Financial clearance'} · {item.appointmentId || item.id}</Typography><Typography variant="caption">Requested by {item.requestedByUserId || 'user'} · {item.requestedAt ? new Date(item.requestedAt).toLocaleString() : 'time unavailable'}{item.reviewedByUserId ? ` · Reviewed by ${item.reviewedByUserId}` : ''}</Typography></Box><Chip size="small" label={item.status || 'Requested'} color={statusColor(item.status)} /><Stack direction="row" spacing={.75}>{item.status === 'Requested' ? <><Button size="small" variant="contained" disabled={busyId === item.id} onClick={() => void review(item.id, 'approve')}>Approve</Button><Button size="small" color="error" variant="outlined" disabled={busyId === item.id} onClick={() => void review(item.id, 'reject')}>Reject</Button><Button size="small" variant="outlined" disabled={busyId === item.id} onClick={() => void review(item.id, 'return')}>Return</Button></> : null}</Stack></Stack></Box>)}
        {!filteredClearances.length ? <Typography sx={{ color: colors.slate[500], py: 4, textAlign: 'center' }}>No accounting clearances found for this company.</Typography> : null}
      </Stack>}
    </Box>
    <Dialog open={Boolean(selectedRecord)} onClose={() => { setSelectedRecord(null); setSelectedModule(null) }} maxWidth="md" fullWidth><DialogTitle>{String(selectedRecord?.doctype || selectedModule || 'Document')} · {String(selectedRecord?.id || selectedRecord?.name || '')}</DialogTitle><DialogContent dividers><Stack spacing={1.5}><Typography variant="caption">Company-scoped record · details are loaded from the audited backend.</Typography>{detailLoading ? <CircularProgress size={22} /> : null}{selectedModule === 'requisitions' && selectedRecord?.id ? <Button size="small" variant="outlined" onClick={() => void workshopApi.accountingWorkflow(String(selectedRecord?.id)).then((workflow) => setSelectedRecord({ ...selectedRecord, workflow }))}>Load linked workflow</Button> : null}<Stack direction="row" spacing={1}><Button size="small" variant="outlined" onClick={() => window.open(workshopApi.accountingPrintUrl(selectedModule || '', String(selectedRecord?.id || selectedRecord?.name || '')), '_blank', 'noopener,noreferrer')}>Print official document</Button>{selectedModule && ['Draft', '0', 'Open'].includes(String(selectedRecord?.status || (Number(selectedRecord?.docstatus) === 1 ? 'Submitted' : 'Draft'))) ? <Button size="small" variant="contained" onClick={() => { const id = String(selectedRecord?.id || selectedRecord?.name || ''); void submitDocument(selectedModule, id).then(() => setSelectedRecord(null)) }}>Submit</Button> : null}</Stack><Box component="pre" sx={{ m: 0, whiteSpace: 'pre-wrap', overflow: 'auto', fontFamily: 'monospace', fontSize: '.8rem' }}>{selectedRecord ? JSON.stringify(selectedRecord, null, 2) : ''}</Box></Stack></DialogContent></Dialog>
    <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth><DialogTitle>Create {tab === 'quotations' ? 'supplier quotation' : 'material requisition'}</DialogTitle><DialogContent dividers><Stack spacing={1.5} sx={{ pt: .5 }}><Typography variant="caption">The record will be created in the selected company and remain in draft until reviewed and submitted.</Typography><TextField required label="Item code" value={createItemCode} onChange={(event) => setCreateItemCode(event.target.value)} autoFocus /><TextField label="Quantity" type="number" value={createQty} onChange={(event) => setCreateQty(event.target.value)} />{tab === 'quotations' ? <TextField required label="Supplier" value={createSupplier} onChange={(event) => setCreateSupplier(event.target.value)} /> : null}{tab === 'quotations' ? <TextField label="Rate" type="number" value={createRate} onChange={(event) => setCreateRate(event.target.value)} /> : null}<TextField label="Remarks / description" multiline minRows={2} value={createRemarks} onChange={(event) => setCreateRemarks(event.target.value)} /></Stack></DialogContent><DialogActions><Button onClick={() => setCreateOpen(false)}>Cancel</Button><Button variant="contained" disabled={createBusy || !createItemCode.trim() || (tab === 'quotations' && !createSupplier.trim())} onClick={() => void createDocument()}>{createBusy ? 'Creating…' : 'Create draft'}</Button></DialogActions></Dialog>
  </Box>
}
