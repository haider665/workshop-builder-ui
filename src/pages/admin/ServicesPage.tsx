import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { Edit, MiscellaneousServices, ToggleOff, ToggleOn } from '@mui/icons-material'
import { useEffect, useMemo, useState } from 'react'
import { Page } from '../../components/Page'
import { DataTable } from '../../components/DataTable'
import { FormDialog } from '../../components/FormDialog'
import type { Column } from '../../components/DataTable'
import type { CWService, CWServiceSeverity, CWServiceStageDefinition, CWShop, CWVehicleSize } from '../../types/cw'
import { shopsService } from '../../services/admin/shopsService'
import { servicesService } from '../../services/admin/servicesService'
import { colors, radii, shadows } from '../../theme/tokens'

/* ─────────────────────── Helpers ─────────────────────────── */

function fmt(n: number) {
  return n.toLocaleString('en-BD')
}

const VEHICLE_SIZES: CWVehicleSize[] = ['Small', 'Medium', 'Large']
const SEVERITIES: CWServiceSeverity[] = ['Light', 'Medium', 'Severe']

function newStageId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const btnSx = {
  bgcolor: colors.slate[900],
  fontWeight: 600,
  borderRadius: '10px',
  px: 2.5,
  '&:hover': { bgcolor: colors.slate[800] },
} as const

/* ─────────────────────── Component ─────────────────────────── */

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

  /* ── CRUD Operations ── */

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



  /* ── Shared form fields ── */

  function renderServiceFormFields(
    codeVal: string, setCodeVal: (v: string) => void,
    categoryVal: string, setCategoryVal: (v: string) => void,
    sectionVal: string, setSectionVal: (v: string) => void,
    descriptionVal: string, setDescriptionVal: (v: string) => void,
    vehicleSizeVal: CWVehicleSize | '', setVehicleSizeVal: (v: CWVehicleSize | '') => void,
    severityVal: CWServiceSeverity | '', setSeverityVal: (v: CWServiceSeverity | '') => void,
    processTimeVal: string, setProcessTimeVal: (v: string) => void,
    ratePerHrVal: string, setRatePerHrVal: (v: string) => void,
    priceVal: string, setPriceVal: (v: string) => void,
    shopIdVal: string, setShopIdVal: (v: string) => void,
  ) {
    return (
      <>
        <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
          <TextField label="Code" size="small" value={codeVal} onChange={(e) => setCodeVal(e.target.value)} sx={{ flex: '1 1 120px' }} />
          <TextField label="Category" size="small" value={categoryVal} onChange={(e) => setCategoryVal(e.target.value)} sx={{ flex: '1 1 160px' }} placeholder="e.g. Engine" />
          <TextField label="Section" size="small" value={sectionVal} onChange={(e) => setSectionVal(e.target.value)} sx={{ flex: '1 1 160px' }} placeholder="e.g. Lubrication" />
          <FormControl size="small" sx={{ flex: '1 1 180px' }}>
            <InputLabel>Shop</InputLabel>
            <Select label="Shop" value={shopIdVal} onChange={(e) => setShopIdVal(e.target.value)}>
              {activeShops.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>
        <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
          <TextField label="Description" size="small" value={descriptionVal} onChange={(e) => setDescriptionVal(e.target.value)} sx={{ flex: '2 1 300px' }} />
          <FormControl size="small" sx={{ flex: '1 1 120px' }}>
            <InputLabel>Size</InputLabel>
            <Select label="Size" value={vehicleSizeVal} onChange={(e) => setVehicleSizeVal(e.target.value as CWVehicleSize)}>
              <MenuItem value="">— Any —</MenuItem>
              {VEHICLE_SIZES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ flex: '1 1 120px' }}>
            <InputLabel>Severity</InputLabel>
            <Select label="Severity" value={severityVal} onChange={(e) => setSeverityVal(e.target.value as CWServiceSeverity)}>
              <MenuItem value="">— Any —</MenuItem>
              {SEVERITIES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <TextField label="Process Time (mins)" size="small" type="number" value={processTimeVal} onChange={(e) => setProcessTimeVal(e.target.value)} sx={{ flex: '1 1 100px' }} />
          <TextField label="Rate/hr (BDT)" size="small" type="number" value={ratePerHrVal} onChange={(e) => setRatePerHrVal(e.target.value)} sx={{ flex: '1 1 130px' }} placeholder="Optional" />
          <TextField label="Price / MRP (BDT)" size="small" type="number" value={priceVal} onChange={(e) => setPriceVal(e.target.value)} sx={{ flex: '1 1 130px' }} />
        </Stack>
      </>
    )
  }

  /* ── Stages inline editor ── */

  function renderStagesSection(
    stageList: CWServiceStageDefinition[],
    onDelete: (id: string) => void,
    onAdd: () => void,
  ) {
    return (
      <Stack spacing={1.5} sx={{ mt: 2 }}>
        <Typography sx={{ fontWeight: 700, color: colors.slate[900], fontSize: '0.9rem' }}>Stages</Typography>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField size="small" label="Stage name" value={newStageName} onChange={(e) => setNewStageName(e.target.value)} />
          <TextField size="small" label="Duration (mins)" type="number" value={newStageDuration} onChange={(e) => setNewStageDuration(e.target.value)} />
          <Button variant="outlined" onClick={onAdd} sx={{ borderColor: colors.slate[300], color: colors.slate[700] }}>
            Add stage
          </Button>
        </Stack>
        {stageList.length ? (
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            {stageList.map((stage) => (
              <Chip key={stage.id} label={`${stage.order}. ${stage.name} (${stage.durationMins}m)`} onDelete={() => onDelete(stage.id)} />
            ))}
          </Stack>
        ) : (
          <Typography sx={{ color: colors.slate[500], fontSize: '0.85rem' }}>No stages added yet.</Typography>
        )}
      </Stack>
    )
  }

  function addStageToEdit() {
    if (!newStageName.trim()) return
    const dur = parseFloat(newStageDuration)
    if (isNaN(dur) || dur <= 0) return
    setEditStages((current) => [
      ...current,
      { id: newStageId(), name: newStageName.trim(), order: current.length + 1, durationMins: dur },
    ])
    setNewStageName('')
    setNewStageDuration('')
  }

  /* ── Table columns ── */

  const columns: Column<CWService>[] = [
    {
      key: 'code',
      header: 'Code',
      minWidth: 100,
      render: (s) => (
        <Typography sx={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.85rem', color: colors.slate[900] }}>
          {s.code}
        </Typography>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (s) => <Chip size="small" label={s.category} variant="outlined" />,
    },
    {
      key: 'section',
      header: 'Section',
      render: (s) => <Typography sx={{ fontSize: '0.85rem', color: colors.slate[500] }}>{s.section ?? '—'}</Typography>,
    },
    {
      key: 'description',
      header: 'Description',
      minWidth: 160,
      render: (s) => <Typography sx={{ fontSize: '0.85rem', color: colors.slate[700] }}>{s.description}</Typography>,
    },
    {
      key: 'shop',
      header: 'Shop',
      render: (s) => <Chip size="small" label={shopById.get(s.shopId)?.name ?? '—'} variant="outlined" />,
    },
    {
      key: 'size',
      header: 'Size',
      render: (s) => s.vehicleSize ? <Chip size="small" label={s.vehicleSize} color="info" variant="outlined" /> : <Typography sx={{ color: colors.slate[400] }}>—</Typography>,
    },
    {
      key: 'severity',
      header: 'Severity',
      render: (s) => s.severity ? <Chip size="small" label={s.severity} color={s.severity === 'Severe' ? 'error' : s.severity === 'Medium' ? 'warning' : 'default'} variant="outlined" /> : <Typography sx={{ color: colors.slate[400] }}>—</Typography>,
    },
    {
      key: 'time',
      header: 'Time (m)',
      align: 'right',
      render: (s) => <Typography sx={{ fontSize: '0.85rem', color: colors.slate[700] }}>{s.processTimeMins}</Typography>,
    },
    {
      key: 'price',
      header: 'MRP (BDT)',
      align: 'right',
      render: (s) => <Typography sx={{ fontWeight: 600, color: colors.slate[900], fontSize: '0.85rem' }}>{fmt(s.price)}</Typography>,
    },
    {
      key: 'stages',
      header: 'Stages',
      render: (s) => s.stages?.length ? <Chip size="small" label={`${s.stages.length} stages`} color="primary" variant="outlined" /> : <Typography sx={{ color: colors.slate[400] }}>—</Typography>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (s) => <Chip size="small" label={s.status} color={s.status === 'Active' ? 'success' : 'default'} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (s) => (
        <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); startEdit(s.id) }} disabled={saving}>
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={s.status === 'Active' ? 'Deactivate' : 'Activate'}>
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); void toggleStatus(s) }} disabled={saving}>
              {s.status === 'Active' ? <ToggleOff fontSize="small" /> : <ToggleOn fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ]

  /* ── Custom row rendering to support Collapse ── */
  /* Since DataTable doesn't support expand/collapse, we keep inline table but style it with tokens */

  return (
    <Page
      title="Services"
      subtitle="Manage service catalogue used in appointments."
      actions={
        <Button variant="contained" onClick={() => setAddOpen((v) => !v)} disabled={saving} sx={btnSx}>
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
        <Alert onClose={() => setSuccessOpen(false)} severity="success" variant="filled" sx={{ width: '100%', borderRadius: '10px' }}>
          {successMessage}
        </Alert>
      </Snackbar>

      {error ? (
        <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }}>
          {error}
        </Alert>
      ) : null}

      <Stack spacing={2}>
        {/* ── Inline Add Form ── */}
        {addOpen ? (
          <Box
            sx={{
              p: 2.5,
              borderRadius: radii.lg,
              border: `2px solid ${colors.slate[900]}`,
              background: colors.bg.card,
              boxShadow: shadows.card,
            }}
          >
            <Typography sx={{ fontWeight: 700, mb: 2, color: colors.slate[900] }}>New Service</Typography>
            <Stack spacing={2}>
              {renderServiceFormFields(
                code, setCode,
                category, setCategory,
                section, setSection,
                description, setDescription,
                vehicleSize, setVehicleSize,
                severity, setSeverity,
                processTimeMins, setProcessTimeMins,
                ratePerHr, setRatePerHr,
                price, setPrice,
                shopId, setShopId,
              )}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="contained" onClick={() => void submitAdd()} disabled={saving} sx={btnSx}>
                  Save
                </Button>
              </Box>
            </Stack>

            {renderStagesSection(
              stages,
              (id) => removeCreateStage(id),
              addStageToCreate,
            )}
          </Box>
        ) : null}

        {/* ── Filter Bar ── */}
        <Box
          sx={{
            p: 2,
            borderRadius: radii.lg,
            border: `1px solid ${colors.border.default}`,
            background: colors.bg.card,
            boxShadow: shadows.card,
          }}
        >
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
        </Box>

        <Typography sx={{ fontSize: '0.8rem', color: colors.slate[500] }}>
          {hasFilter
            ? `Showing ${displayRows.length} of ${services.length} services`
            : `${services.length} services — use filters above to search`}
        </Typography>

        {/* ── Services Table ── */}
        <DataTable
          columns={columns}
          rows={displayRows}
          keyExtractor={(s) => s.id}
          loading={loading}
          loadingRows={8}
          emptyIcon={<MiscellaneousServices />}
          emptyTitle={hasFilter ? 'No matching services' : 'No services yet'}
          emptyDescription={hasFilter ? 'Try adjusting your filters.' : 'Add your first service to the catalogue.'}
        />
      </Stack>

      {/* ── Edit Dialog ── */}
      <FormDialog
        open={editId !== null}
        onClose={() => setEditId(null)}
        title="Edit service"
        icon={<Edit />}
        onSubmit={() => void submitEdit()}
        submitLabel="Save"
        submitDisabled={saving}
        maxWidth="lg"
      >
        {renderServiceFormFields(
          editCode, setEditCode,
          editCategory, setEditCategory,
          editSection, setEditSection,
          editDescription, setEditDescription,
          editVehicleSize, setEditVehicleSize,
          editSeverity, setEditSeverity,
          editProcessTimeMins, setEditProcessTimeMins,
          editRatePerHr, setEditRatePerHr,
          editPrice, setEditPrice,
          editShopId, setEditShopId,
        )}
        {renderStagesSection(
          editStages,
          (id) => setEditStages((current) => current.filter((item) => item.id !== id).map((item, i) => ({ ...item, order: i + 1 }))),
          addStageToEdit,
        )}
      </FormDialog>
    </Page>
  )
}

