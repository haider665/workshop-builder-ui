import {
  Autocomplete,
  Box,
  Button,
  Chip,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { Add, Edit, Inventory, ToggleOff, ToggleOn } from '@mui/icons-material'
import { useEffect, useState } from 'react'
import { DataTable } from '../../components/DataTable'
import { FormDialog } from '../../components/FormDialog'
import type { Column } from '../../components/DataTable'
import { workshopApi } from '../../services/workshopApi'
import type { CWPart, CWPartStatus } from '../../types/cw'
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
  modelVariant: string
  rackLocation: string
  binNumber: string
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
    modelVariant: '',
    rackLocation: '',
    binNumber: '',
    reorderLevel: '',
    defaultSellPrice: '',
    stockCount: '',
    status: 'Active',
  }
}

function toDraft(part: CWPart): PartDraft {
  return {
    name: part.name,
    partNumber: part.partNumber,
    description: part.description ?? '',
    defaultSellPrice: part.defaultSellPrice != null ? String(part.defaultSellPrice) : '',
    category: part.category ?? '',
    brand: part.brand ?? '',
    modelVariant: part.modelVariant ?? '',
    rackLocation: part.rackLocation ?? '',
    binNumber: part.binNumber ?? '',
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
  const modelOptions = [...new Set(vehicles.map((v) => v.modelVariant || v.model).filter(Boolean)), 'Universal']

  const [parts, setParts] = useState<CWPart[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      partNumber: draft.partNumber.trim(),
      description: draft.description.trim() || undefined,
      category: draft.category || undefined,
      brand: draft.brand.trim() || undefined,
      modelVariant: draft.modelVariant.trim() || undefined,
      rackLocation: draft.rackLocation.trim() || undefined,
      binNumber: draft.binNumber.trim() || undefined,
      reorderLevel: draft.reorderLevel.trim() ? Number(draft.reorderLevel.trim()) : undefined,
      defaultSellPrice: draft.defaultSellPrice.trim() ? Number(draft.defaultSellPrice.trim()) : undefined,
      stockCount: draft.stockCount.trim() ? Number(draft.stockCount.trim()) : 0,
      status: draft.status,
      createdByUserId: sessionUser?.id,
    })
      setCreateOpen(false)
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
      partNumber: draft.partNumber.trim(),
      description: draft.description.trim() || undefined,
      category: draft.category || undefined,
      brand: draft.brand.trim() || undefined,
      modelVariant: draft.modelVariant.trim() || undefined,
      rackLocation: draft.rackLocation.trim() || undefined,
      binNumber: draft.binNumber.trim() || undefined,
      reorderLevel: draft.reorderLevel.trim() ? Number(draft.reorderLevel.trim()) : undefined,
      stockCount: draft.stockCount.trim() ? Number(draft.stockCount.trim()) : 0,
      status: draft.status,
    })
      setEditPart(null)
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
      render: (part) => (
        <Typography sx={{ fontSize: '0.875rem', color: colors.slate[600] }}>
          {part.partNumber}
        </Typography>
      ),
    },
    {
      key: 'category',
      header: 'Category',
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
            label="Part Name"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            required
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
          <Autocomplete
            freeSolo
            options={modelOptions}
            value={draft.modelVariant}
            onInputChange={(_e, val) => setDraft((d) => ({ ...d, modelVariant: val }))}
            renderInput={(params) => (
              <TextField {...params} label="Model Variant" placeholder="Select or type model" fullWidth />
            )}
          />
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
          <TextField
            label="Bin Number"
            value={draft.binNumber}
            onChange={(e) => setDraft((d) => ({ ...d, binNumber: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Reorder Level"
            type="number"
            value={draft.reorderLevel}
            onChange={(e) => setDraft((d) => ({ ...d, reorderLevel: e.target.value }))}
            fullWidth
          />
        </FormDialog>
      </Stack>
    </Box>
  )
}
