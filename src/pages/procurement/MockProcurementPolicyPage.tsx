import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  MenuItem,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { ArrowBack, Tune } from '@mui/icons-material'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SectionCard } from '../../components/SectionCard'
import { workshopApi } from '../../services/workshopApi'
import { useCompanyStore } from '../../store/companyStore'
import { colors, radii, shadows } from '../../theme/tokens'
import type {
  ProcurementApprovalPolicy,
  ProcurementApprovalStep,
  ProcurementPolicyPreview,
} from '../../types/procurementWorkflow'

type PreviewForm = {
  amount: number
  procurementType: 'Local' | 'Foreign'
  vendorRoute: 'Enlisted Vendor' | 'Non-enlisted Vendor' | 'Single Vendor'
  supplierCount: number
}

const defaultPreviewForm: PreviewForm = {
  amount: 50000,
  procurementType: 'Local',
  vendorRoute: 'Enlisted Vendor',
  supplierCount: 2,
}

export function MockProcurementPolicyPage() {
  const navigate = useNavigate()
  const selectedCompanyId = useCompanyStore((state) => state.selectedCompanyId)
  const companies = useCompanyStore((state) => state.companies)
  const [policy, setPolicy] = useState<ProcurementApprovalPolicy | null>(null)
  const [previewForm, setPreviewForm] = useState<PreviewForm>(defaultPreviewForm)
  const [preview, setPreview] = useState<ProcurementPolicyPreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const companyName = companies.find((company) => company.id === selectedCompanyId)?.name || selectedCompanyId

  const refreshPreview = useCallback(async (next?: ProcurementPolicyPreview | null) => {
    if (!selectedCompanyId) return
    const result = next || await workshopApi.procurementApprovalPolicyPreview(
      selectedCompanyId,
      Number(previewForm.amount) || 0,
      previewForm.procurementType,
      previewForm.vendorRoute,
      Number(previewForm.supplierCount) || 1,
    )
    setPreview(result)
  }, [selectedCompanyId, previewForm])

  useEffect(() => {
    if (!selectedCompanyId) return
    let cancelled = false
    setLoading(true)
    void workshopApi.procurementApprovalPolicies(selectedCompanyId)
      .then((result) => {
        if (cancelled) return
        setPolicy(result.data?.[0] || result.defaults?.[0] || null)
      })
      .catch((cause) => {
        if (!cancelled) setMessage(cause instanceof Error ? cause.message : 'Unable to load procurement policy')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [selectedCompanyId])

  useEffect(() => {
    void refreshPreview()
  }, [refreshPreview])

  function setPolicyValue<K extends keyof ProcurementApprovalPolicy>(key: K, value: ProcurementApprovalPolicy[K]) {
    setPolicy((current) => (current ? { ...current, [key]: value } : current))
  }

  function setStepValue<K extends keyof ProcurementApprovalStep>(index: number, key: K, value: ProcurementApprovalStep[K]) {
    setPolicy((current) => {
      if (!current) return current
      const steps = [...(current.approvalSteps || [])]
      steps[index] = { ...steps[index], [key]: value }
      return { ...current, approvalSteps: steps }
    })
  }

  function addStep() {
    setPolicy((current) => {
      if (!current) return current
      const steps = [...(current.approvalSteps || [])]
      steps.push({
        stage: 'GM Approval',
        authorizedUserId: '',
        minAmount: 0,
        sequence: steps.length + 1,
        acknowledgement: '',
      })
      return { ...current, approvalSteps: steps }
    })
  }

  function removeStep(index: number) {
    setPolicy((current) => {
      if (!current) return current
      const steps = (current.approvalSteps || []).filter((_, stepIndex) => stepIndex !== index)
      return { ...current, approvalSteps: steps.map((step, stepIndex) => ({ ...step, sequence: stepIndex + 1 })) }
    })
  }

  async function save() {
    if (!selectedCompanyId || !policy) return
    setBusy(true)
    setMessage(null)
    try {
      const saved = await workshopApi.saveProcurementApprovalPolicy({ ...policy, companyId: selectedCompanyId })
      setPolicy(saved)
      await refreshPreview()
      setMessage('Policy saved. Mock procurement cases now use these live settings.')
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Unable to save procurement policy')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
      <Snackbar open={Boolean(message)} onClose={() => setMessage(null)} autoHideDuration={4000} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={() => setMessage(null)} severity="info" variant="filled" sx={{ width: '100%' }}>{message}</Alert>
      </Snackbar>
      <Stack spacing={3}>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Button startIcon={<ArrowBack />} onClick={() => navigate('/mock-procurement/pipeline')} sx={{ fontWeight: 700, textTransform: 'none' }}>Back to Pipeline</Button>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.3rem', md: '1.6rem' }, color: colors.slate[900], letterSpacing: '-0.02em' }}>
              CWL Parts Procurement Policy
            </Typography>
            <Typography sx={{ fontSize: '0.85rem', color: colors.slate[500] }}>
              Live company policy · {companyName || 'No company selected'}
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<Tune />} disabled={!policy || busy || !selectedCompanyId} onClick={() => void save()} sx={{ fontWeight: 700, textTransform: 'none', borderRadius: radii.sm }}>
            {busy ? 'Saving…' : 'Save policy'}
          </Button>
        </Stack>

        {loading ? (
          <Alert severity="info">Loading company policy…</Alert>
        ) : !policy ? (
          <Alert severity="warning">No policy is available for this company. Select a company or save a policy to activate mock-route routing.</Alert>
        ) : (
          <>
            <SectionCard title="Live route preview" icon={<Tune />} collapsible={false}>
              <Stack spacing={2} sx={{ p: 2 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                  <TextField size="small" type="number" label="Case amount" value={previewForm.amount} onChange={(event) => setPreviewForm((current) => ({ ...current, amount: Number(event.target.value) || 0 }))} sx={{ minWidth: 160 }} />
                  <TextField select size="small" label="Procurement type" value={previewForm.procurementType} onChange={(event) => setPreviewForm((current) => ({ ...current, procurementType: event.target.value as PreviewForm['procurementType'] }))} sx={{ minWidth: 160 }}>
                    <MenuItem value="Local">Local</MenuItem>
                    <MenuItem value="Foreign">Foreign</MenuItem>
                  </TextField>
                  <TextField select size="small" label="Vendor route" value={previewForm.vendorRoute} onChange={(event) => setPreviewForm((current) => ({ ...current, vendorRoute: event.target.value as PreviewForm['vendorRoute'] }))} sx={{ minWidth: 200 }}>
                    <MenuItem value="Enlisted Vendor">Enlisted Vendor</MenuItem>
                    <MenuItem value="Non-enlisted Vendor">Non-enlisted Vendor</MenuItem>
                    <MenuItem value="Single Vendor">Single Vendor</MenuItem>
                  </TextField>
                  <TextField size="small" type="number" label="Supplier count" value={previewForm.supplierCount} onChange={(event) => setPreviewForm((current) => ({ ...current, supplierCount: Number(event.target.value) || 1 }))} sx={{ minWidth: 150 }} />
                </Stack>
                <Alert severity={preview?.skippedStages?.length ? 'info' : 'success'}>
                  <Typography sx={{ fontWeight: 700, mb: 0.5 }}>Required stages: {preview?.requiredStages?.join(' → ') || 'None'}</Typography>
                  <Typography sx={{ fontWeight: 700 }}>Skipped by policy: {preview?.skippedStages?.join(', ') || 'None'}</Typography>
                  {preview?.singleVendorCsSkipped ? <Typography sx={{ mt: 0.5, fontWeight: 700 }}>Single-vendor foreign CS is skipped by policy.</Typography> : null}
                </Alert>
              </Stack>
            </SectionCard>

            <SectionCard title="Policy acknowledgement and route thresholds" collapsible={false}>
              <Stack spacing={2} sx={{ p: 2 }}>
                <FormControlLabel control={<Switch checked={Boolean(policy.enabled)} onChange={(event) => setPolicyValue('enabled', event.target.checked)} />} label="Policy enabled" />
                <TextField fullWidth size="small" multiline minRows={2} label="Acknowledgement shown on cases" value={String(policy.acknowledgement || '')} onChange={(event) => setPolicyValue('acknowledgement', event.target.value)} />
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                  <TextField fullWidth size="small" type="number" label="Local enlisted CS minimum" value={String(policy.localEnlistedCsMinAmount ?? 0)} onChange={(event) => setPolicyValue('localEnlistedCsMinAmount', Number(event.target.value) || 0)} />
                  <TextField fullWidth size="small" type="number" label="Local enlisted management minimum" value={String(policy.localEnlistedManagementMinAmount ?? 0)} onChange={(event) => setPolicyValue('localEnlistedManagementMinAmount', Number(event.target.value) || 0)} />
                  <TextField fullWidth size="small" type="number" label="Local non-enlisted CS minimum" value={String(policy.localNonEnlistedCsMinAmount ?? 0)} onChange={(event) => setPolicyValue('localNonEnlistedCsMinAmount', Number(event.target.value) || 0)} />
                  <TextField fullWidth size="small" type="number" label="Local non-enlisted management minimum" value={String(policy.localNonEnlistedManagementMinAmount ?? 0)} onChange={(event) => setPolicyValue('localNonEnlistedManagementMinAmount', Number(event.target.value) || 0)} />
                </Stack>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                  <TextField fullWidth size="small" type="number" label="Foreign CS minimum" value={String(policy.foreignCsMinAmount ?? 0)} onChange={(event) => setPolicyValue('foreignCsMinAmount', Number(event.target.value) || 0)} />
                  <TextField fullWidth size="small" type="number" label="Foreign management minimum" value={String(policy.foreignManagementMinAmount ?? 0)} onChange={(event) => setPolicyValue('foreignManagementMinAmount', Number(event.target.value) || 0)} />
                  <FormControlLabel control={<Switch checked={policy.skipForeignCsSingleVendor !== false} onChange={(event) => setPolicyValue('skipForeignCsSingleVendor', event.target.checked)} />} label="Skip foreign CS for single vendor" />
                </Stack>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                  <TextField fullWidth size="small" type="number" label="Advance payment minimum" value={String(policy.advanceMinAmount ?? 0)} onChange={(event) => setPolicyValue('advanceMinAmount', Number(event.target.value) || 0)} />
                  <TextField fullWidth size="small" type="number" label="Escalation timer (minutes)" value={String(policy.escalationMinutes ?? 10)} onChange={(event) => setPolicyValue('escalationMinutes', Number(event.target.value) || 10)} />
                  <TextField fullWidth size="small" type="number" label="Audit verification minimum" value={String(policy.auditVerificationMinAmount ?? 0)} onChange={(event) => setPolicyValue('auditVerificationMinAmount', Number(event.target.value) || 0)} />
                  <TextField fullWidth size="small" type="number" label="Management approval minimum" value={String(policy.managementMinAmount ?? 0)} onChange={(event) => setPolicyValue('managementMinAmount', Number(event.target.value) || 0)} />
                </Stack>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                  <FormControlLabel control={<Switch checked={Boolean(policy.specialCaseEnabled)} onChange={(event) => setPolicyValue('specialCaseEnabled', event.target.checked)} />} label="Special case routing" />
                  <TextField fullWidth size="small" type="number" label="Special-case minimum" value={String(policy.specialCaseMinAmount ?? 0)} onChange={(event) => setPolicyValue('specialCaseMinAmount', Number(event.target.value) || 0)} />
                  <TextField fullWidth size="small" label="Special-case approver user ID" value={String(policy.specialCaseApprover || '')} onChange={(event) => setPolicyValue('specialCaseApprover', event.target.value)} />
                  <TextField fullWidth size="small" label="Special-case audit approver user ID" value={String(policy.specialCaseAuditApprover || '')} onChange={(event) => setPolicyValue('specialCaseAuditApprover', event.target.value)} />
                </Stack>
              </Stack>
            </SectionCard>

            <SectionCard title="Approval steps" actions={<Button size="small" onClick={addStep}>Add step</Button>} collapsible={false}>
              <Stack spacing={1.5} sx={{ p: 2 }}>
                {!(policy.approvalSteps || []).length ? (
                  <Typography sx={{ color: colors.slate[600], fontSize: '0.85rem' }}>No named steps configured. Role-based routing remains active.</Typography>
                ) : (policy.approvalSteps || []).map((step, index) => (
                  <Stack key={`${step.stage}-${index}`} direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ p: 1.5, borderRadius: radii.sm, bgcolor: colors.slate[50] }}>
                    <TextField select size="small" label="Stage" value={step.stage} onChange={(event) => setStepValue(index, 'stage', event.target.value)} sx={{ minWidth: 180 }}>
                      <MenuItem value="Audit Verification">Audit Verification</MenuItem>
                      <MenuItem value="GM Approval">GM Approval</MenuItem>
                      <MenuItem value="Management Approval">Management Approval</MenuItem>
                    </TextField>
                    <TextField fullWidth size="small" label="Authorized user ID" value={String(step.authorizedUserId || '')} onChange={(event) => setStepValue(index, 'authorizedUserId', event.target.value)} />
                    <TextField size="small" type="number" label="Minimum amount" value={String(step.minAmount ?? 0)} onChange={(event) => setStepValue(index, 'minAmount', Number(event.target.value) || 0)} sx={{ minWidth: 150 }} />
                    <TextField size="small" type="number" label="Sequence" value={String(step.sequence ?? index + 1)} onChange={(event) => setStepValue(index, 'sequence', Number(event.target.value) || index + 1)} sx={{ minWidth: 110 }} />
                    <Button size="small" color="error" onClick={() => removeStep(index)}>Remove</Button>
                  </Stack>
                ))}
              </Stack>
            </SectionCard>

            <SectionCard title="Receiving, returns, and notes" collapsible={false}>
              <Stack spacing={2} sx={{ p: 2 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ flexWrap: 'wrap' }}>
                  <FormControlLabel control={<Switch checked={policy.allowDeliveredProductSelection !== false} onChange={(event) => setPolicyValue('allowDeliveredProductSelection', event.target.checked)} />} label="Delivered product selection" />
                  <FormControlLabel control={<Switch checked={policy.allowPartialReceive !== false} onChange={(event) => setPolicyValue('allowPartialReceive', event.target.checked)} />} label="Partial receipt" />
                  <FormControlLabel control={<Switch checked={policy.allowSingleProductReturn !== false} onChange={(event) => setPolicyValue('allowSingleProductReturn', event.target.checked)} />} label="Single-product return" />
                  <FormControlLabel control={<Switch checked={policy.allowIndividualItemReturn !== false} onChange={(event) => setPolicyValue('allowIndividualItemReturn', event.target.checked)} />} label="Individual-item return" />
                  <FormControlLabel control={<Switch checked={policy.allowCreditNoteReturn !== false} onChange={(event) => setPolicyValue('allowCreditNoteReturn', event.target.checked)} />} label="Credit-note return" />
                  <FormControlLabel control={<Switch checked={policy.allowDirectReturn !== false} onChange={(event) => setPolicyValue('allowDirectReturn', event.target.checked)} />} label="Direct return" />
                </Stack>
                <TextField fullWidth size="small" multiline minRows={2} label="Policy notes" value={String(policy.notes || '')} onChange={(event) => setPolicyValue('notes', event.target.value)} />
                <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
                  <Button variant="contained" disabled={busy} onClick={() => void save()} sx={{ fontWeight: 700, textTransform: 'none', borderRadius: radii.sm, boxShadow: shadows.card }}>
                    {busy ? 'Saving…' : 'Save policy'}
                  </Button>
                </Stack>
              </Stack>
            </SectionCard>
          </>
        )}
      </Stack>
    </Box>
  )
}
