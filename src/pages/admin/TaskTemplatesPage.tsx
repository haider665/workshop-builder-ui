import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
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
import { useCwStore } from '../../store/cwStore'
import type {
  CWTaskField,
  CWTaskFieldType,
  CWTaskTemplate,
  CWTaskTemplateStatus,
} from '../../types/cw'
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

function statusChip(status: CWTaskTemplateStatus) {
  if (status === 'Active') return <Chip size="small" color="success" label="Active" />
  return <Chip size="small" color="default" label="Inactive" />
}

function parseOptions(text: string) {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
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

  if (f.type === 'Text Input') {
    return <TextField label={f.label} required={f.required} fullWidth />
  }
  if (f.type === 'Text Area') {
    return <TextField label={f.label} required={f.required} fullWidth multiline minRows={3} />
  }
  if (f.type === 'Number') {
    return <TextField label={f.label} required={f.required} fullWidth type="number" />
  }
  if (f.type === 'Checkbox') {
    return <FormControlLabel control={<Switch />} label={f.label + (f.required ? ' *' : '')} />
  }
  if (f.type === 'Checkbox Group') {
    return (
      <Stack spacing={1}>
        <Typography sx={{ fontWeight: 700 }}>
          {f.label}{f.required ? ' *' : ''}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
          {(f.options ?? []).map((o) => (
            <Chip key={o} label={o} variant="outlined" />
          ))}
        </Stack>
      </Stack>
    )
  }
  if (f.type === 'Radio Button Group') {
    return (
      <TextField
        label={f.label}
        required={f.required}
        fullWidth
        select
        helperText="Preview: radio group rendered as a single-select here"
      >
        {(f.options ?? []).map((o) => (
          <MenuItem key={o} value={o}>
            {o}
          </MenuItem>
        ))}
      </TextField>
    )
  }
  if (f.type === 'Dropdown') {
    return (
      <TextField label={f.label} required={f.required} fullWidth select>
        {(f.options ?? []).map((o) => (
          <MenuItem key={o} value={o}>
            {o}
          </MenuItem>
        ))}
      </TextField>
    )
  }
  if (f.type === 'Date Picker') {
    return (
      <TextField
        label={f.label}
        required={f.required}
        fullWidth
        type="date"
        slotProps={{
          inputLabel: { shrink: true },
        }}
      />
    )
  }
  if (f.type === 'Image Upload') {
    return (
      <Stack spacing={1}>
        <Typography sx={{ fontWeight: 700 }}>
          {f.label}{f.required ? ' *' : ''}
        </Typography>
        <Button variant="outlined" component="label">
          Choose image
          <input hidden type="file" accept="image/*" />
        </Button>
      </Stack>
    )
  }
  if (f.type === 'File Upload') {
    return (
      <Stack spacing={1}>
        <Typography sx={{ fontWeight: 700 }}>
          {f.label}{f.required ? ' *' : ''}
        </Typography>
        <Button variant="outlined" component="label">
          Choose file
          <input hidden type="file" />
        </Button>
      </Stack>
    )
  }

  return null
}

export function TaskTemplatesPage() {
  const shops = useCwStore((s) => s.shops)
  const taskTemplates = useCwStore((s) => s.taskTemplates)

  const [shopId, setShopId] = useState<string>('')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const [createOpen, setCreateOpen] = useState(false)
  const [editTemplate, setEditTemplate] = useState<CWTaskTemplate | null>(null)
  const [templateDraft, setTemplateDraft] = useState<TemplateDraft>(toTemplateDraft(''))

  const [addFieldOpen, setAddFieldOpen] = useState(false)
  const [editField, setEditField] = useState<CWTaskField | null>(null)
  const [fieldDraft, setFieldDraft] = useState<FieldDraft>(toFieldDraft())

  const hasShops = shops.length > 0

  useEffect(() => {
    if (shopId) return
    if (shops.length) setShopId(shops[0]!.id)
  }, [shopId, shops])

  const templatesForShop = useMemo(() => {
    return taskTemplates
      .filter((t) => t.shopId === shopId)
      .slice()
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === 'Active' ? -1 : 1
        return a.name.localeCompare(b.name)
      })
  }, [taskTemplates, shopId])

  useEffect(() => {
    if (!templatesForShop.length) {
      setSelectedTemplateId('')
      return
    }
    if (selectedTemplateId && templatesForShop.some((t) => t.id === selectedTemplateId)) return
    setSelectedTemplateId(templatesForShop[0]!.id)
  }, [selectedTemplateId, templatesForShop])

  const selectedTemplate = templatesForShop.find((t) => t.id === selectedTemplateId) ?? null
  const selectedShop = shops.find((s) => s.id === shopId) ?? null

  const sortedFields = useMemo(() => {
    return (selectedTemplate?.fields ?? []).slice().sort((a, b) => a.order - b.order)
  }, [selectedTemplate])

  function openCreateTemplate() {
    setError(null)
    setTemplateDraft(toTemplateDraft(shopId))
    setCreateOpen(true)
  }

  function submitCreateTemplate() {
    try {
      setError(null)
      const created = taskTemplatesService.create({
        shopId: templateDraft.shopId,
        name: templateDraft.name,
        description: templateDraft.description,
        status: templateDraft.status,
      })
      setCreateOpen(false)
      setSelectedTemplateId(created.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function openEditTemplateDialog(t: CWTaskTemplate) {
    setError(null)
    setEditTemplate(t)
    setTemplateDraft(toTemplateDraft(shopId, t))
  }

  function submitEditTemplate() {
    if (!editTemplate) return
    try {
      setError(null)
      taskTemplatesService.update(editTemplate.id, {
        shopId: templateDraft.shopId,
        name: templateDraft.name,
        description: templateDraft.description,
        status: templateDraft.status,
      })
      setEditTemplate(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function toggleTemplateStatus(t: CWTaskTemplate) {
    taskTemplatesService.setStatus(t.id, t.status === 'Active' ? 'Inactive' : 'Active')
  }

  function openAddField() {
    if (!selectedTemplate) return
    setError(null)
    setFieldDraft(toFieldDraft())
    setAddFieldOpen(true)
  }

  function submitAddField() {
    if (!selectedTemplate) return
    try {
      setError(null)
      taskTemplatesService.addField(selectedTemplate.id, {
        label: fieldDraft.label,
        type: fieldDraft.type,
        required: fieldDraft.required,
        options: needsOptions(fieldDraft.type) ? parseOptions(fieldDraft.optionsText) : undefined,
      })
      setAddFieldOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function openEditFieldDialog(f: CWTaskField) {
    setError(null)
    setEditField(f)
    setFieldDraft(toFieldDraft(f))
  }

  function submitEditField() {
    if (!selectedTemplate || !editField) return
    try {
      setError(null)
      taskTemplatesService.updateField(selectedTemplate.id, editField.id, {
        label: fieldDraft.label,
        type: fieldDraft.type,
        required: fieldDraft.required,
        options: needsOptions(fieldDraft.type) ? parseOptions(fieldDraft.optionsText) : undefined,
      })
      setEditField(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function removeField(f: CWTaskField) {
    if (!selectedTemplate) return
    taskTemplatesService.removeField(selectedTemplate.id, f.id)
  }

  function moveField(f: CWTaskField, dir: 'up' | 'down') {
    if (!selectedTemplate) return
    taskTemplatesService.moveField(selectedTemplate.id, f.id, dir)
  }

  if (!hasShops) {
    return (
      <Page
        title="Admin / Task Templates"
        subtitle="Build task templates and dynamic forms (in-memory MVP)."
      >
        <Paper sx={{ p: 4, border: '1px solid', borderColor: 'divider' }}>
          <Stack spacing={1.5}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Create a shop first
            </Typography>
            <Typography color="text.secondary">
              Task Templates belong to a shop. Create at least one shop to continue.
            </Typography>
            <Box>
              <Button variant="contained" component={RouterLink} to="/admin/shops">
                Go to Shops
              </Button>
            </Box>
          </Stack>
        </Paper>
      </Page>
    )
  }

  return (
    <Page
      title="Admin / Task Templates"
      subtitle="Create templates and design dynamic forms (in-memory MVP)."
      actions={
        <Stack direction="row" spacing={1}>
          <Button
            variant={showPreview ? 'outlined' : 'contained'}
            startIcon={showPreview ? <VisibilityOff /> : <Visibility />}
            onClick={() => setShowPreview((v) => !v)}
            disabled={!selectedTemplate}
          >
            {showPreview ? 'Hide Preview' : 'Preview'}
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={openCreateTemplate}>
            New Template
          </Button>
        </Stack>
      }
    >
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '360px 1fr' },
          gap: 2,
        }}
      >
        <Paper sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
          <Stack spacing={1.5} sx={{ p: 2 }}>
            <TextField
              label="Shop"
              select
              value={shopId}
              onChange={(e) => setShopId(e.target.value)}
              fullWidth
            >
              {shops.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </TextField>

            <Divider />

            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              Templates
            </Typography>
            {templatesForShop.length ? (
              <Stack spacing={1}>
                {templatesForShop.map((t) => {
                  const selected = t.id === selectedTemplateId
                  return (
                    <Paper
                      key={t.id}
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        cursor: 'pointer',
                        borderColor: selected ? 'primary.main' : 'divider',
                        backgroundColor: selected ? 'action.hover' : 'transparent',
                      }}
                      onClick={() => setSelectedTemplateId(t.id)}
                    >
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                          <Typography sx={{ fontWeight: 800 }} noWrap>
                            {t.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {t.fields.length} field{t.fields.length === 1 ? '' : 's'}
                          </Typography>
                        </Box>
                        {statusChip(t.status)}
                      </Stack>
                    </Paper>
                  )
                })}
              </Stack>
            ) : (
              <Typography color="text.secondary">
                No templates yet for {selectedShop?.name ?? 'this shop'}.
              </Typography>
            )}
          </Stack>
        </Paper>

        <Stack spacing={2}>
          {!selectedTemplate ? (
            <Paper sx={{ p: 4, border: '1px solid', borderColor: 'divider' }}>
              <Stack spacing={1.5}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Select or create a template
                </Typography>
                <Typography color="text.secondary">
                  Choose a template on the left, or create a new one.
                </Typography>
              </Stack>
            </Paper>
          ) : (
            <>
              <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
                  <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 900 }} noWrap>
                      {selectedTemplate.name}
                    </Typography>
                    <Typography color="text.secondary" noWrap>
                      {selectedTemplate.description || '—'}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    {statusChip(selectedTemplate.status)}
                    <Button variant="outlined" startIcon={<Edit />} onClick={() => openEditTemplateDialog(selectedTemplate)}>
                      Edit
                    </Button>
                    <Button variant="outlined" onClick={() => toggleTemplateStatus(selectedTemplate)}>
                      {selectedTemplate.status === 'Active' ? 'Deactivate' : 'Activate'}
                    </Button>
                  </Stack>
                </Stack>
              </Paper>

              <Paper sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                <Stack direction="row" spacing={1} sx={{ p: 2, alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
                    Form fields
                  </Typography>
                  <Button variant="contained" startIcon={<Add />} onClick={openAddField}>
                    Add Field
                  </Button>
                </Stack>
                <Divider />
                {!sortedFields.length ? (
                  <Box sx={{ p: 3 }}>
                    <Typography color="text.secondary">
                      No fields yet. Add your first field to begin.
                    </Typography>
                  </Box>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800 }}>#</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Label</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Type</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Required</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Options</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800 }}>
                          Actions
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sortedFields.map((f, idx) => (
                        <TableRow key={f.id} hover>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell>
                            <Typography sx={{ fontWeight: 700 }}>{f.label}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {f.id}
                            </Typography>
                          </TableCell>
                          <TableCell>{f.type}</TableCell>
                          <TableCell>
                            {f.required ? <Chip size="small" color="warning" label="Yes" /> : <Chip size="small" label="No" />}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
                              {optionsSummary(f)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                              <Tooltip title="Move up">
                                <span>
                                  <IconButton onClick={() => moveField(f, 'up')} disabled={idx === 0}>
                                    <ArrowUpward fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                              <Tooltip title="Move down">
                                <span>
                                  <IconButton
                                    onClick={() => moveField(f, 'down')}
                                    disabled={idx === sortedFields.length - 1}
                                  >
                                    <ArrowDownward fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                              <Tooltip title="Edit">
                                <IconButton onClick={() => openEditFieldDialog(f)}>
                                  <Edit fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Remove">
                                <IconButton onClick={() => removeField(f)}>
                                  <Delete fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Paper>

              {showPreview ? (
                <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
                  <Stack spacing={2}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
                      Preview
                    </Typography>
                    {!sortedFields.length ? (
                      <Typography color="text.secondary">Add fields to preview the form.</Typography>
                    ) : (
                      <Stack spacing={2}>
                        {sortedFields.map((f) => (
                          <PreviewField key={f.id} field={f} />
                        ))}
                      </Stack>
                    )}
                  </Stack>
                </Paper>
              ) : null}
            </>
          )}
        </Stack>
      </Box>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create template</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Shop"
              select
              value={templateDraft.shopId}
              onChange={(e) => setTemplateDraft((d) => ({ ...d, shopId: e.target.value }))}
              fullWidth
            >
              {shops.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Template name"
              value={templateDraft.name}
              onChange={(e) => setTemplateDraft((d) => ({ ...d, name: e.target.value }))}
              required
              fullWidth
              autoFocus
            />
            <TextField
              label="Description"
              value={templateDraft.description}
              onChange={(e) => setTemplateDraft((d) => ({ ...d, description: e.target.value }))}
              fullWidth
              multiline
              minRows={3}
            />
            <TextField
              label="Status"
              select
              value={templateDraft.status}
              onChange={(e) =>
                setTemplateDraft((d) => ({ ...d, status: e.target.value as CWTaskTemplateStatus }))
              }
              fullWidth
            >
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="Inactive">Inactive</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitCreateTemplate} disabled={!templateDraft.name.trim()}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!editTemplate} onClose={() => setEditTemplate(null)} fullWidth maxWidth="sm">
        <DialogTitle>Edit template</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Shop"
              select
              value={templateDraft.shopId}
              onChange={(e) => setTemplateDraft((d) => ({ ...d, shopId: e.target.value }))}
              fullWidth
            >
              {shops.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Template name"
              value={templateDraft.name}
              onChange={(e) => setTemplateDraft((d) => ({ ...d, name: e.target.value }))}
              required
              fullWidth
              autoFocus
            />
            <TextField
              label="Description"
              value={templateDraft.description}
              onChange={(e) => setTemplateDraft((d) => ({ ...d, description: e.target.value }))}
              fullWidth
              multiline
              minRows={3}
            />
            <TextField
              label="Status"
              select
              value={templateDraft.status}
              onChange={(e) =>
                setTemplateDraft((d) => ({ ...d, status: e.target.value as CWTaskTemplateStatus }))
              }
              fullWidth
            >
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="Inactive">Inactive</MenuItem>
            </TextField>

            <Divider />
            <Typography variant="body2" color="text.secondary">
              SRS note: editing a template should not retroactively change values already submitted against existing tasks.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditTemplate(null)}>Cancel</Button>
          <Button variant="contained" onClick={submitEditTemplate} disabled={!templateDraft.name.trim()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={addFieldOpen} onClose={() => setAddFieldOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add field</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Label"
              value={fieldDraft.label}
              onChange={(e) => setFieldDraft((d) => ({ ...d, label: e.target.value }))}
              required
              fullWidth
              autoFocus
            />
            <TextField
              label="Type"
              select
              value={fieldDraft.type}
              onChange={(e) => setFieldDraft((d) => ({ ...d, type: e.target.value as CWTaskFieldType }))}
              fullWidth
            >
              {FIELD_TYPES.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </TextField>
            <FormControlLabel
              control={<Switch checked={fieldDraft.required} onChange={(e) => setFieldDraft((d) => ({ ...d, required: e.target.checked }))} />}
              label="Required"
            />

            {needsOptions(fieldDraft.type) ? (
              <TextField
                label="Options (one per line)"
                value={fieldDraft.optionsText}
                onChange={(e) => setFieldDraft((d) => ({ ...d, optionsText: e.target.value }))}
                fullWidth
                multiline
                minRows={4}
                required
              />
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAddFieldOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitAddField} disabled={!fieldDraft.label.trim()}>
            Add
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!editField} onClose={() => setEditField(null)} fullWidth maxWidth="sm">
        <DialogTitle>Edit field</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Label"
              value={fieldDraft.label}
              onChange={(e) => setFieldDraft((d) => ({ ...d, label: e.target.value }))}
              required
              fullWidth
              autoFocus
            />
            <TextField
              label="Type"
              select
              value={fieldDraft.type}
              onChange={(e) => setFieldDraft((d) => ({ ...d, type: e.target.value as CWTaskFieldType }))}
              fullWidth
            >
              {FIELD_TYPES.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </TextField>
            <FormControlLabel
              control={<Switch checked={fieldDraft.required} onChange={(e) => setFieldDraft((d) => ({ ...d, required: e.target.checked }))} />}
              label="Required"
            />

            {needsOptions(fieldDraft.type) ? (
              <TextField
                label="Options (one per line)"
                value={fieldDraft.optionsText}
                onChange={(e) => setFieldDraft((d) => ({ ...d, optionsText: e.target.value }))}
                fullWidth
                multiline
                minRows={4}
                required
              />
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditField(null)}>Cancel</Button>
          <Button variant="contained" onClick={submitEditField} disabled={!fieldDraft.label.trim()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Page>
  )
}
