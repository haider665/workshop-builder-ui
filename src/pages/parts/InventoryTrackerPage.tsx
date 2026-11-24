import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import {
  Add,
  CalendarToday,
  Edit,
  FilterList,
  Inventory,
  Search,
} from '@mui/icons-material'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { DataTable } from '../../components/DataTable'
import { FormDialog } from '../../components/FormDialog'
import type { Column } from '../../components/DataTable'
import { workshopApi } from '../../services/workshopApi'
import type { CWPartStatus } from '../../types/cw'
import type { AdjustStockInput, InventoryDetailResponse, InventoryPosition, UpdateInventoryInput } from '../../types/inventoryWorkflow'
import { colors, pageLayout, shadows, radii } from '../../theme/tokens'
import { useCwStore } from '../../store/cwStore'
import { useBackendData } from '../../hooks/useCREData'
import { useCompanyStore } from '../../store/companyStore'

/* ─────────────────────── Constants ─────────────────────────── */

const CATEGORY_PRESETS = [
  'Engine Parts',
  'Brake System',
  'Transmission',
  'Suspension',
  'Electrical',
  'Cooling',
  'Exhaust',
  'Fuel System',
  'Lighting',
  'Interior',
  'Body Parts',
  'Filters',
] as const

const BRAND_OPTIONS = [
  'Bosch', 'Denso', 'NGK', 'Brembo', 'Aisin', 'Monroe',
  'Philips', 'Mishimoto', 'Magnaflow', 'Walbro', 'K&N',
  'Mann', 'Hella', 'Continental', 'Valeo', 'Mahle',
  'ACDelco', 'Delphi', 'Gates', 'SKF', 'Toyota Genuine',
  'Honda Genuine', 'Hyundai Genuine', 'Nissan Genuine',
  'OEM Direct', 'Shell', 'Mobil', 'Castrol',
] as const

/* ─────────────────────── Types ──────────────────────────────── */

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
    status: 'Active',
  }
}

/* ─────────────────────── Styles ─────────────────────────────── */

const btnSx = {
  bgcolor: colors.slate[900],
  fontWeight: 600,
  borderRadius: '10px',
  px: 2.5,
  '&:hover': { bgcolor: colors.slate[800] },
} as const

const cardSx = {
  background: colors.bg.card,
  border: `1px solid ${colors.border.default}`,
  borderRadius: radii.lg,
  boxShadow: shadows.card,
  p: 3,
} as const

/* ─────────────────────── Helpers ────────────────────────────── */

type StockLevel = 'In Stock' | 'Low Stock' | 'Out of Stock'

const stockChipProps: Record<StockLevel, { bg: string; color: string }> = {
  'In Stock': { bg: '#dcfce7', color: '#166534' },
  'Low Stock': { bg: '#fef3c7', color: '#92400e' },
  'Out of Stock': { bg: '#fee2e2', color: '#991b1b' },
}

/* ─────────────────────── Component ──────────────────────────── */

export function InventoryTrackerPage() {
  const [positions, setPositions] = useState<InventoryPosition[]>([])
  const [warehouses, setWarehouses] = useState<Array<{ id: string; name: string }>>([])
  const [selectedWarehouse, setSelectedWarehouse] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  useBackendData()
  const [lowStockItems, setLowStockItems] = useState<Array<{ id: string; name: string; partNumber: string; reorderLevel: number; stockCount: number; remaining: number; vendorName?: string | null }>>([])
  const [slowMoverItems, setSlowMoverItems] = useState<Array<{ id: string; name: string; partNumber?: string; stockCount: number; daysInStock: number; lastMovementDate: string }>>([])
  const [vendorNames, setVendorNames] = useState<Record<string, string | null>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [activePosition, setActivePosition] = useState<InventoryPosition | null>(null)
  const [detail, setDetail] = useState<InventoryDetailResponse | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [editDraft, setEditDraft] = useState({ reorderLevel: '', rackLocation: '', binNumber: '', defaultSellPrice: '', reason: '' })
  const [stockOpen, setStockOpen] = useState(false)
  const [stockSaving, setStockSaving] = useState(false)
  const [stockDraft, setStockDraft] = useState({ quantity: '', valuationRate: '', postingDate: '', reason: '' })

  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [draft, setDraft] = useState<PartDraft>(emptyDraft())

  const vehicles = useCwStore((s) => s.vehicles)
  const selectedCompanyId = useCompanyStore((s) => s.selectedCompanyId)

  const modelOptions = useMemo(
    () => [...new Set(vehicles.map((v) => v.modelVariant || v.model).filter(Boolean) as string[]), 'Universal'],
    [vehicles],
  )

  const formatMoney = (value?: number) =>
    value != null ? `৳${value.toLocaleString('en-IN')}` : '—'

  async function loadDetail(position: InventoryPosition) {
    setActivePosition(position)
    setDetailOpen(true)
    setDetailLoading(true)
    setDetailError(null)
    try {
      const result = await workshopApi.getInventoryDetail({
        company: selectedCompanyId || undefined,
        partId: position.partId || undefined,
        itemCode: position.partId ? undefined : position.itemCode,
        warehouseId: position.warehouseId,
      })
      setDetail(result)
    } catch (err) {
      setDetail(null)
      setDetailError(err instanceof Error ? err.message : 'Failed to load inventory detail')
    } finally {
      setDetailLoading(false)
    }
  }

  const loadPositions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await workshopApi.listInventory({
        page,
        pageSize: 100,
        search: search || undefined,
        warehouse: selectedWarehouse || undefined,
      })
      setPositions(result.data)
      setWarehouses(result.meta.warehouses)
      setTotal(result.meta.total)
      const names: Record<string, string | null> = {}
      for (const row of result.data) {
        if (row.partId) names[row.partId] = row.preferredVendorName
      }
      setVendorNames(names)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory')
    } finally {
      setLoading(false)
    }
  }, [page, search, selectedWarehouse])

  const loadAlerts = useCallback(async () => {
    try {
      const [lowRes, slowRes] = await Promise.all([
        workshopApi.lowStockAlerts(10),
        workshopApi.slowMovers(90, 10),
      ])
      setLowStockItems(lowRes.items)
      setSlowMoverItems(slowRes.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory alerts')
    }
  }, [])

  useEffect(() => {
    setPage(1)
    setSelectedWarehouse('')
  }, [selectedCompanyId])

  useEffect(() => {
    if (selectedCompanyId) void loadAlerts()
  }, [loadAlerts, selectedCompanyId])

  useEffect(() => {
    if (selectedCompanyId) void loadPositions()
  }, [loadPositions, selectedCompanyId])

  /* ── Derived data ── */

  const lowStockParts = lowStockItems
  const slowMovers = slowMoverItems

  function getPreferredVendor(partId: string) {
    const name = vendorNames[partId]
    return name ? { name } : null
  }

  /* ── Dialog handlers ── */

  function openCreate() {
    setDraft(emptyDraft())
    setCreateOpen(true)
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
        reorderLevel: draft.reorderLevel.trim() ? Number(draft.reorderLevel) : undefined,
        defaultSellPrice: draft.defaultSellPrice.trim() ? Number(draft.defaultSellPrice) : undefined,
        status: draft.status,
      })
      setCreateOpen(false)
      await Promise.all([loadPositions(), loadAlerts()])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create part')
    }
  }

  function openEditDetails() {
    if (!detail?.part) return
    setEditDraft({
      reorderLevel: String(detail.part.reorderLevel ?? ''),
      rackLocation: detail.part.rackLocation ?? '',
      binNumber: detail.part.binNumber ?? '',
      defaultSellPrice: String(detail.part.defaultSellPrice ?? ''),
      reason: '',
    })
    setEditOpen(true)
  }

  async function submitEditDetails() {
    if (!detail?.part || !editDraft.reason.trim()) return
    setEditSaving(true)
    setDetailError(null)
    try {
      const payload: UpdateInventoryInput = {
        company: selectedCompanyId || undefined,
        partId: detail.part.id,
        reason: editDraft.reason.trim(),
      }
      if (editDraft.reorderLevel.trim()) payload.reorderLevel = Number(editDraft.reorderLevel)
      if (editDraft.rackLocation.trim()) payload.rackLocation = editDraft.rackLocation.trim()
      if (editDraft.binNumber.trim()) payload.binNumber = editDraft.binNumber.trim()
      if (editDraft.defaultSellPrice.trim()) payload.defaultSellPrice = Number(editDraft.defaultSellPrice)
      await workshopApi.updateInventoryDetails(payload)
      setEditOpen(false)
      await Promise.all([loadPositions(), loadAlerts()])
      await loadDetail(detail.position)
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Failed to update inventory details')
    } finally {
      setEditSaving(false)
    }
  }

  function openStockDialog() {
    setStockDraft({ quantity: '', valuationRate: '', postingDate: '', reason: '' })
    setStockOpen(true)
  }

  async function submitStockAdjustment() {
    if (!detail || !stockDraft.reason.trim()) return
    const quantity = Number(stockDraft.quantity)
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setDetailError('Quantity must be greater than zero.')
      return
    }
    setStockSaving(true)
    setDetailError(null)
    try {
      const payload: AdjustStockInput = {
        company: selectedCompanyId || undefined,
        partId: detail.part?.id || undefined,
        itemCode: detail.part ? undefined : detail.position.itemCode,
        warehouseId: detail.position.warehouseId,
        quantity,
        reason: stockDraft.reason.trim(),
      }
      if (stockDraft.valuationRate.trim()) payload.valuationRate = Number(stockDraft.valuationRate)
      if (stockDraft.postingDate) payload.postingDate = stockDraft.postingDate
      await workshopApi.adjustStock(payload)
      setStockOpen(false)
      await Promise.all([loadPositions(), loadAlerts()])
      await loadDetail(detail.position)
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Failed to add stock')
    } finally {
      setStockSaving(false)
    }
  }

  /* ── Table Columns ── */

  const columns: Column<InventoryPosition>[] = [
    {
      key: 'warehouse',
      header: 'Warehouse',
      minWidth: 150,
      render: (row) => (
        <Typography sx={{ fontWeight: 600, color: colors.slate[900], fontSize: '0.875rem' }}>
          {row.warehouseName}
        </Typography>
      ),
    },
    {
      key: 'partNumber',
      header: 'Part Number',
      minWidth: 140,
      render: (row) => (
        <Box>
          <Typography sx={{ fontWeight: 600, color: colors.slate[900], fontSize: '0.875rem' }}>
            {row.partNumber ?? row.itemCode}
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: colors.slate[400] }}>
            {row.itemCode}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'itemName',
      header: 'Name',
      minWidth: 180,
      render: (row) => (
        <Typography sx={{ fontWeight: 500, color: colors.slate[800], fontSize: '0.875rem' }}>
          {row.itemName}
        </Typography>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      minWidth: 110,
      render: (row) => {
        const chip = stockChipProps[row.stockStatus]
        return (
          <Chip
            size="small"
            label={row.stockStatus}
            sx={{
              fontWeight: 700,
              fontSize: '0.72rem',
              bgcolor: chip.bg,
              color: chip.color,
              border: 'none',
            }}
          />
        )
      },
    },
    {
      key: 'onHand',
      header: 'On Hand',
      align: 'right',
      render: (row) => (
        <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: colors.slate[700] }}>
          {row.onHand} units
        </Typography>
      ),
    },
    {
      key: 'available',
      header: 'Available / Projected',
      align: 'right',
      render: (row) => (
        <Box>
          <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: colors.slate[700] }}>
            {row.available} available
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: colors.slate[400] }}>
            {row.projected} projected
          </Typography>
        </Box>
      ),
    },
    {
      key: 'valuationRate',
      header: 'Valuation Rate',
      align: 'right',
      render: (row) => (
        <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: colors.slate[700] }}>
          {formatMoney(row.valuationRate)}
        </Typography>
      ),
    },
    {
      key: 'stockValue',
      header: 'Stock Value',
      align: 'right',
      render: (row) => (
        <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: colors.slate[700] }}>
          {formatMoney(row.stockValue)}
        </Typography>
      ),
    },
    {
      key: 'vendor',
      header: 'Preferred Vendor',
      render: (row) => (
        <Typography sx={{ fontSize: '0.875rem', color: colors.slate[600] }}>
          {row.preferredVendorName ?? '—'}
        </Typography>
      ),
    },
  ]

  /* ── Render ── */

  return (
    <Box sx={{ py: pageLayout.py, px: pageLayout.px }}>
      <Stack spacing={3.5}>
        {/* ── Header ── */}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          sx={{ justifyContent: 'space-between', alignItems: { md: 'center' }, gap: 2 }}
        >
          <Box>
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: { xs: '1.5rem', md: '1.85rem' },
                color: colors.slate[900],
                letterSpacing: '-0.02em',
              }}
            >
              Inventory Management
            </Typography>
            <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>
              Track live ERPNext stock positions by warehouse
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<Add />} onClick={openCreate} sx={btnSx}>
            + Add a Part
          </Button>
        </Stack>

        {/* ── Search & Filter Bar ── */}
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <TextField
            placeholder="Type to Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            fullWidth
            size="small"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: colors.slate[400], fontSize: 20 }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: radii.sm,
                bgcolor: colors.bg.card,
                '& fieldset': { borderColor: colors.border.default },
                '&:hover fieldset': { borderColor: colors.border.strong },
              },
            }}
          />
          <TextField
            select
            label="Warehouse"
            value={selectedWarehouse}
            onChange={(e) => {
              setSelectedWarehouse(e.target.value)
              setPage(1)
            }}
            size="small"
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">All Warehouses</MenuItem>
            {warehouses.map((warehouse) => (
              <MenuItem key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            endIcon={<CalendarToday sx={{ fontSize: 16 }} />}
            sx={{
              borderColor: colors.border.default,
              color: colors.slate[600],
              fontWeight: 600,
              borderRadius: radii.sm,
              px: 2.5,
              whiteSpace: 'nowrap',
              '&:hover': { borderColor: colors.border.strong, bgcolor: colors.bg.subtle },
            }}
          >
            Filter
          </Button>
        </Stack>

        {error ? <Typography sx={{ color: colors.status.error, fontSize: '0.875rem' }}>{error}</Typography> : null}

        {/* ── Inventory Table ── */}
        <DataTable
          columns={columns}
          rows={positions}
          loading={loading}
          onRowClick={(row) => void loadDetail(row)}
          keyExtractor={(row) => `${row.warehouseId}:${row.itemCode}`}
          emptyIcon={<Inventory />}
          emptyTitle="No stock positions found"
          emptyDescription="Receive stock or add a part to start tracking inventory."
          emptyAction={
            <Button variant="contained" startIcon={<Add />} onClick={openCreate} sx={btnSx}>
              Add Part
            </Button>
          }
        />

        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', justifyContent: 'flex-end' }}>
          <Typography sx={{ fontSize: '0.8125rem', color: colors.slate[500] }}>
            {total} stock positions
          </Typography>
          <Button
            size="small"
            variant="outlined"
            disabled={page <= 1}
            onClick={() => setPage((value) => Math.max(value - 1, 1))}
          >
            Previous
          </Button>
          <Typography sx={{ fontSize: '0.8125rem', color: colors.slate[600] }}>Page {page}</Typography>
          <Button
            size="small"
            variant="outlined"
            disabled={page * 100 >= total}
            onClick={() => setPage((value) => value + 1)}
          >
            Next
          </Button>
        </Stack>

        {/* ── Dashboard Cards ── */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
          {/* ── Low Stock Alerts Card ── */}
          <Box sx={{ ...cardSx, flex: 1 }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2.5 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: colors.slate[900] }}>
                Low Stock Alerts
              </Typography>
              <Chip
                size="small"
                label={`${lowStockParts.length} items`}
                sx={{
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  bgcolor: '#fff7ed',
                  color: '#9a3412',
                }}
              />
            </Stack>

            <Stack spacing={1.5}>
              {lowStockParts.slice(0, 6).map((part) => {
                const vendor = getPreferredVendor(part.id)
                const count = part.stockCount ?? 0
                return (
                  <Box
                    key={part.id}
                    sx={{
                      borderLeft: `4px solid ${colors.accent.amber}`,
                      borderRadius: radii.sm,
                      border: `1px solid ${colors.border.default}`,
                      borderLeftColor: colors.accent.amber,
                      borderLeftWidth: 4,
                      p: 2,
                    }}
                  >
                    <Stack
                      direction="row"
                      sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          sx={{ fontWeight: 700, fontSize: '0.875rem', color: colors.slate[900] }}
                        >
                          {part.name}
                        </Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: colors.slate[500], mt: 0.25 }}>
                          {part.partNumber}
                        </Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: colors.slate[500], mt: 0.25 }}>
                          Reorder: {part.reorderLevel ?? 0} units
                        </Typography>
                      </Box>
                      <Stack sx={{ alignItems: 'flex-end' }} spacing={0.5}>
                        <Chip
                          size="small"
                          label={`${count} left`}
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.7rem',
                            bgcolor: count === 0 ? '#fee2e2' : '#fff7ed',
                            color: count === 0 ? '#991b1b' : '#9a3412',
                            border: 'none',
                          }}
                        />
                        {vendor && (
                          <Typography
                            sx={{ fontSize: '0.72rem', color: colors.slate[400], textAlign: 'right' }}
                          >
                            {vendor.name}
                          </Typography>
                        )}
                      </Stack>
                    </Stack>
                  </Box>
                )
              })}

              {lowStockParts.length === 0 && (
                <Typography sx={{ fontSize: '0.875rem', color: colors.slate[400], py: 2, textAlign: 'center' }}>
                  No low stock alerts
                </Typography>
              )}
            </Stack>
          </Box>

          {/* ── Slow Moving Parts Card ── */}
          <Box sx={{ ...cardSx, flex: 1 }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2.5 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: colors.slate[900] }}>
                Slow Moving Parts
              </Typography>
              <Chip
                size="small"
                label="Review Needed"
                variant="outlined"
                sx={{
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  borderColor: colors.accent.orange,
                  color: colors.accent.orange,
                }}
              />
            </Stack>

            <Stack spacing={1.5}>
              {slowMovers.slice(0, 5).map((part) => {
                const days = part.daysInStock
                return (
                  <Box
                    key={part.id}
                    sx={{
                      borderRadius: radii.sm,
                      border: `1px solid ${colors.border.default}`,
                      p: 2,
                    }}
                  >
                    <Stack
                      direction="row"
                      sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}
                    >
                      <Box>
                        <Typography
                          sx={{ fontWeight: 700, fontSize: '0.875rem', color: colors.slate[900] }}
                        >
                          {part.name}
                        </Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: colors.slate[500], mt: 0.25 }}>
                          {part.stockCount ?? 0} units in stock
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography
                          sx={{ fontWeight: 700, fontSize: '0.875rem', color: colors.accent.orange }}
                        >
                          {days} days
                        </Typography>
                        <Typography sx={{ fontSize: '0.72rem', color: colors.slate[400] }}>
                          in stock
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>
                )
              })}

              {slowMovers.length === 0 && (
                <Typography sx={{ fontSize: '0.875rem', color: colors.slate[400], py: 2, textAlign: 'center' }}>
                  No slow movers detected
                </Typography>
              )}
            </Stack>

            {slowMovers.length > 0 && (
              <Typography
                sx={{
                  mt: 2,
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: colors.accent.blue,
                  cursor: 'pointer',
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                View All Slow Movers →
              </Typography>
            )}
          </Box>
        </Stack>

        {/* ── Add Part Dialog ── */}
        <FormDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          title="Add Part"
          icon={<Inventory />}
          onSubmit={submitCreate}
          submitLabel="Create"
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
            options={BRAND_OPTIONS as unknown as string[]}
            value={draft.brand}
            onInputChange={(_e, val) => setDraft((d) => ({ ...d, brand: val }))}
            renderInput={(params) => <TextField {...params} label="Brand" fullWidth />}
          />
          <Autocomplete
            freeSolo
            options={modelOptions}
            value={draft.modelVariant}
            onInputChange={(_e, val) => setDraft((d) => ({ ...d, modelVariant: val }))}
            renderInput={(params) => <TextField {...params} label="Model Variant" fullWidth />}
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
          <TextField
            label="Default Sell Price"
            type="number"
            value={draft.defaultSellPrice}
            onChange={(e) => setDraft((d) => ({ ...d, defaultSellPrice: e.target.value }))}
            fullWidth
          />
        </FormDialog>

        <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} fullWidth maxWidth="md">
          <DialogTitle sx={{ fontWeight: 700, color: colors.slate[900] }}>
            {activePosition
              ? `${activePosition.partNumber ?? activePosition.itemCode} · ${activePosition.warehouseName}`
              : 'Inventory Detail'}
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2.5}>
              {detailLoading ? (
                <Typography sx={{ fontSize: '0.875rem', color: colors.slate[500] }}>Loading inventory detail…</Typography>
              ) : null}
              {detailError ? (
                <Typography sx={{ fontSize: '0.875rem', color: colors.status.error }}>{detailError}</Typography>
              ) : null}
              {detail ? (
                <>
                  <Box>
                    <Typography sx={{ fontWeight: 700, color: colors.slate[900], mb: 1.25 }}>
                      Stock Position
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 1.5 }}>
                      <Typography sx={{ fontSize: '0.875rem', color: colors.slate[700] }}>
                        Source: <strong>{detail.position.source}</strong>
                      </Typography>
                      <Typography sx={{ fontSize: '0.875rem', color: colors.slate[700] }}>
                        Warehouse: <strong>{detail.position.warehouseName}</strong>
                      </Typography>
                      <Typography sx={{ fontSize: '0.875rem', color: colors.slate[700] }}>
                        On hand: <strong>{detail.position.onHand}</strong>
                      </Typography>
                      <Typography sx={{ fontSize: '0.875rem', color: colors.slate[700] }}>
                        Available: <strong>{detail.position.available}</strong>
                      </Typography>
                      <Typography sx={{ fontSize: '0.875rem', color: colors.slate[700] }}>
                        Projected: <strong>{detail.position.projected}</strong>
                      </Typography>
                      <Typography sx={{ fontSize: '0.875rem', color: colors.slate[700] }}>
                        Valuation: <strong>{formatMoney(detail.position.valuationRate)}</strong>
                      </Typography>
                    </Box>
                  </Box>

                  <Divider sx={{ borderColor: colors.border.subtle }} />

                  {detail.part ? (
                    <Box>
                      <Typography sx={{ fontWeight: 700, color: colors.slate[900], mb: 1.25 }}>
                        Part Catalogue
                      </Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 1.5 }}>
                        <Typography sx={{ fontSize: '0.875rem', color: colors.slate[700] }}>
                          Rack: <strong>{detail.part.rackLocation || '—'}</strong>
                        </Typography>
                        <Typography sx={{ fontSize: '0.875rem', color: colors.slate[700] }}>
                          Bin: <strong>{detail.part.binNumber || '—'}</strong>
                        </Typography>
                        <Typography sx={{ fontSize: '0.875rem', color: colors.slate[700] }}>
                          Reorder level: <strong>{detail.part.reorderLevel ?? 0}</strong>
                        </Typography>
                        <Typography sx={{ fontSize: '0.875rem', color: colors.slate[700] }}>
                          Default sell price: <strong>{formatMoney(detail.part.defaultSellPrice)}</strong>
                        </Typography>
                      </Box>
                    </Box>
                  ) : null}

                  {detail.item ? (
                    <Box>
                      <Typography sx={{ fontWeight: 700, color: colors.slate[900], mb: 1.25 }}>
                        ERPNext Item
                      </Typography>
                      <Typography sx={{ fontSize: '0.875rem', color: colors.slate[700] }}>
                        {detail.item.itemName} ({detail.item.itemCode}) · {detail.item.uom || '—'} · valuation{' '}
                        <strong>{formatMoney(detail.item.valuationRate)}</strong>
                      </Typography>
                    </Box>
                  ) : null}

                  <Divider sx={{ borderColor: colors.border.subtle }} />

                  <Box>
                    <Typography sx={{ fontWeight: 700, color: colors.slate[900], mb: 1.25 }}>
                      Recent Stock Movements
                    </Typography>
                    {detail.movements.length ? (
                      <Stack spacing={1}>
                        {detail.movements.map((movement) => (
                          <Box
                            key={movement.id}
                            sx={{
                              border: `1px solid ${colors.border.default}`,
                              borderRadius: radii.sm,
                              p: 1.5,
                            }}
                          >
                            <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}>
                              <Box>
                                <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: colors.slate[800] }}>
                                  {movement.voucherId} · {movement.voucherType}
                                </Typography>
                                <Typography sx={{ fontSize: '0.75rem', color: colors.slate[400] }}>
                                  {movement.postingDate || '—'} {movement.warehouseId}
                                </Typography>
                              </Box>
                              <Box sx={{ textAlign: 'right' }}>
                                <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: colors.slate[800] }}>
                                  {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                                </Typography>
                                <Typography sx={{ fontSize: '0.75rem', color: colors.slate[400] }}>
                                  balance {movement.balanceQty}
                                </Typography>
                              </Box>
                            </Stack>
                          </Box>
                        ))}
                      </Stack>
                    ) : (
                      <Typography sx={{ fontSize: '0.875rem', color: colors.slate[400] }}>
                        No stock movements recorded.
                      </Typography>
                    )}
                  </Box>

                  {!detail.permissions.canEdit && !detail.permissions.canAdjustStock ? (
                    <Typography sx={{ fontSize: '0.8125rem', color: colors.slate[500] }}>
                      Read-only view. Editing and manual stock receipts require a stock manager role.
                    </Typography>
                  ) : null}
                </>
              ) : null}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
            {detail?.permissions.canEdit ? (
              <Button startIcon={<Edit />} onClick={openEditDetails}>Edit details</Button>
            ) : null}
            {detail?.permissions.canAdjustStock ? (
              <Button variant="contained" startIcon={<Add />} onClick={openStockDialog} sx={btnSx}>
                Add stock
              </Button>
            ) : null}
            <Button onClick={() => setDetailOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        <FormDialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          title="Edit Inventory Details"
          icon={<Edit />}
          onSubmit={() => void submitEditDetails()}
          submitLabel={editSaving ? 'Saving…' : 'Save details'}
          submitDisabled={editSaving || !editDraft.reason.trim()}
        >
          <TextField
            label="Reorder Level"
            type="number"
            value={editDraft.reorderLevel}
            onChange={(e) => setEditDraft((d) => ({ ...d, reorderLevel: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Rack Location"
            value={editDraft.rackLocation}
            onChange={(e) => setEditDraft((d) => ({ ...d, rackLocation: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Bin Number"
            value={editDraft.binNumber}
            onChange={(e) => setEditDraft((d) => ({ ...d, binNumber: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Default Sell Price"
            type="number"
            value={editDraft.defaultSellPrice}
            onChange={(e) => setEditDraft((d) => ({ ...d, defaultSellPrice: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Reason"
            value={editDraft.reason}
            onChange={(e) => setEditDraft((d) => ({ ...d, reason: e.target.value }))}
            required
            fullWidth
          />
        </FormDialog>

        <FormDialog
          open={stockOpen}
          onClose={() => setStockOpen(false)}
          title="Add Stock"
          icon={<Inventory />}
          onSubmit={() => void submitStockAdjustment()}
          submitLabel={stockSaving ? 'Posting…' : 'Post receipt'}
          submitDisabled={stockSaving || !stockDraft.reason.trim() || Number(stockDraft.quantity) <= 0}
        >
          <TextField
            label="Quantity"
            type="number"
            value={stockDraft.quantity}
            onChange={(e) => setStockDraft((d) => ({ ...d, quantity: e.target.value }))}
            required
            fullWidth
          />
          <TextField
            label="Valuation Rate"
            type="number"
            value={stockDraft.valuationRate}
            onChange={(e) => setStockDraft((d) => ({ ...d, valuationRate: e.target.value }))}
            helperText="Leave blank to use the ERPNext item valuation rate."
            fullWidth
          />
          <TextField
            label="Posting Date"
            type="date"
            value={stockDraft.postingDate}
            onChange={(e) => setStockDraft((d) => ({ ...d, postingDate: e.target.value }))}
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
          />
          <TextField
            label="Reason"
            value={stockDraft.reason}
            onChange={(e) => setStockDraft((d) => ({ ...d, reason: e.target.value }))}
            required
            fullWidth
          />
        </FormDialog>
      </Stack>
    </Box>
  )
}
