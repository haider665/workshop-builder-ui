import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Box, Button, Chip, CircularProgress, Divider, Stack, Tab, Tabs, TextField, Typography } from '@mui/material'
import { AccountBalance, AssignmentTurnedIn, Refresh, ShoppingCart } from '@mui/icons-material'
import { workshopApi } from '../../services/workshopApi'
import { useCompanyStore } from '../../store/companyStore'
import { colors, pageLayout, radii, shadows } from '../../theme/tokens'

type TabId = 'procurement' | 'accounting'

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
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

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
      <Tabs value={tab} onChange={(_, value: TabId) => { setTab(value); setQuery('') }}><Tab value="procurement" icon={<ShoppingCart />} iconPosition="start" label="Procurement queue" /><Tab value="accounting" icon={<AccountBalance />} iconPosition="start" label="Accounting clearances" /></Tabs>
      <Divider sx={{ mb: 2 }} />
      <TextField fullWidth size="small" label="Search permitted records" value={query} onChange={(event) => setQuery(event.target.value)} sx={{ mb: 2 }} />
      {loading ? <Stack sx={{ py: 6, alignItems: 'center' }}><CircularProgress size={28} /></Stack> : tab === 'procurement' ? <Stack spacing={1}>
        {filteredCases.map((item) => <Box key={item.id} sx={{ border: `1px solid ${colors.border.default}`, borderRadius: radii.md, p: 1.75 }}><Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ alignItems: { md: 'center' } }}><Box sx={{ flex: 1 }}><Typography sx={{ fontWeight: 800 }}>{item.title || item.id}</Typography><Typography variant="caption">{item.id} · {item.stage || 'Unstaged'} · Owner: {item.owner || 'Unassigned'}</Typography></Box><Chip size="small" label={item.status || 'Open'} color={statusColor(item.status)} /></Stack></Box>)}
        {!filteredCases.length ? <Typography sx={{ color: colors.slate[500], py: 4, textAlign: 'center' }}>No procurement cases found for this company.</Typography> : null}
        {inbox.length ? <Alert icon={<AssignmentTurnedIn />} severity="info">{inbox.length} assigned procurement task{inbox.length === 1 ? '' : 's'} are visible in your queue. Open the case in the Workshop workflow to continue its audited transition.</Alert> : null}
      </Stack> : <Stack spacing={1}>
        {filteredClearances.map((item) => <Box key={item.id} sx={{ border: `1px solid ${colors.border.default}`, borderRadius: radii.md, p: 1.75 }}><Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'center' } }}><Box sx={{ flex: 1 }}><Typography sx={{ fontWeight: 800 }}>{item.type || 'Financial clearance'} · {item.appointmentId || item.id}</Typography><Typography variant="caption">Requested by {item.requestedByUserId || 'user'} · {item.requestedAt ? new Date(item.requestedAt).toLocaleString() : 'time unavailable'}{item.reviewedByUserId ? ` · Reviewed by ${item.reviewedByUserId}` : ''}</Typography></Box><Chip size="small" label={item.status || 'Requested'} color={statusColor(item.status)} /><Stack direction="row" spacing={.75}>{item.status === 'Requested' ? <><Button size="small" variant="contained" disabled={busyId === item.id} onClick={() => void review(item.id, 'approve')}>Approve</Button><Button size="small" color="error" variant="outlined" disabled={busyId === item.id} onClick={() => void review(item.id, 'reject')}>Reject</Button><Button size="small" variant="outlined" disabled={busyId === item.id} onClick={() => void review(item.id, 'return')}>Return</Button></> : null}</Stack></Stack></Box>)}
        {!filteredClearances.length ? <Typography sx={{ color: colors.slate[500], py: 4, textAlign: 'center' }}>No accounting clearances found for this company.</Typography> : null}
      </Stack>}
    </Box>
  </Box>
}
