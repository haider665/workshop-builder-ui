import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { Add, Close, Edit, History, Inventory, ToggleOff, ToggleOn, Visibility } from '@mui/icons-material'
import { useEffect, useState } from 'react'
import { DataTable } from '../../components/DataTable'
import { FormDialog } from '../../components/FormDialog'
import type { Column } from '../../components/DataTable'
import { workshopApi } from '../../services/workshopApi'
import type { CWPart, CWPartStatus, CWPartStockUnit } from '../../types/cw'
import { colors, pageLayout } from '../../theme/tokens'
import { useSessionStore } from '../../store/sessionStore'
import { useCwStore } from '../../store/cwStore'

const BRAND_OPTIONS = [
  'Bosch', 'Denso', 'NGK', 'Brembo', 'Aisin', 'Monroe',
  'Philips', 'Mishimoto', 'Magnaflow', 'Walbro', 'K&N',
  'Mann', 'Hella', 'Continental', 'Valeo', 'Mahle',
  'ACDelco', 'Delphi', 'Gates', 'SKF', 'Toyota Genuine',
  'Honda Genuine', 'Hyundai Genuine', 'Nissan Genuine',
  'OEM Direct', 'Shell', 'Mobil', 'Castrol',
]

/* ─────────────────────── Helpers ─────────────────────────── */

const CATEGORY_PRESETS = [
  'Engine',
  'Brakes',
  'Body',
  'Electrical',
  'Cooling',
  'Transmission',
  'HVAC',
  'Paint',
  'Suspension',
  'Exhaust',
] as const

type PartDraft = {
  name: string
  partNumber: string
  description: string
  category: string
  brand: string
  manufacturer: string
  modelVariant: string
  modelYear: string
  rackLocation: string
  binNumber: string
  uom: string
  purchaseCategory: string
  salesDescription: string
  purchaseDescription: string
  vehicleFitment: string
  alternatePartNumbers: string
  mediaUrls: string
  isReturnable: boolean
  isComboProduct: boolean
  isSalesItem: boolean
  isPurchaseItem: boolean

  reorderLevel: string
  defaultSellPrice: string
  stockCount: string
  status: CWPartStatus
}

function emptyDraft(): PartDraft {
  return {
    name: '',
    partNumber: '',
    description: '',
    category: '',
    brand: '',
    manufacturer: '',
    modelVariant: '',
    modelYear: '',
    rackLocation: '',
    binNumber: '',
    uom: '',
    purchaseCategory: '',
    salesDescription: '',
    purchaseDescription: '',
    vehicleFitment: '',
    alternatePartNumbers: '',
    mediaUrls: '',
    isReturnable: false,
    isComboProduct: false,
    isSalesItem: true,
    isPurchaseItem: true,

    reorderLevel: '',
    defaultSellPrice: '',
    stockCount: '',
    status: 'Active',
  }
}

function toDraft(part: CWPart): PartDraft {
  return {
    name: part.itemName ?? part.name,
    partNumber: part.partNumber,
    description: part.description ?? '',
    defaultSellPrice: part.defaultSellPrice != null ? String(part.defaultSellPrice) : '',
    category: part.category ?? '',
    brand: part.brand ?? '',
    manufacturer: part.manufacturer ?? '',
    modelVariant: part.modelVariant ?? '',
    modelYear: part.modelYear ?? '',
    rackLocation: part.rackLocation ?? '',
    binNumber: part.binNumber ?? '',
    uom: part.uom ?? '',
    purchaseCategory: part.purchaseCategory ?? '',
    salesDescription: part.salesDescription ?? '',
    purchaseDescription: part.purchaseDescription ?? '',
    vehicleFitment: (part.vehicleFitment ?? []).join(', '),
    alternatePartNumbers: (part.alternatePartNumbers ?? []).join(', '),
    mediaUrls: (part.mediaUrls ?? []).join('\n'),
    isReturnable: part.isReturnable ?? false,
    isComboProduct: part.isComboProduct ?? false,
    isSalesItem: part.isSalesItem ?? true,
    isPurchaseItem: part.isPurchaseItem ?? true,

    reorderLevel: typeof part.reorderLevel === 'number' ? String(part.reorderLevel) : '',
    stockCount: typeof part.stockCount === 'number' ? String(part.stockCount) : '',
    status: part.status,
  }
}

const btnSx = {
  bgcolor: colors.slate[900],
  fontWeight: 600,
  borderRadius: '10px',
  px: 2.5,
  '&:hover': { bgcolor: colors.slate[800] },
} as const

/* ─────────────────────── Component ─────────────────────────── */

export function PartsPage() {
  const sessionUser = useSessionStore((s) => s.user)
  const vehicles = useCwStore((s) => s.vehicles)
  const getStockUnitsForPart = useCwStore((s) => s.getStockUnitsForPart)
  const modelOptions = [...new Set(vehicles.map((v) => v.modelVariant || v.model).filter(Boolean)), 'Universal']

  const [parts, setParts] = useState<CWPart[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  /* Stock lots dialog */
  const [lotsDialogOpen, setLotsDialogOpen] = useState(false)
  const [lotsPart, setLotsPart] = useState<CWPart | null>(null)
  const [lots, setLots] = useState<CWPartStockUnit[]>([])

  function openLotsDialog(part: CWPart) {
    setLotsPart(part)
    setLots(getStockUnitsForPart(part.id))
    setLotsDialogOpen(true)
  }

  const [createOpen, setCreateOpen] = useState(false)
  const [editPart, setEditPart] = useState<CWPart | null>(null)
  const [draft, setDraft] = useState<PartDraft>(emptyDraft())

  async function loadParts() {
    setLoading(true)
    setError(null)
    try {
      const response = await workshopApi.listParts({ pageSize: 100 })
      setParts(response.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load parts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadParts()
  }, [])

  function openCreate() {
    setDraft(emptyDraft())
    setCreateOpen(true)
  }

  function openEdit(part: CWPart) {
    setEditPart(part)
    setDraft(toDraft(part))
  }

  async function submitCreate() {
    if (!draft.name.trim() || !draft.partNumber.trim()) return
    setError(null)
    try {
      await workshopApi.createPart({
      name: draft.name.trim(),
      itemName: draft.name.trim(),
      partNumber: draft.partNumber.trim(),
      description: draft.description.trim() || undefined,
      category: draft.category || undefined,
      brand: draft.brand.trim() || undefined,
      manufacturer: draft.manufacturer.trim() || undefined,
      modelVariant: draft.modelVariant.trim() || undefined,
      modelYear: draft.modelYear.trim() || undefined,
      rackLocation: draft.rackLocation.trim() || undefined,
      binNumber: draft.binNumber.trim() || undefined,
      uom: draft.uom.trim() || undefined,
      purchaseCategory: draft.purchaseCategory.trim() || undefined,
      salesDescription: draft.salesDescription.trim() || undefined,
      purchaseDescription: draft.purchaseDescription.trim() || undefined,
      vehicleFitment: draft.vehicleFitment.split(',').map(v=>v.trim()).filter(Boolean),
      alternatePartNumbers: draft.alternatePartNumbers.split(',').map(v=>v.trim()).filter(Boolean),
      mediaUrls: draft.mediaUrls.split(/\n|,/).map(v=>v.trim()).filter(Boolean),
      isReturnable: draft.isReturnable, isComboProduct: draft.isComboProduct,
      isSalesItem: draft.isSalesItem, isPurchaseItem: draft.isPurchaseItem,

      reorderLevel: draft.reorderLevel.trim() ? Number(draft.reorderLevel.trim()) : undefined,
      defaultSellPrice: draft.defaultSellPrice.trim() ? Number(draft.defaultSellPrice.trim()) : undefined,
      stockCount: draft.stockCount.trim() ? Number(draft.stockCount.trim()) : 0,
      status: draft.status,
      createdByUserId: sessionUser?.id,
    })
      setCreateOpen(false)
      setSuccess('Part created successfully')
      await loadParts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create part')
    }
  }

  async function submitEdit() {
    if (!editPart || !draft.name.trim() || !draft.partNumber.trim()) return
    setError(null)
    try {
      await workshopApi.updatePart(editPart.id, {
      name: draft.name.trim(),
      itemName: draft.name.trim(),
      partNumber: draft.partNumber.trim(),
      description: draft.description.trim() || undefined,
      category: draft.category || undefined,
      brand: draft.brand.trim() || undefined,
      manufacturer: draft.manufacturer.trim() || undefined,
      modelVariant: draft.modelVariant.trim() || undefined,
      modelYear: draft.modelYear.trim() || undefined,
      rackLocation: draft.rackLocation.trim() || undefined,
      binNumber: draft.binNumber.trim() || undefined,
      uom: draft.uom.trim() || undefined,
      purchaseCategory: draft.purchaseCategory.trim() || undefined,
      salesDescription: draft.salesDescription.trim() || undefined,
      purchaseDescription: draft.purchaseDescription.trim() || undefined,
      vehicleFitment: draft.vehicleFitment.split(',').map(v=>v.trim()).filter(Boolean),
      alternatePartNumbers: draft.alternatePartNumbers.split(',').map(v=>v.trim()).filter(Boolean),
      mediaUrls: draft.mediaUrls.split(/\n|,/).map(v=>v.trim()).filter(Boolean),
      isReturnable: draft.isReturnable, isComboProduct: draft.isComboProduct,
      isSalesItem: draft.isSalesItem, isPurchaseItem: draft.isPurchaseItem,

      reorderLevel: draft.reorderLevel.trim() ? Number(draft.reorderLevel.trim()) : undefined,
      defaultSellPrice: draft.defaultSellPrice.trim() ? Number(draft.defaultSellPrice.trim()) : undefined,
      stockCount: draft.stockCount.trim() ? Number(draft.stockCount.trim()) : 0,
      status: draft.status,
    })
      setEditPart(null)
      setSuccess('Part updated successfully')
      await loadParts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update part')
    }
  }

  async function toggleStatus(part: CWPart) {
    const next: CWPartStatus = part.status === 'Active' ? 'Inactive' : 'Active'
    setError(null)
    try {
      await workshopApi.setPartStatus(part.id, next)
      await loadParts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update part status')
    }
  }

  const isDialogOpen = createOpen || !!editPart

  function closeDialog() {
    setCreateOpen(false)
    setEditPart(null)
  }

  /* ── Table Columns ── */

  const columns: Column<CWPart>[] = [
    {
      key: 'name',
      header: 'Part Name',
      sortable: true,
      sortValue: (part) => part.name.toLowerCase(),
      minWidth: 180,
      render: (part) => (
        <Typography sx={{ fontWeight: 600, color: colors.slate[900], fontSize: '0.875rem' }}>
          {part.name}
        </Typography>
      ),
    },
    {
      key: 'partNumber',
      header: 'Part Number',
      sortable: true,
      sortValue: (part) => part.partNumber,
      render: (part) => (
        <Typography sx={{ fontSize: '0.875rem', color: colors.slate[600] }}>
          {part.partNumber}
        </Typography>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      sortable: true,
      sortValue: (part) => part.category ?? '',
      render: (part) =>
        part.category ? (
          <Chip
            size="small"
            label={part.category}
            sx={{ fontWeight: 600, fontSize: '0.72rem' }}
          />
        ) : (
          <Typography sx={{ fontSize: '0.875rem', color: colors.slate[400] }}>—</Typography>
        ),
    },
    {
      key: 'brand',
      header: 'Brand',
      sortable: true,
      sortValue: (part) => part.brand ?? '',
      render: (part) => (
        <Typography sx={{ fontSize: '0.875rem', color: colors.slate[600] }}>
          {part.brand ?? '—'}
        </Typography>
      ),
    },
    {
      key: 'modelVariant',
      header: 'Model Variant',
      render: (part) => (
        <Typography sx={{ fontSize: '0.875rem', color: colors.slate[600] }}>
          {part.modelVariant ?? '—'}
        </Typography>
      ),
    },
    {
      key: 'stockCount',
      header: 'Stock',
      sortable: true,
      sortValue: (part) => part.stockCount ?? 0,
      render: (part) => {
        const count = part.stockCount ?? 0
        const reorderLevel = part.reorderLevel ?? 0
        const stockStatus = count === 0 ? 'Out of Stock' : count <= reorderLevel ? 'Low Stock' : 'In Stock'
        const color: 'success' | 'warning' | 'error' = stockStatus === 'In Stock' ? 'success' : stockStatus === 'Low Stock' ? 'warning' : 'error'
        return (
          <Stack spacing={0.5}>
            <Typography sx={{ fontSize: '0.875rem', color: colors.slate[700], fontWeight: 700 }}>
              {count} units
            </Typography>
            <Chip size="small" color={color} label={stockStatus} sx={{ fontWeight: 700, fontSize: '0.68rem', width: 'fit-content' }} />
          </Stack>
        )
      },
    },
    {
      key: 'defaultSellPrice',
      header: 'Sell Price',
      sortable: true,
      sortValue: (part) => part.defaultSellPrice ?? 0,
      render: (part) => (
        <Typography sx={{ fontSize: '0.875rem', color: colors.slate[700], fontWeight: 600 }}>
          {part.defaultSellPrice != null ? `৳${part.defaultSellPrice.toLocaleString()}` : '—'}
        </Typography>
      ),
    },
    {
      key: 'rackLocation',
      header: 'Rack Location',
      render: (part) => (
        <Typography sx={{ fontSize: '0.875rem', fontFamily: 'monospace', color: colors.slate[600] }}>
          {part.rackLocation ?? '—'}
        </Typography>
      ),
    },
    {
      key: 'reorderLevel',
      header: 'Reorder Level',
      render: (part) => (
        <Typography sx={{ fontSize: '0.875rem', color: colors.slate[700], fontWeight: 500 }}>
          {typeof part.reorderLevel === 'number' ? part.reorderLevel : '—'}
        </Typography>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      sortValue: (part) => part.status,
      render: (part) => (
        <Chip
          size="small"
          color={part.status === 'Active' ? 'success' : 'default'}
          label={part.status}
          sx={{ fontWeight: 700, fontSize: '0.72rem' }}
        />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (part) => (
        <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
          <Tooltip title="View Stock Lots">
            <IconButton size="small" onClick={() => openLotsDialog(part)} sx={{ color: colors.slate[600] }}>
              <Visibility fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => openEdit(part)}>
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={part.status === 'Active' ? 'Deactivate' : 'Activate'}>
            <IconButton size="small" onClick={() => toggleStatus(part)}>
              {part.status === 'Inactive' ? (
                <ToggleOn fontSize="small" />
              ) : (
                <ToggleOff fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ]

  /* ── Render ── */

  return (
    <>
    <Box sx={{ py: pageLayout.py, px: pageLayout.px }}>
      <Stack spacing={3.5}>
        {/* Header */}
        <Stack direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' }, gap: 2 }}>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.85rem' }, color: colors.slate[900], letterSpacing: '-0.02em' }}>
              Parts
            </Typography>
            <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>Manage the part catalog for service and repair.</Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={openCreate}
            sx={btnSx}
          >
            New Part
          </Button>
        </Stack>

        {error ? <Typography sx={{ color: colors.status.error, fontSize: '0.875rem' }}>{error}</Typography> : null}

        {/* Table */}
        <DataTable
          columns={columns}
          rows={parts}
          loading={loading}
          keyExtractor={(part) => part.id}
          emptyIcon={<Inventory />}
          emptyTitle="No parts yet"
          emptyDescription="Add parts to the catalog for SE part request workflow."
          emptyAction={
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={openCreate}
              sx={btnSx}
            >
              Add Part
            </Button>
          }
        />

        {/* ── Create / Edit Dialog ── */}
        <FormDialog
          open={isDialogOpen}
          onClose={closeDialog}
          title={editPart ? 'Edit Part' : 'Create Part'}
          icon={editPart ? <Edit /> : <Inventory />}
          onSubmit={editPart ? submitEdit : submitCreate}
          submitLabel={editPart ? 'Save' : 'Create'}
          submitDisabled={!draft.name.trim() || !draft.partNumber.trim()}
        >
          <TextField
            label="Item Name"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            required
            helperText="Human-readable ERP item name; this is different from the internal record ID."
            fullWidth
          />
          <TextField
            label="Part Number"
            value={draft.partNumber}
            onChange={(e) => setDraft((d) => ({ ...d, partNumber: e.target.value }))}
            required
            fullWidth
          />
          <TextField
            label="Default Sell Price (৳)"
            type="number"
            value={draft.defaultSellPrice}
            onChange={(e) => setDraft((d) => ({ ...d, defaultSellPrice: e.target.value }))}
            helperText="Default selling price for this part."
            fullWidth
          />
          <TextField
            label="Description"
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            multiline
            minRows={2}
            fullWidth
          />
          <TextField
            label="Category"
            value={draft.category}
            onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
            select
            fullWidth
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {CATEGORY_PRESETS.map((cat) => (
              <MenuItem key={cat} value={cat}>
                {cat}
              </MenuItem>
            ))}
          </TextField>
          <Autocomplete
            freeSolo
            options={BRAND_OPTIONS}
            value={draft.brand}
            onInputChange={(_e, val) => setDraft((d) => ({ ...d, brand: val }))}
            renderInput={(params) => (
              <TextField {...params} label="Brand" placeholder="Select or type brand" fullWidth />
            )}
          />
          <TextField label="Manufacturer" value={draft.manufacturer} onChange={(e) => setDraft((d) => ({ ...d, manufacturer: e.target.value }))} fullWidth />
          <Autocomplete
            freeSolo
            options={modelOptions}
            value={draft.modelVariant}
            onInputChange={(_e, val) => setDraft((d) => ({ ...d, modelVariant: val }))}
            renderInput={(params) => (
              <TextField {...params} label="Model Variant" placeholder="Select or type model" fullWidth />
            )}
          />
          <TextField label="Model Year" value={draft.modelYear} onChange={(e) => setDraft((d) => ({ ...d, modelYear: e.target.value }))} placeholder="e.g. 2020-2024" fullWidth />
          <Divider><Typography variant="caption">Inventory details</Typography></Divider>
          <TextField label="Stock Unit (UOM)" value={draft.uom} onChange={(e) => setDraft((d) => ({ ...d, uom: e.target.value }))} placeholder="e.g. Nos, PCS, Set" fullWidth />
          <TextField label="Purchase Category" value={draft.purchaseCategory} onChange={(e) => setDraft((d) => ({ ...d, purchaseCategory: e.target.value }))} select fullWidth><MenuItem value=""><em>None</em></MenuItem><MenuItem value="Local">Local</MenuItem><MenuItem value="Import">Import</MenuItem></TextField>
          <TextField
            label="Stock Count"
            type="number"
            value={draft.stockCount}
            onChange={(e) => setDraft((d) => ({ ...d, stockCount: e.target.value }))}
            helperText="Current stock quantity. Defaults to 0."
            fullWidth
          />
          <TextField
            label="Rack Location"
            value={draft.rackLocation}
            onChange={(e) => setDraft((d) => ({ ...d, rackLocation: e.target.value }))}
            placeholder="e.g. A-3-14"
            fullWidth
          />
          <TextField label="Bin Number" value={draft.binNumber} onChange={(e) => setDraft((d) => ({ ...d, binNumber: e.target.value }))} fullWidth />

          <TextField
            label="Reorder Level"
            type="number"
            value={draft.reorderLevel}
            onChange={(e) => setDraft((d) => ({ ...d, reorderLevel: e.target.value }))}
            fullWidth
          />
          <TextField label="Vehicle Fitment" value={draft.vehicleFitment} onChange={(e) => setDraft((d) => ({ ...d, vehicleFitment: e.target.value }))} helperText="Comma-separated vehicle/model/year values." multiline minRows={2} fullWidth />
          <TextField label="Alternative Part Numbers" value={draft.alternatePartNumbers} onChange={(e) => setDraft((d) => ({ ...d, alternatePartNumbers: e.target.value }))} helperText="Comma-separated supersession or interchange numbers." fullWidth />
          <TextField label="Sales Description" value={draft.salesDescription} onChange={(e) => setDraft((d) => ({ ...d, salesDescription: e.target.value }))} multiline minRows={2} fullWidth />
          <TextField label="Purchase Description" value={draft.purchaseDescription} onChange={(e) => setDraft((d) => ({ ...d, purchaseDescription: e.target.value }))} multiline minRows={2} fullWidth />
          <TextField label="Media URLs" value={draft.mediaUrls} onChange={(e) => setDraft((d) => ({ ...d, mediaUrls: e.target.value }))} helperText="One uploaded file URL per line." multiline minRows={2} fullWidth />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            <FormControlLabel control={<Checkbox checked={draft.isSalesItem} onChange={(e)=>setDraft(d=>({...d,isSalesItem:e.target.checked}))}/>} label="Sales item" />
            <FormControlLabel control={<Checkbox checked={draft.isPurchaseItem} onChange={(e)=>setDraft(d=>({...d,isPurchaseItem:e.target.checked}))}/>} label="Purchase item" />
            <FormControlLabel control={<Checkbox checked={draft.isReturnable} onChange={(e)=>setDraft(d=>({...d,isReturnable:e.target.checked}))}/>} label="Returnable" />
            <FormControlLabel control={<Checkbox checked={draft.isComboProduct} onChange={(e)=>setDraft(d=>({...d,isComboProduct:e.target.checked}))}/>} label="Combo product" />
          </Stack>
        </FormDialog>

        {/* ── Stock Lots Dialog ── */}
        <Dialog open={lotsDialogOpen} onClose={() => setLotsDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Inventory sx={{ color: '#1d4ed8' }} />
              <span>Stock Lots — {lotsPart?.name}</span>
            </Stack>
            <IconButton size="small" onClick={() => setLotsDialogOpen(false)}>
              <Close fontSize="small" />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            {lots.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography sx={{ color: colors.slate[400], fontSize: '0.9rem' }}>
                  No stock lots for this part. Stock units are created when goods are received via GRN.
                </Typography>
              </Box>
            ) : (
              <>
                <Stack direction="row" spacing={3} sx={{ mb: 2, p: 1.5, bgcolor: '#f8fafc', borderRadius: '8px' }}>
                  <Typography sx={{ fontSize: '0.8rem', color: colors.slate[600] }}>
                    <strong>Total Available:</strong> {lots.filter(l => l.status === 'Available').reduce((s, l) => s + l.quantity, 0)} units
                  </Typography>
                  <Typography sx={{ fontSize: '0.8rem', color: colors.slate[600] }}>
                    <strong>Total Lots:</strong> {lots.length}
                  </Typography>
                  <Typography sx={{ fontSize: '0.8rem', color: colors.slate[600] }}>
                    <strong>FIFO Sell Price:</strong> {(() => {
                      const avail = lots.filter(l => l.status === 'Available' && l.quantity > 0)
                      return avail.length > 0 ? `৳${avail[0].sellPrice.toLocaleString()}` : '—'
                    })()}
                  </Typography>
                </Stack>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: colors.slate[50] }}>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>PO #</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>GRN #</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Vendor</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }} align="right">Qty</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }} align="right">Cost</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }} align="right">Sell</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Location</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Received</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {lots.map((lot) => (
                        <TableRow key={lot.id} sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                          <TableCell sx={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{lot.poNumber || '—'}</TableCell>
                          <TableCell sx={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{lot.grnNumber || '—'}</TableCell>
                          <TableCell sx={{ fontSize: '0.8rem' }}>{lot.vendorName || '—'}</TableCell>
                          <TableCell sx={{ fontSize: '0.8rem', fontWeight: 700 }} align="right">
                            {lot.quantity} / {lot.initialQuantity}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.8rem' }} align="right">৳{lot.costPrice.toLocaleString()}</TableCell>
                          <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600 }} align="right">৳{lot.sellPrice.toLocaleString()}</TableCell>
                          <TableCell sx={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{lot.rackLocation || '—'}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={lot.status}
                              sx={{
                                fontWeight: 600,
                                fontSize: '0.68rem',
                                bgcolor: lot.status === 'Available' ? '#ecfdf5' : lot.status === 'Consumed' ? '#f1f5f9' : '#fffbeb',
                                color: lot.status === 'Available' ? '#047857' : lot.status === 'Consumed' ? '#64748b' : '#b45309',
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', color: colors.slate[500] }}>
                            {new Date(lot.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}

            {/* ── Restock History ── */}
            {lots.length > 0 && (() => {
              // Group stock units by GRN number for receipt-level view
              const grnMap = new Map<string, CWPartStockUnit[]>()
              lots.forEach((lot) => {
                const key = lot.grnNumber || `ungrouped-${lot.id}`
                const arr = grnMap.get(key) ?? []
                arr.push(lot)
                grnMap.set(key, arr)
              })
              const grnEntries = [...grnMap.entries()].sort((a, b) => {
                const dateA = Math.min(...a[1].map(l => new Date(l.createdAt).getTime()))
                const dateB = Math.min(...b[1].map(l => new Date(l.createdAt).getTime()))
                return dateB - dateA // newest first
              })
              return (
                <>
                  <Divider sx={{ my: 3 }} />
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
                    <History sx={{ color: '#7c3aed', fontSize: '1.3rem' }} />
                    <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: colors.slate[800] }}>
                      Restock History
                    </Typography>
                    <Chip size="small" label={`${grnEntries.length} receipts`} sx={{ fontWeight: 600, fontSize: '0.68rem', bgcolor: '#f5f3ff', color: '#7c3aed' }} />
                  </Stack>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f3ff' }}>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>GRN #</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>PO #</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Vendor</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }} align="right">Received</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }} align="right">Sell Price</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Date</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {grnEntries.map(([grnNum, units]) => {
                          const totalInitial = units.reduce((s, u) => s + u.initialQuantity, 0)
                          const first = units[0]
                          const dateStr = new Date(first.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                          return (
                            <TableRow key={grnNum} sx={{ '&:hover': { bgcolor: '#faf5ff' } }}>
                              <TableCell sx={{ fontSize: '0.8rem', fontFamily: 'monospace', fontWeight: 600 }}>
                                {first.grnNumber || '—'}
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>
                                {first.poNumber || '—'}
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.8rem' }}>
                                {first.vendorName || '—'}
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.8rem', fontWeight: 700 }} align="right">
                                {totalInitial}
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600 }} align="right">
                                ৳{first.sellPrice.toLocaleString()}
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.75rem', color: colors.slate[500] }}>
                                {dateStr}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )
            })()}
          </DialogContent>
        </Dialog>
      </Stack>
    </Box>

      {/* Success Snackbar */}
      <Snackbar
        open={!!success}
        autoHideDuration={3000}
        onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSuccess(null)} severity="success" sx={{ width: '100%', fontWeight: 600 }}>
          {success}
        </Alert>
      </Snackbar>

      {/* Error Snackbar */}
      <Snackbar
        open={!!error}
        autoHideDuration={5000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%', fontWeight: 600 }}>
          {error}
        </Alert>
      </Snackbar>
    </>
  )
}
