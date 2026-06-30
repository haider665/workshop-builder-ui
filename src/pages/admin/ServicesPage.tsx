import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { Fragment, useEffect, useMemo, useState } from 'react'
import { Page } from '../../components/Page'
import type { CWService, CWServiceSeverity, CWServiceStageDefinition, CWShop, CWVehicleSize } from '../../types/cw'
import { shopsService } from '../../services/admin/shopsService'
import { servicesService } from '../../services/admin/servicesService'

function fmt(n: number) {
  return n.toLocaleString('en-BD')
}

const VEHICLE_SIZES: CWVehicleSize[] = ['Small', 'Medium', 'Large']
const SEVERITIES: CWServiceSeverity[] = ['Light', 'Medium', 'Severe']

function newStageId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function ServicesPage() {
  const [shops, setShops] = useState<CWShop[]>([])
  const [services, setServices] = useState<CWService[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successOpen, setSuccessOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const [filterCat, setFilterCat] = useState('')
  const [filterQuery, setFilterQuery] = useState('')
  const [filterShop, setFilterShop] = useState('')
  const [filterSize, setFilterSize] = useState('')

  const [addOpen, setAddOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [stageViewId, setStageViewId] = useState<string | null>(null)

  const [code, setCode] = useState('')
  const [category, setCategory] = useState('')
  const [section, setSection] = useState('')
  const [description, setDescription] = useState('')
  const [vehicleSize, setVehicleSize] = useState<CWVehicleSize | ''>('')
  const [severity, setSeverity] = useState<CWServiceSeverity | ''>('')
  const [processTimeMins, setProcessTimeMins] = useState('')
  const [ratePerHr, setRatePerHr] = useState('')
  const [price, setPrice] = useState('')
  const [shopId, setShopId] = useState('')
  const [stages, setStages] = useState<CWServiceStageDefinition[]>([])

  const [editCode, setEditCode] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editSection, setEditSection] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editVehicleSize, setEditVehicleSize] = useState<CWVehicleSize | ''>('')
  const [editSeverity, setEditSeverity] = useState<CWServiceSeverity | ''>('')
  const [editProcessTimeMins, setEditProcessTimeMins] = useState('')
  const [editRatePerHr, setEditRatePerHr] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editShopId, setEditShopId] = useState('')
  const [editStages, setEditStages] = useState<CWServiceStageDefinition[]>([])

  const [newStageName, setNewStageName] = useState('')
  const [newStageDuration, setNewStageDuration] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [shopData, serviceData] = await Promise.all([
          shopsService.list(),
          servicesService.list(),
        ])
        if (!active) return
        setShops(shopData)
        setServices(serviceData)
        if (!shopId && shopData.length) setShopId(shopData[0]!.id)
        if (!editShopId && shopData.length) setEditShopId(shopData[0]!.id)
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load services')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
    // load once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const activeShops = useMemo(() => shops.filter((s) => s.status === 'Active'), [shops])
  const shopById = useMemo(() => new Map(shops.map((s) => [s.id, s])), [shops])

  const categories = useMemo(() => {
    const cats = new Set(services.map((s) => s.category))
    return [...cats].sort()
  }, [services])

  const hasFilter = !!(filterCat || filterShop || filterSize || filterQuery.trim())

  const filtered = useMemo(() => {
    if (!hasFilter) return []
    return services.filter((s) => {
      if (filterCat && s.category !== filterCat) return false
      if (filterShop && s.shopId !== filterShop) return false
      if (filterSize && s.vehicleSize !== filterSize) return false
      if (filterQuery) {
        const q = filterQuery.toLowerCase()
        if (!s.code.toLowerCase().includes(q) && !s.description.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [services, filterCat, filterShop, filterSize, filterQuery, hasFilter])

  const displayRows = hasFilter ? filtered : services

  function clearCreateForm() {
    setCode('')
    setCategory('')
    setSection('')
    setDescription('')
    setVehicleSize('')
    setSeverity('')
    setProcessTimeMins('')
    setRatePerHr('')
    setPrice('')
    setStages([])
  }

  function startEdit(id: string) {
    const svc = services.find((x) => x.id === id)
    if (!svc) return
    setEditId(id)
    setEditCode(svc.code)
    setEditCategory(svc.category)
    setEditSection(svc.section ?? '')
    setEditDescription(svc.description)
    setEditVehicleSize(svc.vehicleSize ?? '')
    setEditSeverity(svc.severity ?? '')
    setEditProcessTimeMins(String(svc.processTimeMins))
    setEditRatePerHr(svc.ratePerHr != null ? String(svc.ratePerHr) : '')
    setEditPrice(String(svc.price))
    setEditShopId(svc.shopId)
    setEditStages([...(svc.stages ?? [])].sort((a, b) => a.order - b.order))
    setError(null)
  }

  async function submitAdd() {
    try {
      setSaving(true)
      setError(null)
      if (!code.trim()) throw new Error('Code is required')
      if (!category.trim()) throw new Error('Category is required')
      if (!description.trim()) throw new Error('Description is required')
      if (!shopId) throw new Error('Shop is required')
      const t = parseFloat(processTimeMins)
      const r = ratePerHr.trim() ? parseFloat(ratePerHr) : undefined
      const p = parseFloat(price)
      if (isNaN(t) || t <= 0) throw new Error('Valid process time (mins) is required')
      if (r !== undefined && (isNaN(r) || r <= 0)) throw new Error('Valid rate/hr is required')
      if (isNaN(p) || p <= 0) throw new Error('Valid price is required')

      const created = await servicesService.create({
        code: code.trim(),
        category: category.trim(),
        section: section.trim() || undefined,
        description: description.trim(),
        vehicleSize: vehicleSize || undefined,
        severity: severity || undefined,
        processTimeMins: t,
        ratePerHr: r,
        price: p,
        shopId,
        stages,
      })
      setServices((current) => [created, ...current.filter((svc) => svc.id !== created.id)])
      clearCreateForm()
      setAddOpen(false)
      setSuccessMessage(`Service created: ${created.code}`)
      setSuccessOpen(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  async function submitEdit() {
    try {
      setSaving(true)
      setError(null)
      if (!editId) return
      if (!editCode.trim()) throw new Error('Code is required')
      if (!editCategory.trim()) throw new Error('Category is required')
      if (!editDescription.trim()) throw new Error('Description is required')
      if (!editShopId) throw new Error('Shop is required')
      const t = parseFloat(editProcessTimeMins)
      const r = editRatePerHr.trim() ? parseFloat(editRatePerHr) : undefined
      const p = parseFloat(editPrice)
      if (isNaN(t) || t <= 0) throw new Error('Valid process time (mins) is required')
      if (r !== undefined && (isNaN(r) || r <= 0)) throw new Error('Valid rate/hr is required')
      if (isNaN(p) || p <= 0) throw new Error('Valid price is required')

      const updated = await servicesService.update(editId, {
        code: editCode.trim(),
        category: editCategory.trim(),
        section: editSection.trim() || undefined,
        description: editDescription.trim(),
        vehicleSize: editVehicleSize || undefined,
        severity: editSeverity || undefined,
        processTimeMins: t,
        ratePerHr: r,
        price: p,
        shopId: editShopId,
        stages: editStages.length ? editStages : undefined,
        status: services.find((s) => s.id === editId)?.status ?? 'Active',
      })
      setServices((current) => current.map((svc) => (svc.id === updated.id ? updated : svc)))
      setEditId(null)
      setSuccessMessage('Service updated')
      setSuccessOpen(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus(svc: CWService) {
    try {
      setSaving(true)
      setError(null)
      const updated = await servicesService.setStatus(svc.id, svc.status === 'Active' ? 'Inactive' : 'Active')
      setServices((current) => current.map((item) => (item.id === updated.id ? updated : item)))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  function addStageToCreate() {
    if (!newStageName.trim()) return
    const dur = parseFloat(newStageDuration)
    if (isNaN(dur) || dur <= 0) return
    setStages((current) => [
      ...current,
      { id: newStageId(), name: newStageName.trim(), order: current.length + 1, durationMins: dur },
    ])
    setNewStageName('')
    setNewStageDuration('')
  }

  function removeCreateStage(stageId: string) {
    setStages((current) => current.filter((s) => s.id !== stageId).map((s, i) => ({ ...s, order: i + 1 })))
  }

  async function persistStages(serviceId: string, nextStages: CWServiceStageDefinition[]) {
    const svc = services.find((item) => item.id === serviceId)
    if (!svc) return
    const updated = await servicesService.update(serviceId, {
      code: svc.code,
      category: svc.category,
      section: svc.section,
      description: svc.description,
      vehicleSize: svc.vehicleSize,
      severity: svc.severity,
      processTimeMins: svc.processTimeMins,
      ratePerHr: svc.ratePerHr,
      price: svc.price,
      shopId: svc.shopId,
      stages: nextStages,
      status: svc.status,
    })
    setServices((current) => current.map((item) => (item.id === updated.id ? updated : item)))
  }

  return (
    <Page
      title="Admin / Services"
      subtitle="Manage service catalogue used in appointments."
      actions={
        <Button variant="contained" onClick={() => setAddOpen((v) => !v)} disabled={saving}>
          {addOpen ? 'Cancel' : '+ Add Service'}
        </Button>
      }
    >
      <Snackbar
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        autoHideDuration={2500}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setSuccessOpen(false)} severity="success" variant="filled" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <Paper sx={{ p: 4, border: '1px solid', borderColor: 'divider' }}>
          <Typography color="text.secondary">Loading services from backend...</Typography>
        </Paper>
      ) : null}

      <Stack spacing={2}>
        {addOpen ? (
          <Paper sx={{ p: 2.5, border: '1px solid', borderColor: 'primary.main' }}>
            <Typography sx={{ fontWeight: 900, mb: 2 }}>New Service</Typography>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
                <TextField label="Code" size="small" value={code} onChange={(e) => setCode(e.target.value)} sx={{ flex: '1 1 120px' }} />
                <TextField label="Category" size="small" value={category} onChange={(e) => setCategory(e.target.value)} sx={{ flex: '1 1 160px' }} placeholder="e.g. Engine" />
                <TextField label="Section" size="small" value={section} onChange={(e) => setSection(e.target.value)} sx={{ flex: '1 1 160px' }} placeholder="e.g. Lubrication" />
                <FormControl size="small" sx={{ flex: '1 1 180px' }}>
                  <InputLabel>Shop</InputLabel>
                  <Select label="Shop" value={shopId} onChange={(e) => setShopId(e.target.value)}>
                    {activeShops.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Stack>
              <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
                <TextField label="Description" size="small" value={description} onChange={(e) => setDescription(e.target.value)} sx={{ flex: '2 1 300px' }} />
                <FormControl size="small" sx={{ flex: '1 1 120px' }}>
                  <InputLabel>Size</InputLabel>
                  <Select label="Size" value={vehicleSize} onChange={(e) => setVehicleSize(e.target.value as CWVehicleSize)}>
                    <MenuItem value="">— Any —</MenuItem>
                    {VEHICLE_SIZES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ flex: '1 1 120px' }}>
                  <InputLabel>Severity</InputLabel>
                  <Select label="Severity" value={severity} onChange={(e) => setSeverity(e.target.value as CWServiceSeverity)}>
                    <MenuItem value="">— Any —</MenuItem>
                    {SEVERITIES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </Select>
                </FormControl>
              </Stack>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <TextField label="Process Time (mins)" size="small" type="number" value={processTimeMins} onChange={(e) => setProcessTimeMins(e.target.value)} sx={{ flex: '1 1 100px' }} />
                <TextField label="Rate/hr (BDT)" size="small" type="number" value={ratePerHr} onChange={(e) => setRatePerHr(e.target.value)} sx={{ flex: '1 1 130px' }} placeholder="Optional" />
                <TextField label="Price / MRP (BDT)" size="small" type="number" value={price} onChange={(e) => setPrice(e.target.value)} sx={{ flex: '1 1 130px' }} />
                <Button variant="contained" onClick={() => void submitAdd()} sx={{ height: 40 }} disabled={saving}>
                  Save
                </Button>
              </Stack>
            </Stack>

            <Stack spacing={1.5} sx={{ mt: 2 }}>
              <Typography sx={{ fontWeight: 800 }}>Stages</Typography>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <TextField size="small" label="Stage name" value={newStageName} onChange={(e) => setNewStageName(e.target.value)} />
                <TextField size="small" label="Duration (mins)" type="number" value={newStageDuration} onChange={(e) => setNewStageDuration(e.target.value)} />
                <Button variant="outlined" onClick={addStageToCreate}>Add stage</Button>
              </Stack>
              {stages.length ? (
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                  {stages.map((stage) => (
                    <Chip key={stage.id} label={`${stage.order}. ${stage.name} (${stage.durationMins}m)`} onDelete={() => removeCreateStage(stage.id)} />
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">No stages added yet.</Typography>
              )}
            </Stack>
          </Paper>
        ) : null}

        <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
          <TextField
            size="small"
            label="Search code or description"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            sx={{ flex: '2 1 250px' }}
          />
          <FormControl size="small" sx={{ flex: '1 1 160px' }}>
            <InputLabel>Category</InputLabel>
            <Select label="Category" value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
              <MenuItem value="">All categories</MenuItem>
              {categories.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ flex: '1 1 140px' }}>
            <InputLabel>Shop</InputLabel>
            <Select label="Shop" value={filterShop} onChange={(e) => setFilterShop(e.target.value)}>
              <MenuItem value="">All shops</MenuItem>
              {activeShops.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ flex: '1 1 120px' }}>
            <InputLabel>Size</InputLabel>
            <Select label="Size" value={filterSize} onChange={(e) => setFilterSize(e.target.value)}>
              <MenuItem value="">All sizes</MenuItem>
              {VEHICLE_SIZES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>

        <Typography variant="body2" color="text.secondary">
          {hasFilter
            ? `Showing ${displayRows.length} of ${services.length} services`
            : `${services.length} services — use filters above to search`}
        </Typography>

        <Paper sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>Code</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Section</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Description</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Shop</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Size</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Severity</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Time (m)</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>MRP (BDT)</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Stages</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayRows.map((s) => (
                <Fragment key={s.id}>
                  <TableRow hover sx={{ cursor: 'pointer' }} onClick={() => setStageViewId(stageViewId === s.id ? null : s.id)}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                        {s.code}
                      </Typography>
                    </TableCell>
                    <TableCell><Chip size="small" label={s.category} variant="outlined" /></TableCell>
                    <TableCell><Typography variant="body2" color="text.secondary">{s.section ?? '—'}</Typography></TableCell>
                    <TableCell>{s.description}</TableCell>
                    <TableCell><Chip size="small" label={shopById.get(s.shopId)?.name ?? '—'} variant="outlined" /></TableCell>
                    <TableCell>{s.vehicleSize ? <Chip size="small" label={s.vehicleSize} color="info" variant="outlined" /> : '—'}</TableCell>
                    <TableCell>{s.severity ? <Chip size="small" label={s.severity} color={s.severity === 'Severe' ? 'error' : s.severity === 'Medium' ? 'warning' : 'default'} variant="outlined" /> : '—'}</TableCell>
                    <TableCell align="right">{s.processTimeMins}</TableCell>
                    <TableCell align="right"><Typography sx={{ fontWeight: 700 }}>{fmt(s.price)}</Typography></TableCell>
                    <TableCell>{s.stages?.length ? <Chip size="small" label={`${s.stages.length} stages`} color="primary" variant="outlined" /> : '—'}</TableCell>
                    <TableCell><Chip size="small" label={s.status} color={s.status === 'Active' ? 'success' : 'default'} /></TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                        <Button size="small" onClick={(e) => { e.stopPropagation(); startEdit(s.id) }} disabled={saving}>Edit</Button>
                        <Button
                          size="small"
                          color={s.status === 'Active' ? 'warning' : 'success'}
                          onClick={(e) => { e.stopPropagation(); void toggleStatus(s) }}
                          disabled={saving}
                        >
                          {s.status === 'Active' ? 'Deactivate' : 'Activate'}
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                  {stageViewId === s.id ? (
                    <TableRow>
                      <TableCell colSpan={12} sx={{ bgcolor: 'action.hover', py: 0 }}>
                        <Collapse in={stageViewId === s.id}>
                          <Box sx={{ p: 2 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
                              Stages for {s.code} — {s.description}
                            </Typography>
                            {s.stages?.length ? (
                              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', mb: 1.5 }}>
                                {[...s.stages].sort((a, b) => a.order - b.order).map((stage) => (
                                  <Chip
                                    key={stage.id}
                                    label={`${stage.order}. ${stage.name} (${stage.durationMins}m)`}
                                    onDelete={
                                      saving
                                        ? undefined
                                        : () => {
                                            const nextStages = (s.stages ?? [])
                                              .filter((item) => item.id !== stage.id)
                                              .map((item, i) => ({ ...item, order: i + 1 }))
                                            void persistStages(s.id, nextStages)
                                          }
                                    }
                                    variant="outlined"
                                    color="primary"
                                  />
                                ))}
                              </Stack>
                            ) : (
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                                No stages defined. Add stages to enable per-stage scheduling.
                              </Typography>
                            )}
                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                              <TextField size="small" label="Stage name" value={newStageName} onChange={(e) => setNewStageName(e.target.value)} sx={{ width: 200 }} />
                              <TextField size="small" label="Duration (mins)" type="number" value={newStageDuration} onChange={(e) => setNewStageDuration(e.target.value)} sx={{ width: 160 }} />
                              <Button
                                variant="outlined"
                                onClick={() => {
                                  if (!newStageName.trim()) return
                                  const dur = parseFloat(newStageDuration)
                                  if (isNaN(dur) || dur <= 0) return
                                  const currentStages = [...(s.stages ?? [])]
                                  const nextStage = {
                                    id: newStageId(),
                                    name: newStageName.trim(),
                                    order: currentStages.length + 1,
                                    durationMins: dur,
                                  }
                                  void persistStages(s.id, [...currentStages, nextStage])
                                  setNewStageName('')
                                  setNewStageDuration('')
                                }}
                                disabled={saving}
                              >
                                Add Stage
                              </Button>
                            </Stack>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Stack>

      <Dialog open={editId !== null} onClose={() => setEditId(null)} fullWidth maxWidth="lg">
        <DialogTitle>Edit service</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
              <TextField label="Code" size="small" value={editCode} onChange={(e) => setEditCode(e.target.value)} sx={{ flex: '1 1 120px' }} />
              <TextField label="Category" size="small" value={editCategory} onChange={(e) => setEditCategory(e.target.value)} sx={{ flex: '1 1 160px' }} />
              <TextField label="Section" size="small" value={editSection} onChange={(e) => setEditSection(e.target.value)} sx={{ flex: '1 1 160px' }} />
              <FormControl size="small" sx={{ flex: '1 1 180px' }}>
                <InputLabel>Shop</InputLabel>
                <Select label="Shop" value={editShopId} onChange={(e) => setEditShopId(e.target.value)}>
                  {activeShops.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>
            <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
              <TextField label="Description" size="small" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} sx={{ flex: '2 1 300px' }} />
              <FormControl size="small" sx={{ flex: '1 1 120px' }}>
                <InputLabel>Size</InputLabel>
                <Select label="Size" value={editVehicleSize} onChange={(e) => setEditVehicleSize(e.target.value as CWVehicleSize)}>
                  <MenuItem value="">— Any —</MenuItem>
                  {VEHICLE_SIZES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ flex: '1 1 120px' }}>
                <InputLabel>Severity</InputLabel>
                <Select label="Severity" value={editSeverity} onChange={(e) => setEditSeverity(e.target.value as CWServiceSeverity)}>
                  <MenuItem value="">— Any —</MenuItem>
                  {SEVERITIES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <TextField label="Process Time (mins)" size="small" type="number" value={editProcessTimeMins} onChange={(e) => setEditProcessTimeMins(e.target.value)} sx={{ flex: '1 1 100px' }} />
              <TextField label="Rate/hr (BDT)" size="small" type="number" value={editRatePerHr} onChange={(e) => setEditRatePerHr(e.target.value)} sx={{ flex: '1 1 130px' }} />
              <TextField label="Price / MRP (BDT)" size="small" type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} sx={{ flex: '1 1 130px' }} />
            </Stack>

            <Stack spacing={1.5} sx={{ mt: 1 }}>
              <Typography sx={{ fontWeight: 800 }}>Stages</Typography>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <TextField size="small" label="Stage name" value={newStageName} onChange={(e) => setNewStageName(e.target.value)} />
                <TextField size="small" label="Duration (mins)" type="number" value={newStageDuration} onChange={(e) => setNewStageDuration(e.target.value)} />
                <Button
                  variant="outlined"
                  onClick={() => {
                    if (!newStageName.trim()) return
                    const dur = parseFloat(newStageDuration)
                    if (isNaN(dur) || dur <= 0) return
                    setEditStages((current) => [
                      ...current,
                      { id: newStageId(), name: newStageName.trim(), order: current.length + 1, durationMins: dur },
                    ])
                    setNewStageName('')
                    setNewStageDuration('')
                  }}
                >
                  Add stage
                </Button>
              </Stack>
              {editStages.length ? (
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                  {editStages.map((stage) => (
                    <Chip
                      key={stage.id}
                      label={`${stage.order}. ${stage.name} (${stage.durationMins}m)`}
                      onDelete={() => setEditStages((current) => current.filter((item) => item.id !== stage.id).map((item, i) => ({ ...item, order: i + 1 })))}
                    />
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">No stages defined.</Typography>
              )}
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditId(null)}>Cancel</Button>
          <Button variant="contained" onClick={() => void submitEdit()} disabled={saving}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Page>
  )
}
