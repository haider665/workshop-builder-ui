import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Autocomplete, Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControlLabel, Stack, Step, StepLabel, Stepper, Switch, Tab, Tabs, TextField, Typography } from '@mui/material'
import { AccountBalance, AssignmentTurnedIn, Refresh, ShoppingCart } from '@mui/icons-material'
import { workshopApi } from '../../services/workshopApi'
import { useCompanyStore } from '../../store/companyStore'
import { colors, pageLayout, radii, shadows } from '../../theme/tokens'

type TabId = 'procurement' | 'policy' | 'requisitions' | 'quotations' | 'compare' | 'orders' | 'receipts' | 'invoices' | 'payments' | 'journals' | 'accounting'
type AccountingModule = 'requisitions' | 'quotations' | 'compare_sheets' | 'purchase_orders' | 'receipts' | 'invoices' | 'payments' | 'journals'
type MasterOption = { id: string; label: string; secondary?: string }

const PROCUREMENT_DEMO_STEPS = [
  { title: 'Part request from the floor', role: 'SA / SE / Technician', required: 'Appointment, vehicle, part, quantity, and reason', detail: 'A part is requested against the appointment, vehicle, customer, concern, and quantity. The request remains traceable to the job.' },
  { title: 'Store review', role: 'Parts / Store Keeper', required: 'Stock and FIFO availability decision', detail: 'The store checks available stock and FIFO stock units. If the part is available, it returns to Counter Desk; if there is a shortage, procurement demand is opened.' },
  { title: 'Quotation collection', role: 'Procurement', required: 'At least one supplier quotation', detail: 'Procurement collects supplier quotations against the requisition. Supplier, price, delivery date, tax, currency, and commercial terms are recorded.' },
  { title: 'Comparative Statement', role: 'Procurement', required: 'Quotation comparison and recommendation', detail: 'The quotations are compared in a controlled Compare Statement. The recommended supplier and commercial justification are recorded.' },
  { title: 'Verification and approval', role: 'Audit / GM / ED / MD / Chairman', required: 'Policy thresholds and required approval chain', detail: 'The configured company policy decides which approval stages are required. Thresholds and escalation are evaluated server-side.' },
  { title: 'Purchase Order and supplier confirmation', role: 'Procurement', required: 'Approved supplier, ETA, tax, terms, advance instruction', detail: 'The approved supplier becomes the Purchase Order supplier. ETA, advance instruction, VAT, tax, terms, and delivery conditions are captured.' },
  { title: 'GRN and inventory', role: 'Store Keeper / Procurement', required: 'Physical verification and received quantity', detail: 'The store physically verifies the delivery and submits the GRN. Inventory is increased using FIFO-aware stock records and the procurement case is updated.' },
  { title: 'Accounts and settlement', role: 'Accounts', required: 'Invoice, reconciliation, and payment entry', detail: 'The supplier invoice is checked, posted, reconciled, and settled through the Payment Entry. The complete case and audit history remain printable.' },
]

const PROCUREMENT_DEMO_DATA = {
  case: { id: 'DEMO-PROC-0001', title: 'Nissan X-Trail · Front brake pad set', stage: 'Requested', currentStage: 'Requested', status: 'Open', owner: 'parts@continental-works.com', currentOwnerRole: 'Parts / Store Keeper', sourceName: 'Appointment APPT-DEMO-0001', approvalAmount: 128000, updatedAt: '2026-10-18 10:30:00' },
  documents: {
    requisitions: [{ id: 'DEMO-MR-0001', name: 'DEMO-MR-0001', status: 'Submitted', itemName: 'Front Brake Pad Set', itemCode: 'CW-PART-BRAKE-001', qty: 1, company: 'Continental Works', source: 'APPT-DEMO-0001' }],
    quotations: [{ id: 'DEMO-QTN-0001', name: 'DEMO-QTN-0001', status: 'Submitted', supplierName: 'Continental Auto Parts Ltd.', supplierId: 'SUP-CW-001', totalAmount: 128000, company: 'Continental Works' }, { id: 'DEMO-QTN-0002', name: 'DEMO-QTN-0002', status: 'Submitted', supplierName: 'Dhaka Motor Components', supplierId: 'SUP-CW-002', totalAmount: 135000, company: 'Continental Works' }],
    compare_sheets: [{ id: 'DEMO-CS-0001', name: 'DEMO-CS-0001', status: 'Approved', supplierName: 'Continental Auto Parts Ltd.', totalAmount: 128000, company: 'Continental Works', recommendation: 'Lowest compliant quotation; ETA 3 working days' }],
    purchase_orders: [{ id: 'DEMO-PO-0001', name: 'DEMO-PO-0001', status: 'Submitted', supplierName: 'Continental Auto Parts Ltd.', grandTotal: 128000, company: 'Continental Works', eta: '2026-10-21' }],
    receipts: [{ id: 'DEMO-GRN-0001', name: 'DEMO-GRN-0001', status: 'Submitted', supplierName: 'Continental Auto Parts Ltd.', total: 128000, company: 'Continental Works', receivedBy: 'Store Keeper' }],
    invoices: [{ id: 'DEMO-PINV-0001', name: 'DEMO-PINV-0001', status: 'Submitted', supplierName: 'Continental Auto Parts Ltd.', grandTotal: 128000, company: 'Continental Works' }],
    payments: [{ id: 'DEMO-PAY-0001', name: 'DEMO-PAY-0001', status: 'Paid', partyName: 'Continental Auto Parts Ltd.', paidAmount: 128000, company: 'Continental Works', modeOfPayment: 'Bank Transfer' }],
    journals: [],
  },
}

const DEMO_ACTION_CHAIN = [
  { action: 'store_review', label: 'Complete store review', toStage: 'Procurement Review', owner: 'Parts / Store Keeper' },
  { action: 'open_quotation_collection', label: 'Start quotation collection', toStage: 'Quotation Collection', owner: 'Procurement' },
  { action: 'prepare_compare', label: 'Prepare comparative statement', toStage: 'Compare Sheet Preparation', owner: 'Procurement' },
  { action: 'submit_gm_approval', label: 'Submit for GM approval', toStage: 'GM Approval', owner: 'GM - Operations' },
  { action: 'complete_gm_approval', label: 'Approve as GM', toStage: 'Audit Verification', owner: 'Audit' },
  { action: 'complete_audit_verification', label: 'Complete audit verification', toStage: 'Management Approval', owner: 'ED / MD / Chairman' },
  { action: 'complete_management_approval', label: 'Complete management approval', toStage: 'PO Creation', owner: 'Procurement' },
  { action: 'create_purchase_order', label: 'Create purchase order', toStage: 'Supplier Confirmation', owner: 'Procurement' },
  { action: 'confirm_supplier', label: 'Confirm supplier and ETA', toStage: 'Chalan / GRN', owner: 'Store Keeper / Procurement' },
  { action: 'submit_grn', label: 'Submit GRN and update stock', toStage: 'Actual Accounts', owner: 'Accounts' },
  { action: 'post_supplier_invoice', label: 'Post supplier invoice', toStage: 'Bill Settlement', owner: 'Accounts' },
  { action: 'settle_payment', label: 'Settle payment', toStage: 'Paid / Closed', owner: 'Accounts' },
]

function demoActionsForStage(stage: string) {
  const stages = ['Requested', 'Procurement Review', 'Quotation Collection', 'Compare Sheet Preparation', 'GM Approval', 'Audit Verification', 'Management Approval', 'PO Creation', 'Supplier Confirmation', 'Chalan / GRN', 'Actual Accounts', 'Bill Settlement']
  const next = DEMO_ACTION_CHAIN[stages.indexOf(stage)]
  if (!next) return []
  return [{ ...next, allowed: true, requiresReason: false, disabledReason: null }]
}

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
  const [cases, setCases] = useState<Array<{ id: string; title?: string; stage?: string; status?: string; owner?: string; updatedAt?: string; approvalAmount?: number; slaDueAt?: string; currentOwnerRole?: string; sourceName?: string }>>([])
  const [inbox, setInbox] = useState<Array<{ id: string; title?: string; stage?: string; status?: string; owner?: string; updatedAt?: string; checklist?: Array<{ label?: string; ready?: boolean }> }>>([])
  const [clearances, setClearances] = useState<Array<{ id: string; type?: string; status?: string; appointmentId?: string; requestedAmount?: number; outstandingAmount?: number; requestedByUserId?: string; requestedAt?: string; reviewedByUserId?: string; reviewedAt?: string; reviewNote?: string }>>([])
  const [documents, setDocuments] = useState<Record<AccountingModule, Array<Record<string, unknown>>>>({ requisitions: [], quotations: [], compare_sheets: [], purchase_orders: [], receipts: [], invoices: [], payments: [], journals: [] })
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [selectedRecord, setSelectedRecord] = useState<Record<string, unknown> | null>(null)
  const [selectedModule, setSelectedModule] = useState<AccountingModule | null>(null)
  const [selectedCase, setSelectedCase] = useState<Record<string, unknown> | null>(null)
  const [caseActions, setCaseActions] = useState<Array<{ action: string; label: string; allowed: boolean; requiresReason: boolean; disabledReason?: string | null; toStage: string }>>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [createItemCode, setCreateItemCode] = useState('')
  const [createSupplier, setCreateSupplier] = useState('')
  const [createQty, setCreateQty] = useState('1')
  const [createRate, setCreateRate] = useState('0')
  const [createRemarks, setCreateRemarks] = useState('')
  const [createMaterialRequestId, setCreateMaterialRequestId] = useState('')
  const [createBusy, setCreateBusy] = useState(false)
  const [itemOptions, setItemOptions] = useState<MasterOption[]>([])
  const [supplierOptions, setSupplierOptions] = useState<MasterOption[]>([])
  const [mastersLoading, setMastersLoading] = useState(false)
  const [accountOptions, setAccountOptions] = useState<MasterOption[]>([])
  const [modeOptions, setModeOptions] = useState<MasterOption[]>([])
  const [policy, setPolicy] = useState<Record<string, unknown> | null>(null)
  const [policyBusy, setPolicyBusy] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentParty, setPaymentParty] = useState('')
  const [paymentFrom, setPaymentFrom] = useState('')
  const [paymentTo, setPaymentTo] = useState('')
  const [paymentMode, setPaymentMode] = useState('')
  const [compareOpen, setCompareOpen] = useState(false)
  const [compareSelection, setCompareSelection] = useState<string[]>([])
  const [demoOpen, setDemoOpen] = useState(false)
  const [demoStep, setDemoStep] = useState(0)
  const [demoDataLoaded, setDemoDataLoaded] = useState(false)

  function loadDemoData() {
    setDemoDataLoaded(true)
    setTab('procurement')
    setQuery('')
    setCases([PROCUREMENT_DEMO_DATA.case])
    setInbox([{ id: 'DEMO-TASK-0001', title: 'Complete supplier payment settlement', stage: 'Bill Settlement', status: 'Open', owner: 'Accounts', updatedAt: PROCUREMENT_DEMO_DATA.case.updatedAt }])
    setClearances([])
    setDocuments(PROCUREMENT_DEMO_DATA.documents as Record<AccountingModule, Array<Record<string, unknown>>>)
    setDashboard({ counts: { openCases: 1, requisitions: 1, quotations: 2, outstandingPayments: 128000 }, attention: [{ id: 'demo-payment', title: 'Payment settlement', count: 1, description: 'Complete the final payment step in the demonstration case.' }] })
    setCaseActions(demoActionsForStage('Requested'))
    setSelectedCase(null)
    setSelectedRecord(null)
  }

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

  async function openCase(id: string) {
    setSelectedCase({ id }); setCaseActions([]); setDetailLoading(true)
    if (demoDataLoaded && id === PROCUREMENT_DEMO_DATA.case.id) {
      setSelectedCase(PROCUREMENT_DEMO_DATA.case)
      setCaseActions(demoActionsForStage(String(PROCUREMENT_DEMO_DATA.case.currentStage || 'Requested')))
      setDetailLoading(false)
      return
    }
    try {
      const [detail, available] = await Promise.all([workshopApi.procurementCase(id), workshopApi.procurementCaseActions(id)])
      setSelectedCase(detail); setCaseActions(available.actions || [])
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load procurement case') }
    finally { setDetailLoading(false) }
  }


  async function runCaseAction(action: { action: string; label: string; requiresReason: boolean; toStage?: string }) {
    if (!selectedCase?.id) return
    const note = action.requiresReason || action.action.includes('reject') ? window.prompt(`Reason for ${action.label}`) : window.prompt(`${action.label} note (optional)`)
    if ((action.requiresReason || action.action.includes('reject')) && !note?.trim()) return
    if (demoDataLoaded && selectedCase.id === PROCUREMENT_DEMO_DATA.case.id) {
      const nextStage = action.toStage || selectedCase.currentStage
      setSelectedCase({ ...selectedCase, currentStage: nextStage, stage: nextStage, status: nextStage === 'Paid / Closed' ? 'Paid / Closed' : 'In Progress', currentOwnerRole: DEMO_ACTION_CHAIN.find((item) => item.toStage === nextStage)?.owner || selectedCase.currentOwnerRole, lastAction: action.label, note: note || undefined })
      setCaseActions(demoActionsForStage(String(nextStage)))
      return
    }
    setBusyId(String(selectedCase.id)); setError(null)
    try { await workshopApi.procurementCaseAction(String(selectedCase.id), action.action, note?.trim() || undefined); await openCase(String(selectedCase.id)); await load() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Procurement action failed') }
    finally { setBusyId(null) }
  }

  const load = useCallback(async () => {
    if (!selectedCompanyId) {
      setLoading(false)
      setError('Select a company to load the company-scoped procurement and accounting records.')
      return
    }
    setLoading(true); setError(null)
    try {
      const [summary, queue, caseList, clearanceList, policyResult] = await Promise.all([
        workshopApi.accountingDashboard(selectedCompanyId),
        workshopApi.procurementInbox(selectedCompanyId).catch(() => ({ data: [] })),
        workshopApi.procurementCases(selectedCompanyId).catch(() => ({ data: [], meta: { page: 1, pageSize: 100, total: 0 } })),
        workshopApi.financialClearances(selectedCompanyId).catch(() => ({ data: [], meta: { page: 1, pageSize: 100, total: 0 } })),
        workshopApi.procurementApprovalPolicies(selectedCompanyId).catch(() => ({ data: [], defaults: [] })),
      ])
      setDashboard(summary)
      setInbox(queue.data || [])
      setCases(caseList.data || [])
      setClearances(clearanceList.data || [])
      setPolicy(policyResult.data?.[0] || policyResult.defaults?.[0] || null)
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
  const requisitionOptions = documents.requisitions as Array<Record<string, unknown>>
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
      const item: Record<string, unknown> = { itemCode: createItemCode.trim(), qty: Number(createQty) || 1, rate: Number(createRate) || 0, description: createRemarks.trim() || undefined }
      if (tab === 'quotations' && createMaterialRequestId) item.materialRequestId = createMaterialRequestId
      const data: Record<string, unknown> = { company: selectedCompanyId, items: [item] }
      if (tab === 'quotations') data.supplierId = createSupplier.trim()
      if (tab === 'requisitions') data.remarks = createRemarks.trim() || undefined
      await workshopApi.accountingCreate(tab === 'quotations' ? 'quotations' : 'requisitions', data)
      setCreateOpen(false); setCreateItemCode(''); setCreateSupplier(''); setCreateQty('1'); setCreateRate('0'); setCreateRemarks(''); setCreateMaterialRequestId('')
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

  async function savePolicy() {
    if (!selectedCompanyId || !policy) return
    setPolicyBusy(true); setError(null)
    try {
      const saved = await workshopApi.saveProcurementApprovalPolicy({ ...policy, companyId: selectedCompanyId })
      setPolicy(saved)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save procurement policy') }
    finally { setPolicyBusy(false) }
  }

  const setPolicyValue = (key: string, value: unknown) => setPolicy((current) => current ? { ...current, [key]: value } : current)

  async function createCompareSheet() {
    if (!selectedCompanyId || compareSelection.length === 0) return
    setCreateBusy(true); setError(null)
    try {
      await workshopApi.accountingCreateCompareSheet({ company: selectedCompanyId, quotationIds: compareSelection })
      setCompareOpen(false); setCompareSelection([]); await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to create compare statement') }
    finally { setCreateBusy(false) }
  }

  return <Box sx={{ ...pageLayout, p: { xs: 2, md: 3 } }}>
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2.5, justifyContent: 'space-between' }}>
      <Box><Typography variant="overline" sx={{ color: colors.slate[500], fontWeight: 800 }}>WORKSHOP OPERATIONS</Typography><Typography variant="h4" sx={{ fontWeight: 800 }}>{workspace === 'accounting' ? 'Accounting Workspace' : 'Procurement Workspace'}</Typography><Typography sx={{ color: colors.slate[600], mt: .5 }}>{workspace === 'accounting' ? 'Ledger-facing finance control: invoices, payment entries, journals, clearances and company financial records.' : 'Company-scoped requisitions, supplier quotations, compare sheets, purchase orders and receipts.'}</Typography></Box>
      <Stack direction="row" spacing={1}><Button variant="outlined" onClick={() => { setDemoStep(0); setDemoOpen(true) }} disabled={workspace !== 'procurement'}>Guided process demo</Button><Button variant="contained" onClick={loadDemoData} disabled={workspace !== 'procurement'}>Load mock case</Button><Button startIcon={<Refresh />} variant="outlined" onClick={() => { setDemoDataLoaded(false); void load() }} disabled={loading}>Refresh</Button></Stack>
    </Stack>
    {demoDataLoaded ? <Alert severity="info" sx={{ mb: 2 }}>Presentation mock case loaded locally. It is not saved to Frappe and will be replaced when you refresh.</Alert> : null}
    {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2.5 }}>
      <Box sx={{ ...cardSx, flex: 1 }}><Typography variant="caption">Company</Typography><Typography variant="h6" sx={{ fontWeight: 800 }}>{company?.name || selectedCompanyId || 'Select a company'}</Typography></Box>
      {Object.entries(dashboard?.counts || {}).slice(0, 4).map(([key, value]) => <Box key={key} sx={{ ...cardSx, flex: 1 }}><Typography variant="caption">{key.replace(/([A-Z])/g, ' $1')}</Typography><Typography variant="h5" sx={{ fontWeight: 800 }}>{Number(value || 0).toLocaleString()}</Typography></Box>)}
    </Stack>
    {dashboard?.attention?.some((item) => item.count > 0) ? <Box sx={{ ...cardSx, mb: 2.5 }}><Typography sx={{ fontWeight: 800, mb: 1 }}>Work requiring action</Typography><Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>{dashboard.attention.filter((item) => item.count > 0).map((item) => <Button key={item.id} variant="outlined" onClick={() => { const route = (item.route || '').split('/').pop() || ''; const tabMap: Record<string, TabId> = { requisitions: 'requisitions', quotations: 'quotations', 'compare-sheets': 'compare', 'purchase-orders': 'orders', receipts: 'receipts', invoices: 'invoices', payments: 'payments', journals: 'journals', cases: 'procurement' }; setTab(tabMap[route] || 'accounting'); setQuery('') }}>{item.title} · {item.count}</Button>)}</Stack></Box> : null}
    <Box sx={cardSx}>
      <Tabs value={tab} variant="scrollable" allowScrollButtonsMobile onChange={(_, value: TabId) => { setTab(value); setQuery('') }}>{workspace === 'procurement' ? <><Tab value="procurement" icon={<ShoppingCart />} iconPosition="start" label="Procurement cases" /><Tab value="requisitions" label="Requisitions" /><Tab value="quotations" label="Supplier quotations" /><Tab value="compare" label="Compare sheets" /><Tab value="orders" label="Purchase orders" /><Tab value="receipts" label="Receipts / GRN" /><Tab value="policy" label="Policy & approvals" /></> : <><Tab value="accounting" icon={<AccountBalance />} iconPosition="start" label="Clearances" /><Tab value="invoices" label="Supplier invoices" /><Tab value="payments" label="Payment entry" /><Tab value="journals" label="Journal ledger" /></>}</Tabs>
      <Divider sx={{ mb: 2 }} />
      {tab === 'quotations' ? <Autocomplete<Record<string, unknown>> size="small" sx={{ mb: 2 }} options={requisitionOptions} value={requisitionOptions.find((row) => String(row.name || row.id || '') === createMaterialRequestId) || null} onChange={(_, value: Record<string, unknown> | null) => setCreateMaterialRequestId(value ? String(value.name || value.id || '') : '')} getOptionLabel={(option: Record<string, unknown>) => `${String(option.name || option.id || '')} · ${String(option.company || selectedCompanyId || '')}`} isOptionEqualToValue={(option: Record<string, unknown>, value: Record<string, unknown>) => String(option.name || option.id || '') === String(value.name || value.id || '')} renderInput={(params) => <TextField {...params} label="Source requisition for new quotation (optional)" helperText="Linking the requisition keeps the quotation inside its procurement case." />} /> : null}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}><TextField fullWidth size="small" label="Search permitted records" value={query} onChange={(event) => setQuery(event.target.value)} />{['requisitions', 'quotations'].includes(tab) ? <Button variant="contained" onClick={() => setCreateOpen(true)}>New {tab === 'quotations' ? 'quotation' : 'requisition'}</Button> : null}{tab === 'compare' ? <Button variant="contained" disabled={!documents.quotations.length} onClick={() => setCompareOpen(true)}>Create compare statement</Button> : null}{workspace === 'accounting' && tab === 'payments' ? <Button variant="contained" onClick={() => setPaymentOpen(true)}>New payment entry</Button> : null}</Stack>
      {loading ? <Stack sx={{ py: 6, alignItems: 'center' }}><CircularProgress size={28} /></Stack> : tab === 'policy' ? <Stack spacing={2} sx={{ py: 1 }}>
        <Box><Typography variant="h6" sx={{ fontWeight: 800 }}>Procurement approval policy</Typography><Typography variant="body2" sx={{ color: colors.slate[600], mt: .5 }}>Configure the approval gates for {company?.name || selectedCompanyId}. New procurement cases snapshot this policy; historical cases remain unchanged.</Typography></Box>
        {policy ? <><Stack direction={{ xs: 'column', md: 'row' }} spacing={2}><Box sx={{ flex: 1 }}><Typography sx={{ fontWeight: 700, mb: 1 }}>Approval gates</Typography><FormControlLabel control={<Switch checked={Boolean(policy.requireGmApproval)} onChange={(e) => setPolicyValue('requireGmApproval', e.target.checked)} />} label="GM approval" /><TextField fullWidth size="small" type="number" label="GM minimum amount" value={String(policy.gmMinAmount ?? 0)} onChange={(e) => setPolicyValue('gmMinAmount', Number(e.target.value) || 0)} sx={{ mb: 1.5 }} /><FormControlLabel control={<Switch checked={Boolean(policy.requireAuditVerification)} onChange={(e) => setPolicyValue('requireAuditVerification', e.target.checked)} />} label="Audit verification" /><TextField fullWidth size="small" type="number" label="Audit verification minimum amount" value={String(policy.auditVerificationMinAmount ?? 0)} onChange={(e) => setPolicyValue('auditVerificationMinAmount', Number(e.target.value) || 0)} /></Box><Box sx={{ flex: 1 }}><Typography sx={{ fontWeight: 700, mb: 1 }}>Management and receiving controls</Typography><FormControlLabel control={<Switch checked={Boolean(policy.requireManagementApproval)} onChange={(e) => setPolicyValue('requireManagementApproval', e.target.checked)} />} label="Management approval" /><TextField fullWidth size="small" type="number" label="Management minimum amount" value={String(policy.managementMinAmount ?? 0)} onChange={(e) => setPolicyValue('managementMinAmount', Number(e.target.value) || 0)} sx={{ mb: 1.5 }} /><FormControlLabel control={<Switch checked={Boolean(policy.requirePhysicalAudit)} onChange={(e) => setPolicyValue('requirePhysicalAudit', e.target.checked)} />} label="Physical receiving audit" /><TextField fullWidth size="small" type="number" label="Physical audit minimum amount" value={String(policy.physicalAuditMinAmount ?? 0)} onChange={(e) => setPolicyValue('physicalAuditMinAmount', Number(e.target.value) || 0)} sx={{ mb: 1.5 }} /><FormControlLabel control={<Switch checked={Boolean(policy.requireAuditClearance)} onChange={(e) => setPolicyValue('requireAuditClearance', e.target.checked)} />} label="Final audit clearance" /><TextField fullWidth size="small" type="number" label="Audit clearance minimum amount" value={String(policy.auditClearanceMinAmount ?? 0)} onChange={(e) => setPolicyValue('auditClearanceMinAmount', Number(e.target.value) || 0)} /></Box></Stack><TextField fullWidth multiline minRows={2} label="Policy notes" value={String(policy.notes || '')} onChange={(e) => setPolicyValue('notes', e.target.value)} /><Stack direction="row" sx={{ justifyContent: 'flex-end' }}><Button variant="contained" disabled={policyBusy} onClick={() => void savePolicy()}>{policyBusy ? 'Saving…' : 'Save policy'}</Button></Stack></> : <Alert severity="info">No approval policy is available for this company yet. The built-in approval chain will remain active until a manager saves a policy.</Alert>}
      </Stack> : activeModule ? <Stack spacing={1}>
        {filteredDocuments.map((row) => { const id = String(row.name || row.id || ''); const status = String(row.status || (Number(row.docstatus) === 1 ? 'Submitted' : 'Draft')); const party = String(row.supplierName || row.supplierId || row.partyName || row.partyId || ''); const amount = row.grandTotal ?? row.totalAmount ?? row.paidAmount ?? row.total ?? null; return <Box key={id} role="button" tabIndex={0} onClick={() => void openDocument(activeModule, row)} onKeyDown={(event) => { if (event.key === 'Enter') void openDocument(activeModule, row) }} sx={{ border: `1px solid ${colors.border.default}`, borderRadius: radii.md, p: 1.75, cursor: 'pointer', '&:hover': { borderColor: colors.slate[500] } }}><Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ alignItems: { md: 'center' } }}><Box sx={{ flex: 1 }}><Typography sx={{ fontWeight: 800 }}>{id || 'Unnamed document'}</Typography><Typography variant="caption">{party || 'No party'}{amount !== null ? ` · ${Number(amount).toLocaleString()} · ` : ' · '}{String(row.company || selectedCompanyId || '')}</Typography></Box><Chip size="small" label={status} color={statusColor(status)} />{['Draft', '0', 'Open'].includes(status) ? <Button size="small" variant="outlined" disabled={!id || busyId === id} onClick={(event) => { event.stopPropagation(); void submitDocument(activeModule, id) }}>Submit</Button> : null}</Stack></Box> })}
        {!filteredDocuments.length ? <Typography sx={{ color: colors.slate[500], py: 4, textAlign: 'center' }}>No records found for this company.</Typography> : null}
      </Stack> : tab === 'procurement' ? <Stack spacing={1}>
        {filteredCases.map((item) => <Box key={item.id} role="button" tabIndex={0} onClick={() => void openCase(item.id)} onKeyDown={(event) => { if (event.key === 'Enter') void openCase(item.id) }} sx={{ border: `1px solid ${colors.border.default}`, borderRadius: radii.md, p: 1.75, cursor: 'pointer', '&:hover': { borderColor: colors.accent.indigo, background: colors.bg.subtle } }}><Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ alignItems: { md: 'center' } }}><Box sx={{ flex: 1 }}><Typography sx={{ fontWeight: 800 }}>{item.title || item.id}</Typography><Typography variant="caption">{item.id} · {item.stage || 'Unstaged'} · {item.currentOwnerRole || item.owner || 'Unassigned'}{item.sourceName ? ` · Source: ${item.sourceName}` : ''}</Typography></Box>{item.approvalAmount ? <Typography variant="body2" sx={{ fontWeight: 700 }}>৳{Number(item.approvalAmount).toLocaleString()}</Typography> : null}{item.slaDueAt && new Date(item.slaDueAt).getTime() < Date.now() ? <Chip size="small" label="Escalated" color="error" /> : null}<Chip size="small" label={item.status || 'Open'} color={statusColor(item.status)} /><Button size="small" variant="outlined" onClick={(event) => { event.stopPropagation(); void openCase(item.id) }}>Open full process</Button></Stack></Box>)}
        {!filteredCases.length ? <Typography sx={{ color: colors.slate[500], py: 4, textAlign: 'center' }}>No procurement cases found for this company.</Typography> : null}
        {inbox.length ? <Alert icon={<AssignmentTurnedIn />} severity="info">{inbox.length} assigned procurement task{inbox.length === 1 ? '' : 's'} are visible in your queue. Open the case in the Workshop workflow to continue its audited transition.</Alert> : null}
      </Stack> : <Stack spacing={1}>
        {filteredClearances.map((item) => <Box key={item.id} sx={{ border: `1px solid ${colors.border.default}`, borderRadius: radii.md, p: 1.75 }}><Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'center' } }}><Box sx={{ flex: 1 }}><Typography sx={{ fontWeight: 800 }}>{item.type || 'Financial clearance'} · {item.appointmentId || item.id}</Typography><Typography variant="caption">Requested by {item.requestedByUserId || 'user'} · {item.requestedAt ? new Date(item.requestedAt).toLocaleString() : 'time unavailable'}{item.reviewedByUserId ? ` · Reviewed by ${item.reviewedByUserId}` : ''}</Typography></Box><Chip size="small" label={item.status || 'Requested'} color={statusColor(item.status)} /><Stack direction="row" spacing={.75}>{item.status === 'Requested' ? <><Button size="small" variant="contained" disabled={busyId === item.id} onClick={() => void review(item.id, 'approve')}>Approve</Button><Button size="small" color="error" variant="outlined" disabled={busyId === item.id} onClick={() => void review(item.id, 'reject')}>Reject</Button><Button size="small" variant="outlined" disabled={busyId === item.id} onClick={() => void review(item.id, 'return')}>Return</Button></> : null}</Stack></Stack></Box>)}
        {!filteredClearances.length ? <Typography sx={{ color: colors.slate[500], py: 4, textAlign: 'center' }}>No accounting clearances found for this company.</Typography> : null}
      </Stack>}
    </Box>
    <Dialog open={Boolean(selectedRecord || selectedCase)} onClose={() => { setSelectedRecord(null); setSelectedModule(null); setSelectedCase(null); setCaseActions([]) }} maxWidth={selectedCase ? 'lg' : 'md'} fullWidth><DialogTitle>{selectedCase ? `Full procurement process · ${String(selectedCase.id || '')}` : `${String(selectedRecord?.doctype || selectedModule || 'Document')} · ${String(selectedRecord?.id || selectedRecord?.name || '')}`}</DialogTitle><DialogContent dividers>{selectedCase ? <Stack spacing={2}><Typography variant="caption">One company-scoped process board for the complete request-to-payment journey. Actions are validated by role, approval policy, and current stage.</Typography>{detailLoading ? <CircularProgress size={22} /> : null}<Stepper activeStep={Math.max(0, ['Requested','Procurement Review','Quotation Collection','Compare Sheet Preparation','GM Approval','Audit Verification','Management Approval','PO Creation','Supplier Confirmation','Chalan / GRN','Audit Physical Review','Procurement File Completion','Audit Clearance','Actual Accounts','Reconciliation','Bill Settlement','Paid / Closed'].indexOf(String(selectedCase.currentStage || 'Requested')))} alternativeLabel sx={{ overflowX: 'auto', py: 1 }}>{['Request','Store review','Quotations','Compare','Approval','Audit','PO','Receipt','Accounts','Closed'].map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}</Stepper><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}><Chip label={String(selectedCase.currentStage || 'Requested')} color="info" /><Chip label={String(selectedCase.status || 'Open')} color={statusColor(String(selectedCase.status || 'Open'))} /><Chip label={`Amount: ${Number(selectedCase.approvalAmount || 0).toLocaleString()}`} /><Chip label={`Owner: ${String(selectedCase.currentOwnerRole || selectedCase.owner || 'Unassigned')}`} /></Stack><Box sx={{ ...cardSx, p: 1.5 }}><Typography sx={{ fontWeight: 800, mb: 1 }}>Process board</Typography><Stack spacing={1}>{PROCUREMENT_DEMO_STEPS.map((step, index) => { const completed = index < Math.min(PROCUREMENT_DEMO_STEPS.length - 1, Math.max(0, ['Requested','Procurement Review','Quotation Collection','Compare Sheet Preparation','GM Approval','Audit Verification','Management Approval','PO Creation','Supplier Confirmation','Chalan / GRN','Audit Physical Review','Procurement File Completion','Audit Clearance','Actual Accounts','Reconciliation','Bill Settlement','Paid / Closed'].indexOf(String(selectedCase.currentStage || 'Requested')))); const docMap = ['sourceName', 'materialRequestId', 'selectedSupplierQuotationId', 'compareSheetId', 'purchaseOrderId', 'purchaseReceiptId', 'purchaseInvoiceId', 'paymentEntryId']; const linked = selectedCase[docMap[index]] || (demoDataLoaded ? (['DEMO-MR-0001', 'DEMO-MR-0001', 'DEMO-QTN-0001', 'DEMO-CS-0001', 'DEMO-PO-0001', 'DEMO-GRN-0001', 'DEMO-PINV-0001', 'DEMO-PAY-0001'][index] || '') : ''); const policyText = index === 4 && policy ? ` · GM ≥ ৳${Number(policy.gmMinAmount || 0).toLocaleString()}${Boolean(policy.requireAuditVerification) ? `; audit ≥ ৳${Number(policy.auditVerificationMinAmount || 0).toLocaleString()}` : ''}${Boolean(policy.requireManagementApproval) ? `; management ≥ ৳${Number(policy.managementMinAmount || 0).toLocaleString()}` : ''}` : ''; return <Stack key={step.title} direction="row" spacing={1} sx={{ alignItems: 'center', borderBottom: `1px solid ${colors.border.subtle}`, pb: .75 }}><Chip size="small" label={completed ? 'Complete' : index === 0 ? 'Source' : 'Next'} color={completed ? 'success' : index === 0 ? 'info' : 'default'} /><Box sx={{ flex: 1 }}><Typography sx={{ fontWeight: 700 }}>{step.title}</Typography><Typography variant="caption">{step.role} · Required: {step.required}{policyText}{linked ? ` · ${String(linked)}` : ''}</Typography></Box></Stack>})}</Stack></Box><Box sx={{ ...cardSx, p: 1.5 }}><Typography sx={{ fontWeight: 800, mb: 1 }}>Available actions</Typography><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>{caseActions.map((action) => <Button key={action.action} variant={action.allowed ? 'contained' : 'outlined'} disabled={!action.allowed || busyId === selectedCase.id} title={action.disabledReason || undefined} onClick={() => void runCaseAction(action)}>{action.label}</Button>)}</Stack>{!caseActions.length ? <Typography variant="body2" sx={{ color: colors.slate[500] }}>No action is available at this stage for your role or the current checklist.</Typography> : null}</Box><Box sx={{ ...cardSx, p: 1.5 }}><Typography sx={{ fontWeight: 800, mb: 1 }}>Audit context</Typography><Typography variant="body2">Source: {String(selectedCase.sourceName || selectedCase.source || 'Workshop part request')}</Typography><Typography variant="body2">Last updated: {String(selectedCase.updatedAt || 'Not available')}</Typography><Typography variant="body2">All transitions, approvals, documents, and settlement entries remain linked to this case.</Typography></Box><Box component="pre" sx={{ m: 0, whiteSpace: 'pre-wrap', overflow: 'auto', fontFamily: 'monospace', fontSize: '.8rem', maxHeight: 160 }}>{JSON.stringify(selectedCase, null, 2)}</Box></Stack> : <Stack spacing={1.5}><Typography variant="caption">Company-scoped record · details are loaded from the audited backend.</Typography>{detailLoading ? <CircularProgress size={22} /> : null}{selectedModule === 'requisitions' && selectedRecord?.id ? <Button size="small" variant="outlined" onClick={() => void workshopApi.accountingWorkflow(String(selectedRecord?.id)).then((workflow) => setSelectedRecord({ ...selectedRecord, workflow }))}>Load linked workflow</Button> : null}<Stack direction="row" spacing={1}><Button size="small" variant="outlined" onClick={() => window.open(workshopApi.accountingPrintUrl(selectedModule || '', String(selectedRecord?.id || selectedRecord?.name || '')), '_blank', 'noopener,noreferrer')}>Print official document</Button>{selectedModule && ['Draft', '0', 'Open'].includes(String(selectedRecord?.status || (Number(selectedRecord?.docstatus) === 1 ? 'Submitted' : 'Draft'))) ? <Button size="small" variant="contained" onClick={() => { const id = String(selectedRecord?.id || selectedRecord?.name || ''); void submitDocument(selectedModule, id).then(() => setSelectedRecord(null)) }}>Submit</Button> : null}</Stack><Box component="pre" sx={{ m: 0, whiteSpace: 'pre-wrap', overflow: 'auto', fontFamily: 'monospace', fontSize: '.8rem' }}>{selectedRecord ? JSON.stringify(selectedRecord, null, 2) : ''}</Box></Stack>}</DialogContent></Dialog>
    <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth><DialogTitle>Create {tab === 'quotations' ? 'supplier quotation' : 'material requisition'}</DialogTitle><DialogContent dividers><Stack spacing={1.5} sx={{ pt: .5 }}><Typography variant="caption">Choose master records from the selected company. Search matches code, name, and type.</Typography><Autocomplete loading={mastersLoading} options={itemOptions} value={itemOptions.find((item) => item.id === createItemCode) || null} onChange={(_, value) => setCreateItemCode(value?.id || '')} getOptionLabel={(option) => option.secondary ? `${option.label} · ${option.secondary}` : option.label} isOptionEqualToValue={(option, value) => option.id === value.id} renderInput={(params) => <TextField {...params} required label="Item / part" autoFocus />} /><TextField label="Quantity" type="number" value={createQty} onChange={(event) => setCreateQty(event.target.value)} />{tab === 'quotations' ? <Autocomplete loading={mastersLoading} options={supplierOptions} value={supplierOptions.find((supplier) => supplier.id === createSupplier) || null} onChange={(_, value) => setCreateSupplier(value?.id || '')} getOptionLabel={(option) => option.secondary ? `${option.label} · ${option.secondary}` : option.label} isOptionEqualToValue={(option, value) => option.id === value.id} renderInput={(params) => <TextField {...params} required label="Supplier" />} /> : null}{tab === 'quotations' ? <TextField label="Rate" type="number" value={createRate} onChange={(event) => setCreateRate(event.target.value)} /> : null}<TextField label="Remarks / description" multiline minRows={2} value={createRemarks} onChange={(event) => setCreateRemarks(event.target.value)} /></Stack></DialogContent><DialogActions><Button onClick={() => setCreateOpen(false)}>Cancel</Button><Button variant="contained" disabled={createBusy || !createItemCode.trim() || (tab === 'quotations' && !createSupplier.trim())} onClick={() => void createDocument()}>{createBusy ? 'Creating…' : 'Create draft'}</Button></DialogActions></Dialog>
    <Dialog open={paymentOpen} onClose={() => setPaymentOpen(false)} maxWidth="sm" fullWidth><DialogTitle>New payment entry</DialogTitle><DialogContent dividers><Stack spacing={1.5} sx={{ pt: .5 }}><Typography variant="caption">Select ledger accounts and payment mode from the database. Bank payments require reference number and date on the accounting record.</Typography><TextField required label="Amount" type="number" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} /><Autocomplete options={supplierOptions} loading={mastersLoading} value={supplierOptions.find((item) => item.id === paymentParty) || null} onChange={(_, value) => setPaymentParty(value?.id || '')} getOptionLabel={(option) => option.label} isOptionEqualToValue={(option, value) => option.id === value.id} renderInput={(params) => <TextField {...params} label="Supplier (optional for internal transfer)" />} /><Autocomplete options={accountOptions} loading={mastersLoading} value={accountOptions.find((item) => item.id === paymentFrom) || null} onChange={(_, value) => setPaymentFrom(value?.id || '')} getOptionLabel={(option) => option.secondary ? `${option.label} · ${option.secondary}` : option.label} isOptionEqualToValue={(option, value) => option.id === value.id} renderInput={(params) => <TextField {...params} required label="Paid from account" />} /><Autocomplete options={accountOptions} loading={mastersLoading} value={accountOptions.find((item) => item.id === paymentTo) || null} onChange={(_, value) => setPaymentTo(value?.id || '')} getOptionLabel={(option) => option.secondary ? `${option.label} · ${option.secondary}` : option.label} isOptionEqualToValue={(option, value) => option.id === value.id} renderInput={(params) => <TextField {...params} required label="Paid to account" />} /><Autocomplete options={modeOptions} loading={mastersLoading} value={modeOptions.find((item) => item.id === paymentMode) || null} onChange={(_, value) => setPaymentMode(value?.id || '')} getOptionLabel={(option) => option.label} isOptionEqualToValue={(option, value) => option.id === value.id} renderInput={(params) => <TextField {...params} label="Mode of payment" />} /></Stack></DialogContent><DialogActions><Button onClick={() => setPaymentOpen(false)}>Cancel</Button><Button variant="contained" disabled={createBusy || !paymentAmount || !paymentFrom || !paymentTo} onClick={() => void createPayment()}>{createBusy ? 'Creating…' : 'Create payment draft'}</Button></DialogActions></Dialog>
    <Dialog open={compareOpen} onClose={() => setCompareOpen(false)} maxWidth="sm" fullWidth><DialogTitle>Create compare statement</DialogTitle><DialogContent dividers><Stack spacing={1}><Typography variant="caption">Select the supplier quotations to compare. The backend will snapshot the quotations and link the statement to the originating procurement case.</Typography>{documents.quotations.map((row) => { const id = String(row.name || row.id || ''); const selected = compareSelection.includes(id); return <Stack key={id} direction="row" spacing={1} sx={{ alignItems: 'center', borderBottom: `1px solid ${colors.border.subtle}`, py: .5 }}><Checkbox checked={selected} onChange={() => setCompareSelection((current) => selected ? current.filter((value) => value !== id) : [...current, id])} /><Box><Typography sx={{ fontWeight: 700 }}>{id}</Typography><Typography variant="caption">{String(row.supplierName || row.supplierId || 'Supplier')} · {Number(row.grandTotal || row.totalAmount || 0).toLocaleString()}</Typography></Box></Stack>})}{!documents.quotations.length ? <Typography sx={{ color: colors.slate[500] }}>Create supplier quotations before preparing a compare statement.</Typography> : null}</Stack></DialogContent><DialogActions><Button onClick={() => setCompareOpen(false)}>Cancel</Button><Button variant="contained" disabled={createBusy || compareSelection.length === 0} onClick={() => void createCompareSheet()}>{createBusy ? 'Creating…' : 'Create compare statement'}</Button></DialogActions></Dialog>
    <Dialog open={demoOpen} onClose={() => setDemoOpen(false)} maxWidth="md" fullWidth><DialogTitle>Continental Works parts procurement walkthrough</DialogTitle><DialogContent dividers><Typography variant="body2" sx={{ color: colors.slate[600], mb: 2 }}>This guided walkthrough is presentation-only. It does not create or alter operational records.</Typography><Stepper activeStep={demoStep} alternativeLabel sx={{ mb: 3, overflowX: 'auto' }}>{PROCUREMENT_DEMO_STEPS.map((step) => <Step key={step.title}><StepLabel>{step.title}</StepLabel></Step>)}</Stepper><Box sx={{ ...cardSx, p: 2 }}><Typography variant="overline" sx={{ color: colors.slate[500], fontWeight: 800 }}>Step {demoStep + 1} · {PROCUREMENT_DEMO_STEPS[demoStep].role}</Typography><Typography variant="h6" sx={{ fontWeight: 800, mt: .5 }}>{PROCUREMENT_DEMO_STEPS[demoStep].title}</Typography><Typography sx={{ color: colors.slate[700], mt: 1 }}>{PROCUREMENT_DEMO_STEPS[demoStep].detail}</Typography><Chip label={demoStep === PROCUREMENT_DEMO_STEPS.length - 1 ? 'Complete procurement-to-payment cycle' : 'Next operational handoff'} color={demoStep === PROCUREMENT_DEMO_STEPS.length - 1 ? 'success' : 'info'} sx={{ mt: 2 }} /></Box></DialogContent><DialogActions><Button onClick={() => setDemoOpen(false)}>Close</Button><Button disabled={demoStep === 0} onClick={() => setDemoStep((step) => Math.max(0, step - 1))}>Back</Button><Button variant="contained" disabled={demoStep === PROCUREMENT_DEMO_STEPS.length - 1} onClick={() => setDemoStep((step) => Math.min(PROCUREMENT_DEMO_STEPS.length - 1, step + 1))}>Next</Button></DialogActions></Dialog>
  </Box>
}
