import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Autocomplete, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, Tab, Tabs, TextField, Typography } from '@mui/material'
import { AccountBalance, AssignmentTurnedIn, Refresh, ShoppingCart } from '@mui/icons-material'
import { workshopApi } from '../../services/workshopApi'
import { useCompanyStore } from '../../store/companyStore'
import { colors, pageLayout, radii, shadows } from '../../theme/tokens'

type TabId = 'procurement' | 'requisitions' | 'quotations' | 'compare' | 'orders' | 'receipts' | 'invoices' | 'payments' | 'journals' | 'accounting'
type AccountingModule = 'requisitions' | 'quotations' | 'compare_sheets' | 'purchase_orders' | 'receipts' | 'invoices' | 'payments' | 'journals'
type MasterOption = { id: string; label: string; secondary?: string }

const cardSx = { background: colors.bg.card, border: `1px solid ${colors.border.default}`, borderRadius: radii.lg, boxShadow: shadows.card, p: 2.5 } as const

function statusColor(status?: string): 'default' | 'success' | 'warning' | 'error' | 'info' {
  const value = (status || '').toLowerCase()
  if (value.includes('approved') || value.includes('paid') || value.includes('complete')) return 'success'
  if (value.includes('reject') || value.includes('cancel')) return 'error'
  if (value.includes('pending') || value.includes('review') || value.includes('draft')) return 'warning'
  return 'info'
}

export function FinanceWorkspacePage({ initialTab = 'procurement', workspace = 'procurement' }: { initialTab?: TabId; workspace?: 'procurement' | 'accounting' }) {
  const { selectedCompanyId, companies } = useCompanyStore()
  const company = companies.find((item) => item.id === selectedCompanyId)
  const [tab, setTab] = useState<TabId>(initialTab)
  const [dashboard, setDashboard] = useState<{ counts: Record<string, number>; attention?: Array<{ id: string; title: string; count: number; route?: string; severity?: string; description?: string }> } | null>(null)
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
  const [itemOptions, setItemOptions] = useState<MasterOption[]>([])
  const [supplierOptions, setSupplierOptions] = useState<MasterOption[]>([])
  const [mastersLoading, setMastersLoading] = useState(false)
  const [accountOptions, setAccountOptions] = useState<MasterOption[]>([])
  const [modeOptions, setModeOptions] = useState<MasterOption[]>([])
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentParty, setPaymentParty] = useState('')
  const [paymentFrom, setPaymentFrom] = useState('')
  const [paymentTo, setPaymentTo] = useState('')
  const [paymentMode, setPaymentMode] = useState('')

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
    if (!selectedCompanyId) {
      setLoading(false)
      setError('Select a company to load the company-scoped procurement and accounting records.')
      return
    }
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
      const moduleErrors: string[] = []
      const results = await Promise.all(modules.map(async (module) => {
        try { return await workshopApi.accountingList(module, selectedCompanyId) }
        catch { moduleErrors.push(module); return { data: [] } }
      }))
      setDocuments(Object.fromEntries(modules.map((module, index) => [module, results[index].data || []])) as Record<AccountingModule, Array<Record<string, unknown>>>)
      if (moduleErrors.length) setError(`Some permitted modules could not be loaded: ${moduleErrors.join(', ')}. Check the role and company assignment.`)
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

  useEffect(() => {
    if (!createOpen && !paymentOpen) return
    let active = true
    setMastersLoading(true)
    Promise.all([workshopApi.accountingItems(), workshopApi.accountingSuppliers(), workshopApi.accountingAccounts(selectedCompanyId || undefined), workshopApi.accountingPaymentModes()]).then(([items, suppliers, accounts, modes]) => {
      if (!active) return
      setItemOptions((items.data || []).map((item) => ({ id: item.itemCode || item.id, label: item.itemName || item.itemCode || item.id, secondary: item.itemCode })))
      setSupplierOptions((suppliers.data || []).map((supplier) => ({ id: supplier.id, label: supplier.name, secondary: supplier.type })))
      setAccountOptions((accounts.data || []).map((account) => ({ id: account.id, label: account.name, secondary: account.type })))
      setModeOptions((modes.data || []).map((mode) => ({ id: mode.id, label: mode.name, secondary: mode.type })))
    }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Unable to load item and supplier masters') }).finally(() => { if (active) setMastersLoading(false) })
    return () => { active = false }
  }, [createOpen, paymentOpen, selectedCompanyId])

  async function createPayment() {
    if (!selectedCompanyId || !paymentAmount || !paymentFrom || !paymentTo) return
    setCreateBusy(true); setError(null)
    try {
      await workshopApi.accountingCreatePayment({ company: selectedCompanyId, amount: Number(paymentAmount), paymentType: 'Pay', paidFrom: paymentFrom, paidTo: paymentTo, partyType: paymentParty ? 'Supplier' : undefined, party: paymentParty || undefined, modeOfPayment: paymentMode || undefined })
      setPaymentOpen(false); setPaymentAmount(''); setPaymentParty(''); setPaymentFrom(''); setPaymentTo(''); setPaymentMode(''); await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to create payment entry') }
    finally { setCreateBusy(false) }
  }

  return <Box sx={{ ...pageLayout, p: { xs: 2, md: 3 } }}>
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2.5, justifyContent: 'space-between' }}>
      <Box><Typography variant="overline" sx={{ color: colors.slate[500], fontWeight: 800 }}>WORKSHOP OPERATIONS</Typography><Typography variant="h4" sx={{ fontWeight: 800 }}>{workspace === 'accounting' ? 'Accounting Workspace' : 'Procurement Workspace'}</Typography><Typography sx={{ color: colors.slate[600], mt: .5 }}>{workspace === 'accounting' ? 'Ledger-facing finance control: invoices, payment entries, journals, clearances and company financial records.' : 'Company-scoped requisitions, supplier quotations, compare sheets, purchase orders and receipts.'}</Typography></Box>
      <Button startIcon={<Refresh />} variant="outlined" onClick={() => void load()} disabled={loading}>Refresh</Button>
    </Stack>
    {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2.5 }}>
      <Box sx={{ ...cardSx, flex: 1 }}><Typography variant="caption">Company</Typography><Typography variant="h6" sx={{ fontWeight: 800 }}>{company?.name || selectedCompanyId || 'Select a company'}</Typography></Box>
      {Object.entries(dashboard?.counts || {}).slice(0, 4).map(([key, value]) => <Box key={key} sx={{ ...cardSx, flex: 1 }}><Typography variant="caption">{key.replace(/([A-Z])/g, ' $1')}</Typography><Typography variant="h5" sx={{ fontWeight: 800 }}>{Number(value || 0).toLocaleString()}</Typography></Box>)}
    </Stack>
    {dashboard?.attention?.some((item) => item.count > 0) ? <Box sx={{ ...cardSx, mb: 2.5 }}><Typography sx={{ fontWeight: 800, mb: 1 }}>Work requiring action</Typography><Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>{dashboard.attention.filter((item) => item.count > 0).map((item) => <Button key={item.id} variant="outlined" onClick={() => { const route = (item.route || '').split('/').pop() || ''; const tabMap: Record<string, TabId> = { requisitions: 'requisitions', quotations: 'quotations', 'compare-sheets': 'compare', 'purchase-orders': 'orders', receipts: 'receipts', invoices: 'invoices', payments: 'payments', journals: 'journals', cases: 'procurement' }; setTab(tabMap[route] || 'accounting'); setQuery('') }}>{item.title} · {item.count}</Button>)}</Stack></Box> : null}
    <Box sx={cardSx}>
      <Tabs value={tab} variant="scrollable" allowScrollButtonsMobile onChange={(_, value: TabId) => { setTab(value); setQuery('') }}>{workspace === 'procurement' ? <><Tab value="procurement" icon={<ShoppingCart />} iconPosition="start" label="Procurement cases" /><Tab value="requisitions" label="Requisitions" /><Tab value="quotations" label="Supplier quotations" /><Tab value="compare" label="Compare sheets" /><Tab value="orders" label="Purchase orders" /><Tab value="receipts" label="Receipts / GRN" /></> : <><Tab value="accounting" icon={<AccountBalance />} iconPosition="start" label="Clearances" /><Tab value="invoices" label="Supplier invoices" /><Tab value="payments" label="Payment entry" /><Tab value="journals" label="Journal ledger" /></>}</Tabs>
      <Divider sx={{ mb: 2 }} />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}><TextField fullWidth size="small" label="Search permitted records" value={query} onChange={(event) => setQuery(event.target.value)} />{['requisitions', 'quotations'].includes(tab) ? <Button variant="contained" onClick={() => setCreateOpen(true)}>New {tab === 'quotations' ? 'quotation' : 'requisition'}</Button> : null}{workspace === 'accounting' && tab === 'payments' ? <Button variant="contained" onClick={() => setPaymentOpen(true)}>New payment entry</Button> : null}</Stack>
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
    <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth><DialogTitle>Create {tab === 'quotations' ? 'supplier quotation' : 'material requisition'}</DialogTitle><DialogContent dividers><Stack spacing={1.5} sx={{ pt: .5 }}><Typography variant="caption">Choose master records from the selected company. Search matches code, name, and type.</Typography><Autocomplete loading={mastersLoading} options={itemOptions} value={itemOptions.find((item) => item.id === createItemCode) || null} onChange={(_, value) => setCreateItemCode(value?.id || '')} getOptionLabel={(option) => option.secondary ? `${option.label} · ${option.secondary}` : option.label} isOptionEqualToValue={(option, value) => option.id === value.id} renderInput={(params) => <TextField {...params} required label="Item / part" autoFocus />} /><TextField label="Quantity" type="number" value={createQty} onChange={(event) => setCreateQty(event.target.value)} />{tab === 'quotations' ? <Autocomplete loading={mastersLoading} options={supplierOptions} value={supplierOptions.find((supplier) => supplier.id === createSupplier) || null} onChange={(_, value) => setCreateSupplier(value?.id || '')} getOptionLabel={(option) => option.secondary ? `${option.label} · ${option.secondary}` : option.label} isOptionEqualToValue={(option, value) => option.id === value.id} renderInput={(params) => <TextField {...params} required label="Supplier" />} /> : null}{tab === 'quotations' ? <TextField label="Rate" type="number" value={createRate} onChange={(event) => setCreateRate(event.target.value)} /> : null}<TextField label="Remarks / description" multiline minRows={2} value={createRemarks} onChange={(event) => setCreateRemarks(event.target.value)} /></Stack></DialogContent><DialogActions><Button onClick={() => setCreateOpen(false)}>Cancel</Button><Button variant="contained" disabled={createBusy || !createItemCode.trim() || (tab === 'quotations' && !createSupplier.trim())} onClick={() => void createDocument()}>{createBusy ? 'Creating…' : 'Create draft'}</Button></DialogActions></Dialog>
    <Dialog open={paymentOpen} onClose={() => setPaymentOpen(false)} maxWidth="sm" fullWidth><DialogTitle>New payment entry</DialogTitle><DialogContent dividers><Stack spacing={1.5} sx={{ pt: .5 }}><Typography variant="caption">Select ledger accounts and payment mode from the database. Bank payments require reference number and date on the accounting record.</Typography><TextField required label="Amount" type="number" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} /><Autocomplete options={supplierOptions} loading={mastersLoading} value={supplierOptions.find((item) => item.id === paymentParty) || null} onChange={(_, value) => setPaymentParty(value?.id || '')} getOptionLabel={(option) => option.label} isOptionEqualToValue={(option, value) => option.id === value.id} renderInput={(params) => <TextField {...params} label="Supplier (optional for internal transfer)" />} /><Autocomplete options={accountOptions} loading={mastersLoading} value={accountOptions.find((item) => item.id === paymentFrom) || null} onChange={(_, value) => setPaymentFrom(value?.id || '')} getOptionLabel={(option) => option.secondary ? `${option.label} · ${option.secondary}` : option.label} isOptionEqualToValue={(option, value) => option.id === value.id} renderInput={(params) => <TextField {...params} required label="Paid from account" />} /><Autocomplete options={accountOptions} loading={mastersLoading} value={accountOptions.find((item) => item.id === paymentTo) || null} onChange={(_, value) => setPaymentTo(value?.id || '')} getOptionLabel={(option) => option.secondary ? `${option.label} · ${option.secondary}` : option.label} isOptionEqualToValue={(option, value) => option.id === value.id} renderInput={(params) => <TextField {...params} required label="Paid to account" />} /><Autocomplete options={modeOptions} loading={mastersLoading} value={modeOptions.find((item) => item.id === paymentMode) || null} onChange={(_, value) => setPaymentMode(value?.id || '')} getOptionLabel={(option) => option.label} isOptionEqualToValue={(option, value) => option.id === value.id} renderInput={(params) => <TextField {...params} label="Mode of payment" />} /></Stack></DialogContent><DialogActions><Button onClick={() => setPaymentOpen(false)}>Cancel</Button><Button variant="contained" disabled={createBusy || !paymentAmount || !paymentFrom || !paymentTo} onClick={() => void createPayment()}>{createBusy ? 'Creating…' : 'Create payment draft'}</Button></DialogActions></Dialog>
  </Box>
}
