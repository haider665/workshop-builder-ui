import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
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
import React, { useMemo, useState } from 'react'
import { Page } from '../../components/Page'
import { useCwStore } from '../../store/cwStore'
import type { CWServiceSeverity, CWServiceStageDefinition, CWVehicleSize } from '../../types/cw'

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
  const services = useCwStore((s) => s.services)
  const createService = useCwStore((s) => s.createService)
  const updateService = useCwStore((s) => s.updateService)
  const setServiceStatus = useCwStore((s) => s.setServiceStatus)
  const shops = useCwStore((s) => s.shops)

  const activeShops = useMemo(() => shops.filter((s) => s.status === 'Active'), [shops])
  const shopById = useMemo(() => new Map(shops.map((s) => [s.id, s])), [shops])

  const [filterCat, setFilterCat] = useState('')
  const [filterQuery, setFilterQuery] = useState('')
  const [filterShop, setFilterShop] = useState('')
  const [filterSize, setFilterSize] = useState('')

  // Add form
  const [addOpen, setAddOpen] = useState(false)
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

  // Edit form
  const [editId, setEditId] = useState<string | null>(null)
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

  // Stage management
  const [stageViewId, setStageViewId] = useState<string | null>(null)
  const [newStageName, setNewStageName] = useState('')
  const [newStageDuration, setNewStageDuration] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [successOpen, setSuccessOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 50

  // Dynamic categories from data
  const categories = useMemo(() => {
    const cats = new Set(services.map((s) => s.category))
    return [...cats].sort()
  }, [services])

  // Only filter when user has set at least one filter
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

  // Reset page when filters change
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const pagedRows = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)

  function submitAdd() {
    try {
      setError(null)
      if (!code.trim()) throw new Error('Code is required')
      if (!category.trim()) throw new Error('Category is required')
      if (!description.trim()) throw new Error('Description is required')
      const t = parseFloat(processTimeMins)
      const r = ratePerHr.trim() ? parseFloat(ratePerHr) : undefined
      const p = parseFloat(price)
      if (isNaN(t) || t <= 0) throw new Error('Valid process time (mins) is required')
      if (r !== undefined && (isNaN(r) || r <= 0)) throw new Error('Valid rate/hr is required')
      if (isNaN(p) || p <= 0) throw new Error('Valid price is required')
      if (!shopId) throw new Error('Shop is required')
      const svc = createService({
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
      })
      setCode(''); setCategory(''); setSection(''); setDescription(''); setVehicleSize(''); setSeverity('')
      setProcessTimeMins(''); setRatePerHr(''); setPrice(''); setShopId('')
      setAddOpen(false)
      setSuccessMessage(`Service created: ${svc.code}`)
      setSuccessOpen(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function startEdit(id: string) {
    const s = services.find((x) => x.id === id)
    if (!s) return
    setEditId(id)
    setEditCode(s.code)
    setEditCategory(s.category)
    setEditSection(s.section ?? '')
    setEditDescription(s.description)
    setEditVehicleSize(s.vehicleSize ?? '')
    setEditSeverity(s.severity ?? '')
    setEditProcessTimeMins(String(s.processTimeMins))
    setEditRatePerHr(s.ratePerHr != null ? String(s.ratePerHr) : '')
    setEditPrice(String(s.price))
    setEditShopId(s.shopId ?? '')
    setError(null)
  }

  function submitEdit() {
    try {
      setError(null)
      if (!editId) return
      const svc = services.find((x) => x.id === editId)
      if (!svc) return
      const t = parseFloat(editProcessTimeMins)
      const r = editRatePerHr.trim() ? parseFloat(editRatePerHr) : undefined
      const p = parseFloat(editPrice)
      if (!editCode.trim()) throw new Error('Code is required')
      if (!editCategory.trim()) throw new Error('Category is required')
      if (!editDescription.trim()) throw new Error('Description is required')
      if (isNaN(t) || t <= 0) throw new Error('Valid process time (mins) is required')
      if (r !== undefined && (isNaN(r) || r <= 0)) throw new Error('Valid rate/hr is required')
      if (isNaN(p) || p <= 0) throw new Error('Valid price is required')
      updateService(editId, {
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
        stages: svc.stages,
        status: svc.status,
      })
      setEditId(null)
      setSuccessMessage('Service updated')
      setSuccessOpen(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function addStage(serviceId: string) {
    if (!newStageName.trim()) return
    const dur = parseFloat(newStageDuration)
    if (isNaN(dur) || dur <= 0) return
    const svc = services.find((s) => s.id === serviceId)
    if (!svc) return
    const existingStages = svc.stages ?? []
    const newStage: CWServiceStageDefinition = {
      id: newStageId(),
      name: newStageName.trim(),
      order: existingStages.length + 1,
      durationMins: dur,
    }
    updateService(serviceId, {
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
      stages: [...existingStages, newStage],
      status: svc.status,
    })
    setNewStageName('')
    setNewStageDuration('')
    setSuccessMessage(`Stage "${newStage.name}" added`)
    setSuccessOpen(true)
  }

  function removeStage(serviceId: string, stageId: string) {
    const svc = services.find((s) => s.id === serviceId)
    if (!svc || !svc.stages) return
    const updated = svc.stages.filter((s) => s.id !== stageId).map((s, i) => ({ ...s, order: i + 1 }))
    updateService(serviceId, {
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
      stages: updated.length ? updated : undefined,
      status: svc.status,
    })
  }

  return (
    <Page
      title="Admin / Services"
      subtitle="Manage service catalogue used in appointments."
      actions={
        <Button variant="contained" onClick={() => setAddOpen((v) => !v)}>
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

      <Stack spacing={2}>
        {error && <Alert severity="error">{error}</Alert>}

        {/* ── Add form ── */}
        {addOpen && (
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
                <Button variant="contained" onClick={submitAdd} sx={{ height: 40 }}>
                  Save
                </Button>
              </Stack>
            </Stack>
          </Paper>
        )}

        {/* ── Filters ── */}
        <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
          <TextField
            size="small"
            label="Search code or description"
            value={filterQuery}
            onChange={(e) => { setFilterQuery(e.target.value); setPage(0) }}
            sx={{ flex: '2 1 250px' }}
          />
          <FormControl size="small" sx={{ flex: '1 1 160px' }}>
            <InputLabel>Category</InputLabel>
            <Select label="Category" value={filterCat} onChange={(e) => { setFilterCat(e.target.value); setPage(0) }}>
              <MenuItem value="">All categories</MenuItem>
              {categories.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ flex: '1 1 140px' }}>
            <InputLabel>Shop</InputLabel>
            <Select label="Shop" value={filterShop} onChange={(e) => { setFilterShop(e.target.value); setPage(0) }}>
              <MenuItem value="">All shops</MenuItem>
              {activeShops.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ flex: '1 1 120px' }}>
            <InputLabel>Size</InputLabel>
            <Select label="Size" value={filterSize} onChange={(e) => { setFilterSize(e.target.value); setPage(0) }}>
              <MenuItem value="">All sizes</MenuItem>
              {VEHICLE_SIZES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>

        <Typography variant="body2" color="text.secondary">
          {hasFilter
            ? `Showing ${safePage * PAGE_SIZE + 1}–${Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} of ${filtered.length} results (${services.length} total)`
            : `${services.length} services — use filters above to search`}
        </Typography>

        {/* ── Table ── */}
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
              {pagedRows.map((s) =>
                editId === s.id ? (
                  <TableRow key={s.id} sx={{ bgcolor: 'action.hover' }}>
                    <TableCell><TextField size="small" value={editCode} onChange={(e) => setEditCode(e.target.value)} sx={{ width: 90 }} /></TableCell>
                    <TableCell><TextField size="small" value={editCategory} onChange={(e) => setEditCategory(e.target.value)} sx={{ width: 120 }} /></TableCell>
                    <TableCell><TextField size="small" value={editSection} onChange={(e) => setEditSection(e.target.value)} sx={{ width: 100 }} /></TableCell>
                    <TableCell><TextField size="small" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} sx={{ minWidth: 160 }} /></TableCell>
                    <TableCell>
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <Select value={editShopId} onChange={(e) => setEditShopId(e.target.value)}>
                          {activeShops.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      <FormControl size="small" sx={{ minWidth: 80 }}>
                        <Select value={editVehicleSize} onChange={(e) => setEditVehicleSize(e.target.value as CWVehicleSize)}>
                          <MenuItem value="">—</MenuItem>
                          {VEHICLE_SIZES.map((sz) => <MenuItem key={sz} value={sz}>{sz}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      <FormControl size="small" sx={{ minWidth: 80 }}>
                        <Select value={editSeverity} onChange={(e) => setEditSeverity(e.target.value as CWServiceSeverity)}>
                          <MenuItem value="">—</MenuItem>
                          {SEVERITIES.map((sv) => <MenuItem key={sv} value={sv}>{sv}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell align="right"><TextField size="small" type="number" value={editProcessTimeMins} onChange={(e) => setEditProcessTimeMins(e.target.value)} sx={{ width: 70 }} /></TableCell>
                    <TableCell align="right"><TextField size="small" type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} sx={{ width: 90 }} /></TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>—</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                        <Button size="small" variant="contained" onClick={submitEdit}>Save</Button>
                        <Button size="small" onClick={() => setEditId(null)}>Cancel</Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ) : (
                  <React.Fragment key={s.id}>
                    <TableRow key={s.id} hover sx={{ cursor: 'pointer' }} onClick={() => setStageViewId(stageViewId === s.id ? null : s.id)}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                          {s.code}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={s.category} variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">{s.section ?? '—'}</Typography>
                      </TableCell>
                      <TableCell>{s.description}</TableCell>
                      <TableCell><Chip size="small" label={shopById.get(s.shopId)?.name ?? '—'} variant="outlined" /></TableCell>
                      <TableCell>
                        {s.vehicleSize ? <Chip size="small" label={s.vehicleSize} color="info" variant="outlined" /> : '—'}
                      </TableCell>
                      <TableCell>
                        {s.severity ? <Chip size="small" label={s.severity} color={s.severity === 'Severe' ? 'error' : s.severity === 'Medium' ? 'warning' : 'default'} variant="outlined" /> : '—'}
                      </TableCell>
                      <TableCell align="right">{s.processTimeMins}</TableCell>
                      <TableCell align="right">
                        <Typography sx={{ fontWeight: 700 }}>{fmt(s.price)}</Typography>
                      </TableCell>
                      <TableCell>
                        {s.stages && s.stages.length > 0 ? (
                          <Chip size="small" label={`${s.stages.length} stages`} color="primary" variant="outlined" />
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={s.status}
                          color={s.status === 'Active' ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                          <Button size="small" onClick={(e) => { e.stopPropagation(); startEdit(s.id) }}>Edit</Button>
                          <Button
                            size="small"
                            color={s.status === 'Active' ? 'warning' : 'success'}
                            onClick={(e) => { e.stopPropagation(); setServiceStatus(s.id, s.status === 'Active' ? 'Inactive' : 'Active') }}
                          >
                            {s.status === 'Active' ? 'Deactivate' : 'Activate'}
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                    {/* Stage management expandable row */}
                    {stageViewId === s.id && (
                      <TableRow key={`${s.id}-stages`}>
                        <TableCell colSpan={12} sx={{ bgcolor: 'action.hover', py: 0 }}>
                          <Collapse in={stageViewId === s.id}>
                            <Box sx={{ p: 2 }}>
                              <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
                                Stages for {s.code} — {s.description}
                              </Typography>
                              {s.stages && s.stages.length > 0 ? (
                                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', mb: 1.5 }}>
                                  {s.stages.sort((a, b) => a.order - b.order).map((stage) => (
                                    <Chip
                                      key={stage.id}
                                      label={`${stage.order}. ${stage.name} (${stage.durationMins}m)`}
                                      onDelete={() => removeStage(s.id, stage.id)}
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
                              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                <TextField
                                  size="small"
                                  label="Stage name"
                                  value={newStageName}
                                  onChange={(e) => setNewStageName(e.target.value)}
                                  placeholder="e.g. Disassembly"
                                  sx={{ width: 200 }}
                                />
                                <TextField
                                  size="small"
                                  label="Duration (mins)"
                                  type="number"
                                  value={newStageDuration}
                                  onChange={(e) => setNewStageDuration(e.target.value)}
                                  sx={{ width: 130 }}
                                />
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => addStage(s.id)}
                                  disabled={!newStageName.trim() || !newStageDuration.trim()}
                                >
                                  + Add Stage
                                </Button>
                              </Stack>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ),
              )}
            </TableBody>
          </Table>

          {/* Pagination controls */}
          {filtered.length > PAGE_SIZE && (
            <Stack direction="row" spacing={1} sx={{ p: 1.5, justifyContent: 'center', alignItems: 'center', borderTop: '1px solid', borderColor: 'divider' }}>
              <Button size="small" disabled={safePage === 0} onClick={() => setPage(0)}>First</Button>
              <Button size="small" disabled={safePage === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>‹ Prev</Button>
              <Typography variant="body2" sx={{ fontWeight: 700, px: 1 }}>
                Page {safePage + 1} of {totalPages}
              </Typography>
              <Button size="small" disabled={safePage >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Next ›</Button>
              <Button size="small" disabled={safePage >= totalPages - 1} onClick={() => setPage(totalPages - 1)}>Last</Button>
            </Stack>
          )}

          {!hasFilter && (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary" sx={{ fontWeight: 600 }}>
                Use the filters above to search {services.length.toLocaleString()} services
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Filter by category, shop, size, or search by code/description
              </Typography>
            </Box>
          )}
          {hasFilter && filtered.length === 0 && (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">No services found</Typography>
            </Box>
          )}
        </Paper>
      </Stack>
    </Page>
  )
}
