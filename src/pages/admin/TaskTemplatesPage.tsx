import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  Add,
  ArrowDownward,
  ArrowUpward,
  Delete,
  Edit,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material'
import { useEffect, useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { Page } from '../../components/Page'
import { DataTable, type Column } from '../../components/DataTable'
import { FormDialog } from '../../components/FormDialog'
import { colors, radii, shadows } from '../../theme/tokens'
import type {
  CWShop,
  CWTaskField,
  CWTaskFieldType,
  CWTaskTemplate,
  CWTaskTemplateStatus,
} from '../../types/cw'
import { shopsService } from '../../services/admin/shopsService'
import { taskTemplatesService } from '../../services/admin/taskTemplatesService'

const FIELD_TYPES: CWTaskFieldType[] = [
  'Text Input',
  'Text Area',
  'Number',
  'Checkbox',
  'Checkbox Group',
  'Radio Button Group',
  'Dropdown',
  'Date Picker',
  'Image Upload',
  'File Upload',
]

const btnSx = {
  bgcolor: colors.slate[900],
  fontWeight: 600,
  borderRadius: '10px',
  px: 2.5,
  '&:hover': { bgcolor: colors.slate[800] },
} as const

function statusChip(status: CWTaskTemplateStatus) {
  if (status === 'Active') return <Chip size="small" color="success" label="Active" />
  return <Chip size="small" color="default" label="Inactive" />
}

function parseOptions(text: string) {
  return text.split('\n').map((l) => l.trim()).filter(Boolean)
}

function optionsSummary(field: CWTaskField) {
  if (!field.options?.length) return '—'
  return field.options.join(', ')
}

type TemplateDraft = {
  shopId: string
  name: string
  description: string
  status: CWTaskTemplateStatus
}

function toTemplateDraft(shopId: string, t?: CWTaskTemplate): TemplateDraft {
  return {
    shopId: t?.shopId ?? shopId,
    name: t?.name ?? '',
    description: t?.description ?? '',
    status: t?.status ?? 'Active',
  }
}

type FieldDraft = {
  label: string
  type: CWTaskFieldType
  required: boolean
  optionsText: string
}

function toFieldDraft(f?: CWTaskField): FieldDraft {
  return {
    label: f?.label ?? '',
    type: f?.type ?? 'Text Input',
    required: f?.required ?? false,
    optionsText: (f?.options ?? []).join('\n'),
  }
}

function needsOptions(type: CWTaskFieldType) {
  return type === 'Checkbox Group' || type === 'Radio Button Group' || type === 'Dropdown'
}

function PreviewField(props: { field: CWTaskField }) {
  const f = props.field

  if (f.type === 'Text Input') return <TextField label={f.label} required={f.required} fullWidth />
  if (f.type === 'Text Area') return <TextField label={f.label} required={f.required} fullWidth multiline minRows={3} />
  if (f.type === 'Number') return <TextField label={f.label} required={f.required} fullWidth type="number" />
  if (f.type === 'Checkbox') return <FormControlLabel control={<Switch />} label={f.label + (f.required ? ' *' : '')} />
  if (f.type === 'Checkbox Group') {
    return (
      <Stack spacing={1}>
        <Typography sx={{ fontWeight: 700 }}>{f.label}{f.required ? ' *' : ''}</Typography>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
          {(f.options ?? []).map((o) => <Chip key={o} label={o} variant="outlined" />)}
        </Stack>
      </Stack>
    )
  }
  if (f.type === 'Radio Button Group') {
    return (
      <TextField label={f.label} required={f.required} fullWidth select helperText="Preview: radio group rendered as a single-select here">
        {(f.options ?? []).map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
      </TextField>
    )
  }
  if (f.type === 'Dropdown') {
    return <TextField label={f.label} required={f.required} fullWidth select>{(f.options ?? []).map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}</TextField>
  }
  if (f.type === 'Date Picker') {
    return <TextField label={f.label} required={f.required} fullWidth type="date" slotProps={{ inputLabel: { shrink: true } }} />
  }
  if (f.type === 'Image Upload') {
    return <Stack spacing={1}><Typography sx={{ fontWeight: 700 }}>{f.label}{f.required ? ' *' : ''}</Typography><Button variant="outlined" component="label">Choose image<input hidden type="file" accept="image/*" /></Button></Stack>
  }
  if (f.type === 'File Upload') {
    return <Stack spacing={1}><Typography sx={{ fontWeight: 700 }}>{f.label}{f.required ? ' *' : ''}</Typography><Button variant="outlined" component="label">Choose file<input hidden type="file" /></Button></Stack>
  }
  return null
}

export function TaskTemplatesPage() {
  const [shops, setShops] = useState<CWShop[]>([])
  const [taskTemplates, setTaskTemplates] = useState<CWTaskTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const [shopId, setShopId] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')

  const [createOpen, setCreateOpen] = useState(false)
  const [editTemplate, setEditTemplate] = useState<CWTaskTemplate | null>(null)
  const [templateDraft, setTemplateDraft] = useState<TemplateDraft>(toTemplateDraft(''))

  const [addFieldOpen, setAddFieldOpen] = useState(false)
  const [editField, setEditField] = useState<CWTaskField | null>(null)
  const [fieldDraft, setFieldDraft] = useState<FieldDraft>(toFieldDraft())

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [shopData, templateData] = await Promise.all([shopsService.list(), taskTemplatesService.list()])
        if (!active) return
        setShops(shopData)
        setTaskTemplates(templateData)
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load task templates')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [])

  const hasShops = shops.length > 0
  const effectiveShopId = shopId || shops[0]?.id || ''
  const templatesForShop = useMemo(() => {
    return taskTemplates
      .filter((t) => t.shopId === effectiveShopId)
      .slice()
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === 'Active' ? -1 : 1
        return a.name.localeCompare(b.name)
      })
  }, [taskTemplates, effectiveShopId])
  const effectiveSelectedTemplateId = selectedTemplateId || templatesForShop[0]?.id || ''
  const selectedTemplate = templatesForShop.find((t) => t.id === effectiveSelectedTemplateId) ?? null
  const selectedShop = shops.find((s) => s.id === effectiveShopId) ?? null
  const sortedFields = useMemo(() => (selectedTemplate?.fields ?? []).slice().sort((a, b) => a.order - b.order), [selectedTemplate])

  function openCreateTemplate() {
    setError(null)
    setTemplateDraft(toTemplateDraft(effectiveShopId))
    setCreateOpen(true)
  }

  async function submitCreateTemplate() {
    try {
      setSaving(true)
      setError(null)
      const created = await taskTemplatesService.create({
        shopId: templateDraft.shopId,
        name: templateDraft.name,
        description: templateDraft.description,
        status: templateDraft.status,
      })
      setTaskTemplates((current) => [created, ...current.filter((t) => t.id !== created.id)])
      setCreateOpen(false)
      setSelectedTemplateId(created.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  function openEditTemplateDialog(t: CWTaskTemplate) {
    setError(null)
    setEditTemplate(t)
    setTemplateDraft(toTemplateDraft(effectiveShopId, t))
  }

  async function submitEditTemplate() {
    if (!editTemplate) return
    try {
      setSaving(true)
      setError(null)
      const updated = await taskTemplatesService.update(editTemplate.id, {
        shopId: templateDraft.shopId,
        name: templateDraft.name,
        description: templateDraft.description,
        status: templateDraft.status,
      })
      setTaskTemplates((current) => current.map((t) => (t.id === updated.id ? updated : t)))
      setEditTemplate(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  async function toggleTemplateStatus(t: CWTaskTemplate) {
    try {
      setSaving(true)
      setError(null)
      const updated = await taskTemplatesService.setStatus(t.id, t.status === 'Active' ? 'Inactive' : 'Active')
      setTaskTemplates((current) => current.map((item) => (item.id === updated.id ? updated : item)))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  function openAddField() {
    if (!selectedTemplate) return
    setError(null)
    setFieldDraft(toFieldDraft())
    setAddFieldOpen(true)
  }

  async function submitAddField() {
    if (!selectedTemplate) return
    try {
      setSaving(true)
      setError(null)
      await taskTemplatesService.addField(selectedTemplate.id, {
        label: fieldDraft.label,
        type: fieldDraft.type,
        required: fieldDraft.required,
        options: needsOptions(fieldDraft.type) ? parseOptions(fieldDraft.optionsText) : undefined,
      })
      const refreshed = await taskTemplatesService.list()
      setTaskTemplates(refreshed)
      setAddFieldOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  function openEditFieldDialog(f: CWTaskField) {
    setError(null)
    setEditField(f)
    setFieldDraft(toFieldDraft(f))
  }

  async function submitEditField() {
    if (!selectedTemplate || !editField) return
    try {
      setSaving(true)
      setError(null)
      const updated = await taskTemplatesService.updateField(selectedTemplate.id, editField.id, {
        label: fieldDraft.label,
        type: fieldDraft.type,
        required: fieldDraft.required,
        options: needsOptions(fieldDraft.type) ? parseOptions(fieldDraft.optionsText) : undefined,
      })
      setTaskTemplates((current) => current.map((t) => (t.id === updated.id ? updated : t)))
      setEditField(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  async function removeField(f: CWTaskField) {
    if (!selectedTemplate) return
    try {
      setSaving(true)
      setError(null)
      const updated = await taskTemplatesService.removeField(selectedTemplate.id, f.id)
      setTaskTemplates((current) => current.map((t) => (t.id === updated.id ? updated : t)))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  async function moveField(f: CWTaskField, dir: 'up' | 'down') {
    if (!selectedTemplate) return
    try {
      setSaving(true)
      setError(null)
      const updated = await taskTemplatesService.moveField(selectedTemplate.id, f.id, dir)
      setTaskTemplates((current) => current.map((t) => (t.id === updated.id ? updated : t)))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  /* ── Field table columns for DataTable ── */
  const fieldColumns: Column<CWTaskField>[] = useMemo(() => [
    {
      header: '#',
      key: 'order',
      render: (_row, index) => (
        <Typography sx={{ fontWeight: 600, color: colors.slate[500], fontSize: '0.8rem' }}>
          {index + 1}
        </Typography>
      ),
      minWidth: 40,
    },
    {
      header: 'Label',
      key: 'label',
      render: (row) => (
        <Box>
          <Typography sx={{ fontWeight: 700, color: colors.slate[900], fontSize: '0.875rem' }}>{row.label}</Typography>
          <Typography sx={{ color: colors.slate[500], fontSize: '0.7rem' }}>{row.id}</Typography>
        </Box>
      ),
      minWidth: 140,
    },
    {
      header: 'Type',
      key: 'type',
      render: (row) => (
        <Typography sx={{ color: colors.slate[900], fontSize: '0.875rem' }}>{row.type}</Typography>
      ),
    },
    {
      header: 'Required',
      key: 'required',
      render: (row) =>
        row.required
          ? <Chip size="small" color="warning" label="Yes" />
          : <Chip size="small" label="No" />,
    },
    {
      header: 'Options',
      key: 'options',
      render: (row) => (
        <Typography sx={{ color: colors.slate[500], fontSize: '0.8rem', maxWidth: 420 }}>
          {optionsSummary(row)}
        </Typography>
      ),
    },
    {
      header: 'Actions',
      key: 'actions',
      align: 'right' as const,
      render: (row, index) => (
        <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
          <Tooltip title="Move up">
            <span>
              <IconButton onClick={() => void moveField(row, 'up')} disabled={index === 0 || saving}>
                <ArrowUpward fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Move down">
            <span>
              <IconButton onClick={() => void moveField(row, 'down')} disabled={index === sortedFields.length - 1 || saving}>
                <ArrowDownward fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton onClick={() => openEditFieldDialog(row)} disabled={saving}>
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Remove">
            <IconButton onClick={() => void removeField(row)} disabled={saving}>
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ], [sortedFields.length, saving])

  /* ── No shops guard ── */
  if (!hasShops) {
    return (
      <Page title="Admin / Task Templates" subtitle="Build task templates and dynamic forms.">
        <Paper
          sx={{
            p: 4,
            border: `1px solid ${colors.border.default}`,
            borderRadius: radii.lg,
            boxShadow: shadows.card,
          }}
        >
          <Stack spacing={1.5}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: colors.slate[900] }}>Create a shop first</Typography>
            <Typography sx={{ color: colors.slate[500] }}>Task templates belong to a shop. Create at least one shop to continue.</Typography>
            <Box>
              <Button variant="contained" component={RouterLink} to="/admin/shops" sx={btnSx}>Go to Shops</Button>
            </Box>
          </Stack>
        </Paper>
      </Page>
    )
  }

  /* ── Template form fields (shared between create & edit dialogs) ── */
  const templateFormFields = (
    <>
      <TextField label="Shop" select value={templateDraft.shopId} onChange={(e) => setTemplateDraft((d) => ({ ...d, shopId: e.target.value }))} fullWidth>
        {shops.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
      </TextField>
      <TextField label="Template name" value={templateDraft.name} onChange={(e) => setTemplateDraft((d) => ({ ...d, name: e.target.value }))} required fullWidth autoFocus />
      <TextField label="Description" value={templateDraft.description} onChange={(e) => setTemplateDraft((d) => ({ ...d, description: e.target.value }))} fullWidth multiline minRows={3} />
      <TextField label="Status" select value={templateDraft.status} onChange={(e) => setTemplateDraft((d) => ({ ...d, status: e.target.value as CWTaskTemplateStatus }))} fullWidth>
        <MenuItem value="Active">Active</MenuItem>
        <MenuItem value="Inactive">Inactive</MenuItem>
      </TextField>
    </>
  )

  /* ── Field form fields (shared between add & edit field dialogs) ── */
  const fieldFormFields = (
    <>
      <TextField label="Label" value={fieldDraft.label} onChange={(e) => setFieldDraft((d) => ({ ...d, label: e.target.value }))} required fullWidth autoFocus />
      <TextField label="Type" select value={fieldDraft.type} onChange={(e) => setFieldDraft((d) => ({ ...d, type: e.target.value as CWTaskFieldType }))} fullWidth>
        {FIELD_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
      </TextField>
      <FormControlLabel control={<Switch checked={fieldDraft.required} onChange={(e) => setFieldDraft((d) => ({ ...d, required: e.target.checked }))} />} label="Required" />
      {needsOptions(fieldDraft.type) ? (
        <TextField label="Options (one per line)" value={fieldDraft.optionsText} onChange={(e) => setFieldDraft((d) => ({ ...d, optionsText: e.target.value }))} fullWidth multiline minRows={4} required />
      ) : null}
    </>
  )

  return (
    <Page
      title="Admin / Task Templates"
      subtitle="Create templates and design dynamic forms."
      actions={
        <Stack direction="row" spacing={1}>
          <Button
            variant={showPreview ? 'outlined' : 'contained'}
            startIcon={showPreview ? <VisibilityOff /> : <Visibility />}
            onClick={() => setShowPreview((v) => !v)}
            disabled={!selectedTemplate}
            sx={showPreview ? { fontWeight: 600, borderRadius: '10px', px: 2.5 } : btnSx}
          >
            {showPreview ? 'Hide Preview' : 'Preview'}
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={openCreateTemplate} disabled={saving} sx={btnSx}>
            New Template
          </Button>
        </Stack>
      }
    >
      {error ? <Alert severity="error" sx={{ mb: 2, borderRadius: radii.sm }}>{error}</Alert> : null}
      {loading ? (
        <Paper sx={{ p: 4, border: `1px solid ${colors.border.default}`, borderRadius: radii.lg, boxShadow: shadows.card }}>
          <Typography sx={{ color: colors.slate[500] }}>Loading task templates from backend...</Typography>
        </Paper>
      ) : null}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '360px 1fr' }, gap: 2 }}>
        {/* ── Left sidebar: shop selector + template list ── */}
        <Paper
          sx={{
            border: `1px solid ${colors.border.default}`,
            borderRadius: radii.lg,
            boxShadow: shadows.card,
            overflow: 'hidden',
          }}
        >
          <Stack spacing={1.5} sx={{ p: 2 }}>
            <TextField label="Shop" select value={effectiveShopId} onChange={(e) => setShopId(e.target.value)} fullWidth>
              {shops.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
            </TextField>
            <Divider />
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: colors.slate[900] }}>Templates</Typography>
            {templatesForShop.length ? (
              <Stack spacing={1}>
                {templatesForShop.map((t) => {
                  const selected = t.id === effectiveSelectedTemplateId
                  return (
                    <Paper
                      key={t.id}
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        cursor: 'pointer',
                        borderRadius: radii.sm,
                        borderColor: selected ? colors.slate[900] : colors.border.default,
                        backgroundColor: selected ? colors.bg.cardHover : 'transparent',
                        transition: 'all 150ms ease',
                        '&:hover': { borderColor: colors.slate[400] },
                      }}
                      onClick={() => setSelectedTemplateId(t.id)}
                    >
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                          <Typography sx={{ fontWeight: 800, color: colors.slate[900] }} noWrap>{t.name}</Typography>
                          <Typography sx={{ fontSize: '0.75rem', color: colors.slate[500] }} noWrap>{t.fields.length} field{t.fields.length === 1 ? '' : 's'}</Typography>
                        </Box>
                        {statusChip(t.status)}
                      </Stack>
                    </Paper>
                  )
                })}
              </Stack>
            ) : (
              <Typography sx={{ color: colors.slate[500] }}>No templates yet for {selectedShop?.name ?? 'this shop'}.</Typography>
            )}
          </Stack>
        </Paper>

        {/* ── Right panel: selected template detail + fields ── */}
        <Stack spacing={2}>
          {!selectedTemplate ? (
            <Paper
              sx={{
                p: 4,
                border: `1px solid ${colors.border.default}`,
                borderRadius: radii.lg,
                boxShadow: shadows.card,
              }}
            >
              <Stack spacing={1.5}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: colors.slate[900] }}>Select or create a template</Typography>
                <Typography sx={{ color: colors.slate[500] }}>Choose a template on the left, or create a new one.</Typography>
              </Stack>
            </Paper>
          ) : (
            <>
              {/* Template header card */}
              <Paper
                sx={{
                  p: 2,
                  border: `1px solid ${colors.border.default}`,
                  borderRadius: radii.lg,
                  boxShadow: shadows.card,
                }}
              >
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
                  <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: colors.slate[900] }} noWrap>{selectedTemplate.name}</Typography>
                    <Typography sx={{ color: colors.slate[500] }} noWrap>{selectedTemplate.description || '—'}</Typography>
                  </Box>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    {statusChip(selectedTemplate.status)}
                    <Button
                      variant="outlined"
                      startIcon={<Edit />}
                      onClick={() => openEditTemplateDialog(selectedTemplate)}
                      disabled={saving}
                      sx={{ fontWeight: 600, borderRadius: '10px', px: 2.5 }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => void toggleTemplateStatus(selectedTemplate)}
                      disabled={saving}
                      sx={{ fontWeight: 600, borderRadius: '10px', px: 2.5 }}
                    >
                      {selectedTemplate.status === 'Active' ? 'Deactivate' : 'Activate'}
                    </Button>
                  </Stack>
                </Stack>
              </Paper>

              {/* Fields section */}
              <Box>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography sx={{ fontWeight: 900, color: colors.slate[900], fontSize: '1rem' }}>Form fields</Typography>
                  <Button variant="contained" startIcon={<Add />} onClick={openAddField} disabled={saving} sx={btnSx}>Add Field</Button>
                </Stack>
                <DataTable<CWTaskField>
                  columns={fieldColumns}
                  rows={sortedFields}
                  keyExtractor={(f) => f.id}
                  emptyTitle="No fields yet"
                  emptyDescription="Add your first field to begin."
                  emptyAction={
                    <Button variant="contained" startIcon={<Add />} onClick={openAddField} disabled={saving} sx={btnSx}>
                      Add Field
                    </Button>
                  }
                />
              </Box>

              {/* Preview section */}
              {showPreview ? (
                <Paper
                  sx={{
                    p: 2,
                    border: `1px solid ${colors.border.default}`,
                    borderRadius: radii.lg,
                    boxShadow: shadows.card,
                  }}
                >
                  <Stack spacing={2}>
                    <Typography sx={{ fontWeight: 900, color: colors.slate[900], fontSize: '1rem' }}>Preview</Typography>
                    {!sortedFields.length ? (
                      <Typography sx={{ color: colors.slate[500] }}>Add fields to preview the form.</Typography>
                    ) : (
                      <Stack spacing={2}>
                        {sortedFields.map((f) => <PreviewField key={f.id} field={f} />)}
                      </Stack>
                    )}
                  </Stack>
                </Paper>
              ) : null}
            </>
          )}
        </Stack>
      </Box>

      {/* ── Create template dialog ── */}
      <FormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create template"
        icon={<Add />}
        onSubmit={() => void submitCreateTemplate()}
        submitLabel="Create"
        submitDisabled={!templateDraft.name.trim() || saving}
      >
        {templateFormFields}
      </FormDialog>

      {/* ── Edit template dialog ── */}
      <FormDialog
        open={!!editTemplate}
        onClose={() => setEditTemplate(null)}
        title="Edit template"
        icon={<Edit />}
        onSubmit={() => void submitEditTemplate()}
        submitLabel="Save"
        submitDisabled={!templateDraft.name.trim() || saving}
      >
        {templateFormFields}
      </FormDialog>

      {/* ── Add field dialog ── */}
      <FormDialog
        open={addFieldOpen}
        onClose={() => setAddFieldOpen(false)}
        title="Add field"
        icon={<Add />}
        onSubmit={() => void submitAddField()}
        submitLabel="Add"
        submitDisabled={!fieldDraft.label.trim() || saving}
      >
        {fieldFormFields}
      </FormDialog>

      {/* ── Edit field dialog ── */}
      <FormDialog
        open={!!editField}
        onClose={() => setEditField(null)}
        title="Edit field"
        icon={<Edit />}
        onSubmit={() => void submitEditField()}
        submitLabel="Save"
        submitDisabled={!fieldDraft.label.trim() || saving}
      >
        {fieldFormFields}
      </FormDialog>
    </Page>
  )
}
